'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { ExpenseCategory } from '@/data/entities/ExpenseCategory';
import { CostCenter } from '@/data/entities/CostCenter';
import { getCurrentSession } from './auth.server';
import { IsNull } from 'typeorm';

export interface OperatingExpenseListItem {
    id: string;
    documentNumber: string;
    total: number;
    taxAmount: number;
    subtotal: number;
    paymentMethod: PaymentMethod | null;
    createdAt: string;
    notes: string | null;
    expenseCategory?: {
        id: string;
        code: string;
        name: string;
    } | null;
    costCenter?: {
        id: string;
        code: string;
        name: string;
    } | null;
    recordedBy?: {
        id: string;
        userName: string;
    } | null;
}

export interface CreateOperatingExpenseInput {
    expenseCategoryId: string;
    costCenterId: string;
    amount: number;
    taxAmount?: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    externalReference?: string;
}

export interface OperatingExpenseResult {
    success: boolean;
    error?: string;
}

const OPERATING_EXPENSES_PATH = '/admin/operating-expenses';

export async function listOperatingExpenses(limit = 50): Promise<OperatingExpenseListItem[]> {
    const ds = await getDb();
    const transactionRepo = ds.getRepository(Transaction);

    const expenses = await transactionRepo.find({
        where: { transactionType: TransactionType.OPERATING_EXPENSE },
        take: Math.min(Math.max(limit, 1), 100),
        order: { createdAt: 'DESC' },
        relations: ['expenseCategory', 'costCenter', 'user'],
    });

    const serialize = (tx: Transaction): OperatingExpenseListItem => ({
        id: tx.id,
        documentNumber: tx.documentNumber,
        total: Number(tx.total ?? 0),
        subtotal: Number(tx.subtotal ?? 0),
        taxAmount: Number(tx.taxAmount ?? 0),
        paymentMethod: tx.paymentMethod ?? null,
        createdAt: tx.createdAt.toISOString(),
        notes: tx.notes ?? null,
        expenseCategory: tx.expenseCategory
            ? {
                id: tx.expenseCategory.id,
                code: tx.expenseCategory.code,
                name: tx.expenseCategory.name,
            }
            : null,
        costCenter: tx.costCenter
            ? {
                id: tx.costCenter.id,
                code: tx.costCenter.code,
                name: tx.costCenter.name,
            }
            : null,
        recordedBy: tx.user
            ? {
                id: tx.user.id,
                userName: tx.user.userName,
            }
            : null,
    });

    return expenses.map((tx) => serialize(tx));
}

export interface ExpenseCategoryOption {
    id: string;
    code: string;
    name: string;
}

export async function listOperatingExpenseCategories(): Promise<ExpenseCategoryOption[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ExpenseCategory);

    const categories = await repo.find({
        where: {
            deletedAt: IsNull(),
            isActive: true,
        },
        order: { name: 'ASC' },
    });

    return categories.map((category) => ({
        id: category.id,
        code: category.code,
        name: category.name,
    }));
}

export async function createOperatingExpense(input: CreateOperatingExpenseInput): Promise<OperatingExpenseResult> {
    const session = await getCurrentSession();
    if (!session) {
        return { success: false, error: 'Debes iniciar sesión para registrar gastos operativos.' };
    }

    const ds = await getDb();
    const queryRunner = ds.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const expenseCategoryRepo = queryRunner.manager.getRepository(ExpenseCategory);
        const costCenterRepo = queryRunner.manager.getRepository(CostCenter);
        const transactionRepo = queryRunner.manager.getRepository(Transaction);

        const category = await expenseCategoryRepo.findOne({
            where: { id: input.expenseCategoryId },
        });

        if (!category || category.deletedAt) {
            throw new Error('La categoría de gasto seleccionada no existe o está inactiva.');
        }

        const costCenter = await costCenterRepo.findOne({ where: { id: input.costCenterId } });
        if (!costCenter) {
            throw new Error('El centro de costos seleccionado no existe.');
        }

        const amount = Number(input.amount ?? 0);
        const taxAmount = Number(input.taxAmount ?? 0);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('El monto del gasto debe ser mayor a cero.');
        }

        if (!Number.isFinite(taxAmount) || taxAmount < 0) {
            throw new Error('El impuesto debe ser un valor positivo.');
        }

        if (taxAmount > amount) {
            throw new Error('El impuesto no puede exceder al monto total del gasto.');
        }

        const subtotal = Number((amount - taxAmount).toFixed(2));
        const totalTax = Number(taxAmount.toFixed(2));
        const total = Number(amount.toFixed(2));

        const lastExpense = await transactionRepo.findOne({
            where: { transactionType: TransactionType.OPERATING_EXPENSE },
            order: { createdAt: 'DESC' },
        });

        let documentNumber: string;
        const prefix = 'GOP-';
        if (!lastExpense?.documentNumber?.startsWith(prefix)) {
            documentNumber = `${prefix}00000001`;
        } else {
            const numeric = parseInt(lastExpense.documentNumber.replace(prefix, ''), 10) || 0;
            documentNumber = `${prefix}${String(numeric + 1).padStart(8, '0')}`;
        }

        const transaction = new Transaction();
        transaction.transactionType = TransactionType.OPERATING_EXPENSE;
        transaction.status = TransactionStatus.CONFIRMED;
        transaction.branchId = costCenter.branchId ?? undefined;
        transaction.pointOfSaleId = undefined;
        transaction.cashSessionId = undefined;
        transaction.storageId = undefined;
        transaction.targetStorageId = undefined;
        transaction.customerId = undefined;
        transaction.supplierId = undefined;
        transaction.userId = session.id;
        transaction.expenseCategoryId = category.id;
        transaction.costCenterId = costCenter.id;
        transaction.documentNumber = documentNumber;
        transaction.paymentMethod = input.paymentMethod ?? PaymentMethod.CASH;
        transaction.subtotal = subtotal;
        transaction.discountAmount = 0;
        transaction.taxAmount = totalTax;
        transaction.total = total;
        transaction.notes = input.notes?.trim() ? input.notes.trim() : undefined;
        transaction.externalReference = input.externalReference?.trim() ? input.externalReference.trim() : undefined;
        transaction.metadata = {
            source: 'operating-expense-ui',
            submittedBy: session.userName,
        };

        await transactionRepo.save(transaction);

        await queryRunner.commitTransaction();

        revalidatePath(OPERATING_EXPENSES_PATH);
        revalidatePath('/admin/accounting/ledger');

        return { success: true };
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error al crear gasto operativo:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error inesperado al registrar el gasto.',
        };
    } finally {
        await queryRunner.release();
    }
}
