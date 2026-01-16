'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { ExpenseCategory } from '@/data/entities/ExpenseCategory';
import { CostCenter } from '@/data/entities/CostCenter';
import { Employee } from '@/data/entities/Employee';
import { User } from '@/data/entities/User';
import { getCurrentSession } from './auth.server';

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
    payroll?: {
        type: PayrollCategoryType;
        employeeId: string | null;
        employeeName: string | null;
        employmentType?: string | null;
        status?: string | null;
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
    employeeId?: string;
    payrollType?: PayrollCategoryType;
}

export interface OperatingExpenseResult {
    success: boolean;
    error?: string;
}

type PayrollCategoryType = 'salary' | 'advance';

const PAYROLL_CATEGORY_CODES: Record<PayrollCategoryType, string> = {
    salary: 'RRHH_SUELDOS',
    advance: 'RRHH_ADELANTO',
};

const OPERATING_EXPENSES_PATH = '/admin/operating-expenses';

const resolvePayrollType = (category: ExpenseCategory): PayrollCategoryType | null => {
    const normalizedCode = category.code?.toUpperCase?.() ?? '';
    if (normalizedCode === PAYROLL_CATEGORY_CODES.salary) {
        return 'salary';
    }
    if (normalizedCode === PAYROLL_CATEGORY_CODES.advance) {
        return 'advance';
    }

    type MetadataShape = {
        payroll?: { type?: string } | string | null;
        payrollType?: string;
    };

    const metadata = (category.metadata ?? {}) as MetadataShape;

    if (typeof metadata.payroll === 'string') {
        const value = metadata.payroll.toLowerCase();
        if (value === 'salary' || value === 'advance') {
            return value;
        }
    } else if (metadata.payroll && typeof metadata.payroll === 'object') {
        const maybeType = (metadata.payroll as { type?: string }).type;
        if (typeof maybeType === 'string') {
            const value = maybeType.toLowerCase();
            if (value === 'salary' || value === 'advance') {
                return value;
            }
        }
    }

    if (typeof metadata.payrollType === 'string') {
        const value = metadata.payrollType.toLowerCase();
        if (value === 'salary' || value === 'advance') {
            return value;
        }
    }

    return null;
};

const formatEmployeeName = (employee: Employee) => {
    const person = employee.person;
    if (person?.businessName) {
        return person.businessName;
    }
    const parts = [person?.firstName, person?.lastName].filter((part): part is string => Boolean(part));
    if (parts.length === 0) {
        return person?.firstName ?? 'Colaborador sin nombre';
    }
    return parts.join(' ');
};

export async function listOperatingExpenses(limit = 50): Promise<OperatingExpenseListItem[]> {
    const ds = await getDb();
    const transactionRepo = ds.getRepository(Transaction);

    const expenses = await transactionRepo.find({
        where: { transactionType: TransactionType.OPERATING_EXPENSE },
        take: Math.min(Math.max(limit, 1), 100),
        order: { createdAt: 'DESC' },
        relations: ['expenseCategory', 'costCenter', 'user'],
    });

    const serialize = (tx: Transaction): OperatingExpenseListItem => {
        const metadata = (tx.metadata ?? {}) as Record<string, unknown>;
        const rawPayroll = metadata?.payroll as Record<string, unknown> | undefined;

        let payroll: OperatingExpenseListItem['payroll'] = null;
        if (rawPayroll && typeof rawPayroll === 'object') {
            const rawType = rawPayroll['type'];
            if (rawType === 'salary' || rawType === 'advance') {
                payroll = {
                    type: rawType,
                    employeeId: typeof rawPayroll['employeeId'] === 'string' ? rawPayroll['employeeId'] : null,
                    employeeName: typeof rawPayroll['employeeName'] === 'string' ? rawPayroll['employeeName'] : null,
                    employmentType: typeof rawPayroll['employmentType'] === 'string' ? rawPayroll['employmentType'] : null,
                    status: typeof rawPayroll['status'] === 'string' ? rawPayroll['status'] : null,
                };
            }
        }

        return {
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
            payroll,
        };
    };

    return expenses.map((tx) => serialize(tx));
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
        const employeeRepo = queryRunner.manager.getRepository(Employee);
        const transactionRepo = queryRunner.manager.getRepository(Transaction);
        const userRepo = queryRunner.manager.getRepository(User);

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

        const categoryPayrollType = resolvePayrollType(category);
        const requestedPayrollType = input.payrollType ?? null;

        if (categoryPayrollType && requestedPayrollType && categoryPayrollType !== requestedPayrollType) {
            throw new Error('El tipo de pago seleccionado no coincide con la configuración de la categoría.');
        }

        const payrollType = categoryPayrollType ?? requestedPayrollType;

        if (payrollType && !input.employeeId) {
            throw new Error('Debes seleccionar el colaborador asociado a este gasto.');
        }

        if (!categoryPayrollType && payrollType) {
            throw new Error('La categoría seleccionada no admite información de colaboradores.');
        }

        if (input.employeeId && !payrollType) {
            throw new Error('El colaborador solo se puede asociar a categorías de remuneraciones o adelantos.');
        }

        let employee: Employee | null = null;
        if (payrollType && input.employeeId) {
            employee = await employeeRepo.findOne({
                where: { id: input.employeeId },
                relations: ['person', 'costCenter'],
            });

            if (!employee) {
                throw new Error('El colaborador seleccionado no existe.');
            }

            if (category.companyId && employee.companyId !== category.companyId) {
                throw new Error('El colaborador pertenece a otra compañía.');
            }
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

        let recordedByUser = await userRepo.findOne({ where: { id: session.id } });

        if (!recordedByUser && session.userName) {
            recordedByUser = await userRepo.findOne({ where: { userName: session.userName } });
        }

        if (!recordedByUser && session.email) {
            recordedByUser = await userRepo.findOne({ where: { mail: session.email } });
        }

        if (!recordedByUser) {
            throw new Error(
                'No pudimos encontrar la cuenta del usuario autenticado en la base de datos. Verifica que el usuario exista en el módulo de administración.',
            );
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
        transaction.userId = recordedByUser.id;
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

        const metadata: Record<string, unknown> = {
            source: 'operating-expense-ui',
            submittedBy: recordedByUser.userName ?? session.userName,
        };

        if (employee && payrollType) {
            const baseSalary = employee.baseSalary != null ? Number(employee.baseSalary) : null;
            metadata.payroll = {
                type: payrollType,
                employeeId: employee.id,
                employeeName: formatEmployeeName(employee),
                employmentType: employee.employmentType,
                status: employee.status,
                baseSalary,
                documentNumber: employee.person?.documentNumber ?? null,
                costCenter: employee.costCenter
                    ? {
                          id: employee.costCenter.id,
                          code: employee.costCenter.code,
                          name: employee.costCenter.name,
                      }
                    : null,
                recordedAt: new Date().toISOString(),
            } satisfies Record<string, unknown>;
        }

        transaction.metadata = metadata;

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
