'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Budget, BudgetCurrency, BudgetStatus } from '@/data/entities/Budget';
import { CostCenter } from '@/data/entities/CostCenter';
import { CostCenterType } from '@/data/entities/CostCenter';
import { getCompany } from './companies';
import { getCurrentSession } from './auth.server';

export interface BudgetSummary {
    id: string;
    companyId: string;
    costCenterId: string;
    costCenterCode: string;
    costCenterName: string;
    costCenterType: CostCenterType;
    branchId: string | null;
    branchName: string | null;
    periodStart: string;
    periodEnd: string;
    budgetedAmount: number;
    spentAmount: number;
    remainingAmount: number;
    currency: string;
    status: BudgetStatus;
    version: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

interface ListBudgetsParams {
    status?: BudgetStatus[];
    limit?: number;
    offset?: number;
}

interface UpdateBudgetStatusDTO {
    status: BudgetStatus;
}

interface BudgetResult {
    success: boolean;
    error?: string;
    budget?: BudgetSummary;
}

interface CreateBudgetDTO {
    costCenterId: string;
    periodStart: string;
    periodEnd: string;
    budgetedAmount: number;
    currency: BudgetCurrency;
}

const BUDGETS_PATH = '/admin/accounting/cost-centers/budgets';

const toInt = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) {
        return 0;
    }
    const numeric = typeof value === 'number' ? value : parseInt(value, 10);
    if (Number.isNaN(numeric)) {
        return 0;
    }
    return numeric;
};

const serializeBudget = (budget: Budget): BudgetSummary => ({
    id: budget.id,
    companyId: budget.companyId,
    costCenterId: budget.costCenterId,
    costCenterCode: budget.costCenter?.code ?? '',
    costCenterName: budget.costCenter?.name ?? '',
    costCenterType: budget.costCenter?.type ?? CostCenterType.OTHER,
    branchId: budget.costCenter?.branchId ?? null,
    branchName: budget.costCenter?.branch?.name ?? null,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
    budgetedAmount: toInt(budget.budgetedAmount),
    spentAmount: toInt(budget.spentAmount),
    remainingAmount: Math.max(0, toInt(budget.budgetedAmount) - toInt(budget.spentAmount)),
    currency: budget.currency,
    status: budget.status,
    version: budget.version,
    createdBy: budget.createdBy,
    createdAt: budget.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: budget.updatedAt?.toISOString?.() ?? new Date().toISOString(),
});

const normalizeDateOnly = (value: string): string | null => {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    const match = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(trimmed);
    if (!match) {
        return null;
    }

    const [year, month, day] = trimmed.split('-').map(Number);
    const constructed = new Date(Date.UTC(year, month - 1, day));
    if (constructed.getUTCFullYear() !== year || (constructed.getUTCMonth() + 1) !== month || constructed.getUTCDate() !== day) {
        return null;
    }

    return trimmed;
};

export async function listBudgets(params?: ListBudgetsParams): Promise<BudgetSummary[]> {
    const company = await getCompany();
    if (!company) {
        throw new Error('No hay compañía configurada.');
    }

    const ds = await getDb();
    const repo = ds.getRepository(Budget);

    const query = repo
        .createQueryBuilder('budget')
        .leftJoinAndSelect('budget.costCenter', 'costCenter')
        .leftJoinAndSelect('costCenter.branch', 'branch')
        .where('budget.companyId = :companyId', { companyId: company.id })
        .orderBy('budget.periodStart', 'DESC')
        .addOrderBy('budget.updatedAt', 'DESC');

    if (params?.status && params.status.length > 0) {
        query.andWhere('budget.status IN (:...status)', { status: params.status });
    }

    if (params?.offset !== undefined) {
        query.skip(params.offset);
    }

    if (params?.limit !== undefined) {
        query.take(params.limit);
    } else {
        query.take(100);
    }

    const budgets = await query.getMany();
    return budgets.map(serializeBudget);
}

