'use server'

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { getCompany } from './companies';
import { getCurrentSession } from './auth.server';
import { Shareholder } from '@/data/entities/Shareholder';
import { Company } from '@/data/entities/Company';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import type { Repository } from 'typeorm';
import { ensureAccountingPeriodForCompany } from './accounting';

interface CreateCapitalContributionInput {
    shareholderId: string;
    bankAccountKey: string;
    amount: number;
    occurredOn?: string; // ISO date string provided by UI
    notes?: string | null;
}

interface CreateCapitalContributionSuccess {
    success: true;
    transactionId: string;
    documentNumber: string;
}

interface CreateCapitalContributionFailure {
    success: false;
    error: string;
}

export type CreateCapitalContributionResult =
    | CreateCapitalContributionSuccess
    | CreateCapitalContributionFailure;

const DOCUMENT_PREFIX = 'CAP-';
const BANKING_PATH = '/admin/accounting/banking';
const COMPANY_SETTINGS_PATH = '/admin/settings/company';
const ACCOUNTING_LEDGER_PATH = '/admin/accounting/ledger';

const sanitizeAmount = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        throw new Error('El monto del aporte debe ser mayor a cero.');
    }
    return Number(numeric.toFixed(2));
};

const parseOccurredOn = (value?: string): Date => {
    if (!value) {
        return new Date();
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('La fecha seleccionada para el aporte no es válida.');
    }
    return parsed;
};

const buildShareholderDisplayName = (shareholder: Shareholder): string => {
    const person = shareholder.person;
    if (!person) {
        return 'Socio sin identificación';
    }
    if (person.businessName && person.businessName.trim().length > 0) {
        return person.businessName.trim();
    }
    const first = person.firstName?.trim() ?? '';
    const last = person.lastName?.trim() ?? '';
    const combined = `${first} ${last}`.trim();
    return combined.length > 0 ? combined : 'Socio sin identificación';
};

const computeNextDocumentNumber = async (transactionRepo: Repository<Transaction>): Promise<string> => {
    const lastContribution = await transactionRepo
        .createQueryBuilder('transaction')
        .where('transaction.documentNumber LIKE :prefix', { prefix: `${DOCUMENT_PREFIX}%` })
        .orderBy('transaction.createdAt', 'DESC')
        .getOne();

    if (!lastContribution?.documentNumber?.startsWith(DOCUMENT_PREFIX)) {
        return `${DOCUMENT_PREFIX}000001`;
    }

    const numericPart = parseInt(lastContribution.documentNumber.replace(DOCUMENT_PREFIX, ''), 10) || 0;
    return `${DOCUMENT_PREFIX}${String(numericPart + 1).padStart(6, '0')}`;
};

export async function createCapitalContribution(input: CreateCapitalContributionInput): Promise<CreateCapitalContributionResult> {
    const session = await getCurrentSession();
    if (!session) {
        return { success: false, error: 'Debes iniciar sesión para registrar un aporte de capital.' };
    }

    let amount: number;
    try {
        amount = sanitizeAmount(input.amount);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Monto inválido para el aporte.',
        };
    }

    let occurredOn: Date;
    try {
        occurredOn = parseOccurredOn(input.occurredOn);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fecha inválida para el aporte.',
        };
    }

    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No se encontró la compañía configurada. Configura la empresa antes de registrar aportes.' };
    }

    await ensureAccountingPeriodForCompany(company.id, occurredOn);

    if (!input.bankAccountKey) {
        return { success: false, error: 'Selecciona la cuenta bancaria que recibirá el aporte.' };
    }

    const companyAccounts = Array.isArray(company.bankAccounts) ? company.bankAccounts : [];
    const targetAccount = companyAccounts.find((account) => account.accountKey === input.bankAccountKey);

    if (!targetAccount) {
        return { success: false, error: 'La cuenta bancaria seleccionada no existe o no está asociada a la empresa.' };
    }

    const ds = await getDb();
    const shareholderRepo = ds.getRepository(Shareholder);
    const shareholder = await shareholderRepo.findOne({
        where: { id: input.shareholderId, companyId: company.id },
        relations: { person: true },
    });

    if (!shareholder) {
        return { success: false, error: 'El socio seleccionado no existe o no pertenece a la empresa.' };
    }

    const shareholderName = buildShareholderDisplayName(shareholder);

    const openingBalanceRaw = Number(targetAccount.currentBalance ?? 0);
    const balanceBefore = Number.isFinite(openingBalanceRaw) ? Number(openingBalanceRaw.toFixed(2)) : 0;
    const balanceAfter = Number((balanceBefore + amount).toFixed(2));

    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const transactionRepo = queryRunner.manager.getRepository(Transaction);
        const companyRepo = queryRunner.manager.getRepository(Company);

        const documentNumber = await computeNextDocumentNumber(transactionRepo);
        const normalizedNotes = input.notes?.trim().length ? input.notes.trim() : undefined;

        const metadata: Record<string, any> = {
            source: 'capital-contribution-ui',
            occurredOn: occurredOn.toISOString(),
            bankMovement: {
                kind: 'CAPITAL_CONTRIBUTION',
                shareholderId: shareholder.id,
                shareholderName,
                bankAccountKey: targetAccount.accountKey,
                bankAccountNumber: targetAccount.accountNumber,
                createdByUserId: session.id,
                balanceBefore,
                balanceAfter,
            },
            capitalContribution: {
                shareholderId: shareholder.id,
                shareholderName,
                amount,
                occurredOn: occurredOn.toISOString(),
                bankAccountKey: targetAccount.accountKey,
                notes: normalizedNotes,
                balanceBefore,
                balanceAfter,
            },
        };

        const transactionRecord = transactionRepo.create({
            documentNumber,
            transactionType: TransactionType.PAYMENT_IN,
            status: TransactionStatus.CONFIRMED,
            shareholderId: shareholder.id,
            userId: session.id,
            paymentMethod: PaymentMethod.TRANSFER,
            bankAccountKey: targetAccount.accountKey,
            subtotal: amount,
            discountAmount: 0,
            taxAmount: 0,
            total: amount,
            amountPaid: amount,
            changeAmount: 0,
            notes: normalizedNotes ?? `Aporte de capital de ${shareholderName}`,
            metadata,
        });

        await transactionRepo.save(transactionRecord);

        // Actualizar saldo estimado en la cuenta bancaria de la empresa para reportes
        const updatedAccounts = companyAccounts.map((account) => {
            if (account.accountKey !== targetAccount.accountKey) {
                return account;
            }
            return {
                ...account,
                currentBalance: balanceAfter,
            };
        });

        await companyRepo.update(company.id, { bankAccounts: updatedAccounts });

        await queryRunner.commitTransaction();

        revalidatePath(BANKING_PATH);
        revalidatePath(COMPANY_SETTINGS_PATH);
        revalidatePath(ACCOUNTING_LEDGER_PATH);

        return {
            success: true,
            transactionId: transactionRecord.id,
            documentNumber: transactionRecord.documentNumber,
        };
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('[createCapitalContribution] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'No se pudo registrar el aporte de capital.',
        };
    } finally {
        await queryRunner.release();
    }
}
