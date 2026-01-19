'use server'

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { getCompany } from './companies';
import { getCurrentSession } from './auth.server';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { Company } from '@/data/entities/Company';
import { ensureAccountingPeriodForCompany } from './accounting';

interface CreateBankToCashTransferInput {
    bankAccountKey: string;
    amount: number;
    occurredOn?: string;
    notes?: string | null;
}

interface CreateBankToCashTransferSuccess {
    success: true;
    transactionId: string;
    documentNumber: string;
}

interface CreateBankToCashTransferFailure {
    success: false;
    error: string;
}

export type CreateBankToCashTransferResult =
    | CreateBankToCashTransferSuccess
    | CreateBankToCashTransferFailure;

const DOCUMENT_PREFIX = 'BTC-';
const BANKING_PATH = '/admin/accounting/banking';
const COMPANY_SETTINGS_PATH = '/admin/settings/company';
const ACCOUNTING_LEDGER_PATH = '/admin/accounting/ledger';

const sanitizeAmount = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        throw new Error('El monto a transferir debe ser mayor a cero.');
    }
    return Number(numeric.toFixed(2));
};

const parseOccurredOn = (value?: string): Date => {
    if (!value) {
        return new Date();
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('La fecha seleccionada para la transferencia no es válida.');
    }
    return parsed;
};

export async function createBankToCashTransfer(input: CreateBankToCashTransferInput): Promise<CreateBankToCashTransferResult> {
    const session = await getCurrentSession();
    if (!session) {
        return { success: false, error: 'Debes iniciar sesión para registrar transferencias.' };
    }

    let amount: number;
    try {
        amount = sanitizeAmount(input.amount);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Monto inválido para la transferencia.',
        };
    }

    let occurredOn: Date;
    try {
        occurredOn = parseOccurredOn(input.occurredOn);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fecha inválida para la transferencia.',
        };
    }

    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No se encontró la compañía configurada. Configura la empresa antes de registrar transferencias.' };
    }

    await ensureAccountingPeriodForCompany(company.id, occurredOn);

    if (!input.bankAccountKey) {
        return { success: false, error: 'Selecciona la cuenta bancaria de origen.' };
    }

    const companyAccounts = Array.isArray(company.bankAccounts) ? company.bankAccounts : [];
    const sourceAccount = companyAccounts.find((account) => account.accountKey === input.bankAccountKey);

    if (!sourceAccount) {
        return { success: false, error: 'La cuenta bancaria seleccionada no existe o no está asociada a la empresa.' };
    }

    const currentBalance = Number(sourceAccount.currentBalance ?? 0);
    if (Number.isFinite(currentBalance) && currentBalance > 0 && amount > currentBalance) {
        return { success: false, error: 'El monto excede el saldo estimado disponible en la cuenta bancaria seleccionada.' };
    }

    const openingBalanceRaw = Number(sourceAccount.currentBalance ?? 0);
    const balanceBefore = Number.isFinite(openingBalanceRaw) ? Number(openingBalanceRaw.toFixed(2)) : 0;
    const balanceAfter = Number((balanceBefore - amount).toFixed(2));

    const dataSource = await getDb();
    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const transactionRepo = queryRunner.manager.getRepository(Transaction);
        const companyRepo = queryRunner.manager.getRepository(Company);

        const lastTransfer = await transactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.documentNumber LIKE :prefix', { prefix: `${DOCUMENT_PREFIX}%` })
            .orderBy('transaction.createdAt', 'DESC')
            .getOne();

        const documentNumber = (() => {
            if (!lastTransfer?.documentNumber?.startsWith(DOCUMENT_PREFIX)) {
                return `${DOCUMENT_PREFIX}000001`;
            }
            const numericPart = parseInt(lastTransfer.documentNumber.replace(DOCUMENT_PREFIX, ''), 10) || 0;
            return `${DOCUMENT_PREFIX}${String(numericPart + 1).padStart(6, '0')}`;
        })();

        const normalizedNotes = input.notes?.trim().length ? input.notes.trim() : undefined;
        const sourceAccountLabelParts: string[] = [];
        if (sourceAccount.bankName) sourceAccountLabelParts.push(String(sourceAccount.bankName));
        if (sourceAccount.accountType) sourceAccountLabelParts.push(String(sourceAccount.accountType));
        if (sourceAccount.accountNumber) sourceAccountLabelParts.push(sourceAccount.accountNumber);
        const sourceAccountLabel = sourceAccountLabelParts.join(' · ') || sourceAccount.accountNumber || sourceAccount.accountKey || 'Cuenta bancaria';

        const metadata: Record<string, any> = {
            source: 'bank-to-cash-transfer-ui',
            occurredOn: occurredOn.toISOString(),
            bankMovement: {
                kind: 'BANK_TO_CASH_TRANSFER',
                bankAccountKey: sourceAccount.accountKey,
                bankAccountNumber: sourceAccount.accountNumber,
                bankName: sourceAccount.bankName,
                accountType: sourceAccount.accountType,
                originAccountCode: '1.1.02',
                createdByUserId: session.id,
                balanceBefore,
                balanceAfter,
            },
            transfer: {
                originAccountKey: sourceAccount.accountKey,
                originAccountLabel: sourceAccountLabel,
                originAccountCode: '1.1.02',
                destinationAccountCode: '1.1.01',
                destinationAccountName: 'Caja General',
                amount,
                occurredOn: occurredOn.toISOString(),
                notes: normalizedNotes,
                balanceBefore,
                balanceAfter,
            },
        };

        const transactionRecord = transactionRepo.create({
            documentNumber,
            transactionType: TransactionType.PAYMENT_OUT,
            status: TransactionStatus.CONFIRMED,
            userId: session.id,
            paymentMethod: PaymentMethod.TRANSFER,
            bankAccountKey: sourceAccount.accountKey,
            expenseCategoryId: null,
            subtotal: amount,
            discountAmount: 0,
            taxAmount: 0,
            total: amount,
            amountPaid: amount,
            changeAmount: 0,
            notes: normalizedNotes ?? `Transferencia desde banco a Caja General (${sourceAccountLabel})`,
            metadata,
        });

        await transactionRepo.save(transactionRecord);

        const updatedAccounts = companyAccounts.map((account) => {
            if (account.accountKey !== sourceAccount.accountKey) {
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
        console.error('[createBankToCashTransfer] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'No se pudo registrar la transferencia a caja.',
        };
    } finally {
        await queryRunner.release();
    }
}