export async function updateBudgetStatus(id: string, dto: UpdateBudgetStatusDTO): Promise<BudgetResult> {
    try {
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No hay compañía configurada.' };
        }

        const ds = await getDb();
        const repo = ds.getRepository(Budget);

        const budget = await repo.findOne({
            where: { id, companyId: company.id },
            relations: ['costCenter', 'costCenter.branch'],
        });

        if (!budget) {
            return { success: false, error: 'Presupuesto no encontrado.' };
        }

        budget.status = dto.status;
        const saved = await repo.save(budget);

        revalidatePath(BUDGETS_PATH);

        return { success: true, budget: serializeBudget(saved) };
    } catch (error) {
        console.error('[updateBudgetStatus] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar el presupuesto.',
        };
    }
}

export async function createBudget(data: CreateBudgetDTO): Promise<BudgetResult> {
    try {
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No hay compañía configurada.' };
        }

        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'Sesión no encontrada. Inicia sesión nuevamente.' };
        }

        const costCenterId = data.costCenterId?.trim();
        const normalizedStart = normalizeDateOnly(data.periodStart);
        const normalizedEnd = normalizeDateOnly(data.periodEnd);
        const amount = Math.trunc(Number(data.budgetedAmount ?? 0));
        const currency = data.currency ?? BudgetCurrency.CLP;

        if (!costCenterId) {
            return { success: false, error: 'Debes seleccionar un centro de costo.' };
        }

        if (!normalizedStart) {
            return { success: false, error: 'La fecha de inicio no es válida.' };
        }

        if (!normalizedEnd) {
            return { success: false, error: 'La fecha de término no es válida.' };
        }

        if (normalizedStart > normalizedEnd) {
            return { success: false, error: 'El período seleccionado es inválido. La fecha de inicio debe ser anterior o igual a la fecha de término.' };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return { success: false, error: 'El monto presupuestado debe ser mayor a cero.' };
        }

        if (!Object.values(BudgetCurrency).includes(currency)) {
            return { success: false, error: 'La moneda seleccionada no es válida.' };
        }

        const ds = await getDb();
        const budgetRepo = ds.getRepository(Budget);
        const costCenterRepo = ds.getRepository(CostCenter);

        const costCenter = await costCenterRepo.findOne({
            where: { id: costCenterId, companyId: company.id },
            relations: ['branch'],
        });

        if (!costCenter) {
            return { success: false, error: 'Centro de costo inválido.' };
        }

        const overlapping = await budgetRepo
            .createQueryBuilder('budget')
            .where('budget.companyId = :companyId', { companyId: company.id })
            .andWhere('budget.costCenterId = :costCenterId', { costCenterId })
            .andWhere('budget.status = :status', { status: BudgetStatus.ACTIVE })
            .andWhere('NOT (budget.periodEnd < :start OR budget.periodStart > :end)', {
                start: normalizedStart,
                end: normalizedEnd,
            })
            .getOne();

        if (overlapping) {
            return {
                success: false,
                error: 'Ya existe un presupuesto activo para este centro en el período seleccionado.',
            };
        }

        const latestBudget = await budgetRepo
            .createQueryBuilder('budget')
            .where('budget.companyId = :companyId', { companyId: company.id })
            .andWhere('budget.costCenterId = :costCenterId', { costCenterId })
            .orderBy('budget.version', 'DESC')
            .getOne();

        const budget = budgetRepo.create();
        budget.companyId = company.id;
        budget.costCenterId = costCenterId;
        budget.periodStart = normalizedStart;
        budget.periodEnd = normalizedEnd;
        budget.budgetedAmount = `${amount}`;
        budget.spentAmount = '0';
        budget.currency = currency;
        budget.status = BudgetStatus.ACTIVE;
        budget.version = (latestBudget?.version ?? 0) + 1;
        budget.createdBy = session.id;

        const saved = await budgetRepo.save(budget);
        const withRelations = await budgetRepo.findOne({
            where: { id: saved.id },
            relations: ['costCenter', 'costCenter.branch'],
        });

        revalidatePath(BUDGETS_PATH);

        const budgetWithRelations = withRelations ?? saved;
        return { success: true, budget: serializeBudget(budgetWithRelations) };
    } catch (error) {
        console.error('[createBudget] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear el presupuesto.',
        };
    }
}
