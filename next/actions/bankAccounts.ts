'use server'

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { buildLedger } from '@/data/services/AccountingEngine';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { getCompany } from './companies';
import { getCurrentSession } from './auth.server';
import { ensureAccountingPeriodForCompany } from './accounting';

const CASH_ACCOUNT_CODE = '1.1.01';

const COMPANY_SETTINGS_PATH = '/admin/settings/company';
const ACCOUNTING_LEDGER_PATH = '/admin/accounting/ledger';

export interface CashBalanceResult {
    balance: number;
}

export async function getCashBalance(): Promise<CashBalanceResult> {
    const company = await getCompany();
    if (!company) {
        return { balance: 0 };
    }

    const ds = await getDb();
    const ledger = await buildLedger(ds, { companyId: company.id });

    const cashAccount = ledger.accounts.find((account) => account.code === CASH_ACCOUNT_CODE);
    if (!cashAccount) {
        return { balance: 0 };
    }

    const rawBalance = ledger.balanceByAccount[cashAccount.id] ?? 0;
    const balance = Number(rawBalance);
    return { balance: Number.isFinite(balance) ? balance : 0 };
}

export interface RegisterCashDepositInput {
    bankAccountKey: string;
    amount: number;
    note?: string;
}

export interface RegisterCashDepositResult {
    success: boolean;
    error?: string;
    transactionId?: string;
    documentNumber?: string;
}

export async function registerCashDeposit(input: RegisterCashDepositInput): Promise<RegisterCashDepositResult> {
    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No se encontró la compañía configurada.' };
    }

    const session = await getCurrentSession();
    if (!session) {
        return { success: false, error: 'Debes iniciar sesión para registrar depósitos.' };
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'El monto del depósito debe ser mayor a cero.' };
    }

    if (!input.bankAccountKey) {
        return { success: false, error: 'Selecciona la cuenta bancaria de destino.' };
    }

    const companyAccounts = Array.isArray(company.bankAccounts) ? company.bankAccounts : [];
    const targetAccount = companyAccounts.find((account) => account.accountKey === input.bankAccountKey);

    if (!targetAccount) {
        return { success: false, error: 'La cuenta bancaria seleccionada no existe.' };
    }

    const { balance: cashBalance } = await getCashBalance();
    if (amount > cashBalance) {
        return { success: false, error: 'El monto excede el saldo disponible en Caja General.' };
    }

    await ensureAccountingPeriodForCompany(company.id, new Date());

    const ds = await getDb();
    const queryRunner = ds.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const transactionRepo = queryRunner.manager.getRepository(Transaction);

        const lastDeposit = await transactionRepo.findOne({
            where: { transactionType: TransactionType.CASH_DEPOSIT },
            order: { createdAt: 'DESC' },
        });

        const prefix = 'DEP-';
        let documentNumber: string;
        if (!lastDeposit?.documentNumber?.startsWith(prefix)) {
            documentNumber = `${prefix}00000001`;
        } else {
            const numeric = parseInt(lastDeposit.documentNumber.replace(prefix, ''), 10) || 0;
            documentNumber = `${prefix}${String(numeric + 1).padStart(8, '0')}`;
        }

        const transaction = new Transaction();
        transaction.transactionType = TransactionType.CASH_DEPOSIT;
        transaction.status = TransactionStatus.CONFIRMED;
        transaction.userId = session.id;
        transaction.documentNumber = documentNumber;
        transaction.paymentMethod = PaymentMethod.TRANSFER;
        transaction.bankAccountKey = input.bankAccountKey;
        transaction.subtotal = amount;
        transaction.discountAmount = 0;
        transaction.taxAmount = 0;
        transaction.total = amount;
        transaction.notes = input.note?.trim() ? input.note.trim() : undefined;
        transaction.externalReference = undefined;
        transaction.metadata = {
            source: 'cash-deposit-ui',
            registeredBy: session.userName ?? session.name ?? session.email ?? session.id,
            bankAccount: {
                key: targetAccount.accountKey,
                bankName: targetAccount.bankName,
                accountType: targetAccount.accountType,
                accountNumber: targetAccount.accountNumber,
            },
        } satisfies Record<string, unknown>;

        await transactionRepo.save(transaction);

        await queryRunner.commitTransaction();

        revalidatePath(COMPANY_SETTINGS_PATH);
        revalidatePath(ACCOUNTING_LEDGER_PATH);

        return {
            success: true,
            transactionId: transaction.id,
            documentNumber: transaction.documentNumber,
        };
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('[registerCashDeposit] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'No se pudo registrar el depósito.',
        };
    } finally {
        await queryRunner.release();
    }
}
