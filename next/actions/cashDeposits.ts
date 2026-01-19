'use server'

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { getCompany } from './companies';
import { getCurrentSession } from './auth.server';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { Company } from '@/data/entities/Company';

interface CreateCashDepositInput {
    bankAccountKey: string;
    amount: number;
    occurredOn?: string;
    notes?: string | null;
}

interface CreateCashDepositSuccess {
    success: true;
    transactionId: string;
    documentNumber: string;
}

interface CreateCashDepositFailure {
    success: false;
    error: string;
}

export type CreateCashDepositResult = CreateCashDepositSuccess | CreateCashDepositFailure;

const DOCUMENT_PREFIX = 'CBD-';
const BANKING_PATH = '/admin/accounting/banking';
const COMPANY_SETTINGS_PATH = '/admin/settings/company';
const ACCOUNTING_LEDGER_PATH = '/admin/accounting/ledger';

const sanitizeAmount = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        throw new Error('El monto del depósito debe ser mayor a cero.');
    }
    return Number(numeric.toFixed(2));
};

const parseOccurredOn = (value?: string): Date => {
    if (!value) {
        return new Date();
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('La fecha seleccionada para el depósito no es válida.');
    }
    return parsed;
};

export async function createCashDeposit(input: CreateCashDepositInput): Promise<CreateCashDepositResult> {
    const session = await getCurrentSession();
    if (!session) {
        return { success: false, error: 'Debes iniciar sesión para registrar depósitos.' };
    }

    let amount: number;
    try {
        amount = sanitizeAmount(input.amount);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Monto inválido para el depósito.',
        };
    }

    let occurredOn: Date;
    try {
        occurredOn = parseOccurredOn(input.occurredOn);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fecha inválida para el depósito.',
        };
    }

    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No se encontró la compañía configurada. Configura la empresa antes de registrar depósitos.' };
    }

    if (!input.bankAccountKey) {
        return { success: false, error: 'Selecciona la cuenta bancaria destino.' };
    }

    const companyAccounts = Array.isArray(company.bankAccounts) ? company.bankAccounts : [];
    const destinationAccount = companyAccounts.find((account) => account.accountKey === input.bankAccountKey);

    if (!destinationAccount) {
        return { success: false, error: 'La cuenta bancaria seleccionada no existe o no está asociada a la empresa.' };
    }

    const openingBalanceRaw = Number(destinationAccount.currentBalance ?? 0);
    const balanceBefore = Number.isFinite(openingBalanceRaw) ? Number(openingBalanceRaw.toFixed(2)) : 0;
    const balanceAfter = Number((balanceBefore + amount).toFixed(2));

    const dataSource = await getDb();
    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const transactionRepo = queryRunner.manager.getRepository(Transaction);
        const companyRepo = queryRunner.manager.getRepository(Company);

        const lastDeposit = await transactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.documentNumber LIKE :prefix', { prefix: `${DOCUMENT_PREFIX}%` })
            .orderBy('transaction.createdAt', 'DESC')
            .getOne();

        const documentNumber = (() => {
            if (!lastDeposit?.documentNumber?.startsWith(DOCUMENT_PREFIX)) {
                return `${DOCUMENT_PREFIX}000001`;
            }
            const numericPart = parseInt(lastDeposit.documentNumber.replace(DOCUMENT_PREFIX, ''), 10) || 0;
            return `${DOCUMENT_PREFIX}${String(numericPart + 1).padStart(6, '0')}`;
        })();

        const normalizedNotes = input.notes?.trim().length ? input.notes.trim() : undefined;
        const accountLabelParts: string[] = [];
        if (destinationAccount.bankName) accountLabelParts.push(String(destinationAccount.bankName));
        if (destinationAccount.accountType) accountLabelParts.push(String(destinationAccount.accountType));
        if (destinationAccount.accountNumber) accountLabelParts.push(destinationAccount.accountNumber);
        const accountLabel = accountLabelParts.join(' · ') || destinationAccount.accountNumber || destinationAccount.accountKey || 'Cuenta bancaria';

        const metadata: Record<string, any> = {
            source: 'cash-deposit-ui',
            occurredOn: occurredOn.toISOString(),
            bankMovement: {
                kind: 'CASH_DEPOSIT',
                bankAccountKey: destinationAccount.accountKey,
                bankAccountNumber: destinationAccount.accountNumber,
                bankName: destinationAccount.bankName,
                accountType: destinationAccount.accountType,
                createdByUserId: session.id,
                balanceBefore,
                balanceAfter,
            },
            cashDeposit: {
                destinationAccountKey: destinationAccount.accountKey,
                destinationAccountLabel: accountLabel,
                originAccountCode: '1.1.01',
                originAccountName: 'Caja General',
                amount,
                occurredOn: occurredOn.toISOString(),
                notes: normalizedNotes,
                balanceBefore,
                balanceAfter,
            },
        };

        const transactionRecord = transactionRepo.create({
            documentNumber,
            transactionType: TransactionType.CASH_DEPOSIT,
            status: TransactionStatus.CONFIRMED,
            userId: session.id,
            paymentMethod: PaymentMethod.CASH,
            bankAccountKey: destinationAccount.accountKey,
            subtotal: amount,
            discountAmount: 0,
            taxAmount: 0,
            total: amount,
            amountPaid: amount,
            changeAmount: 0,
            notes: normalizedNotes ?? `Depósito en banco desde Caja General (${accountLabel})`,
            metadata,
        });

        await transactionRepo.save(transactionRecord);

        const updatedAccounts = companyAccounts.map((account) => {
            if (account.accountKey !== destinationAccount.accountKey) {
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
        console.error('[createCashDeposit] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'No se pudo registrar el depósito en banco.',
        };
    } finally {
        await queryRunner.release();
    }
}
