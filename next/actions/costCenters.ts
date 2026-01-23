'use server';

import { revalidatePath } from 'next/cache';
import type { Repository } from 'typeorm';
import { getDb } from '@/data/db';
import { CostCenter, CostCenterType } from '@/data/entities/CostCenter';
import { getCompany } from './companies';

export interface CostCenterSummary {
    id: string;
    companyId: string;
    parentId: string | null;
    branchId: string | null;
    code: string;
    name: string;
    description: string | null;
    type: CostCenterType;
    isActive: boolean;
    parent?: { id: string; name: string; code: string } | null;
    branch?: { id: string; name: string | null } | null;
    createdAt: string;
    updatedAt: string;
}

interface ListCostCentersParams {
    includeInactive?: boolean;
}

interface CreateCostCenterDTO {
    name: string;
    description?: string | null;
    type: CostCenterType;
    branchId?: string | null;
    parentId?: string | null;
    isActive?: boolean;
}

interface UpdateCostCenterDTO extends CreateCostCenterDTO {
    code: string;
}

interface CostCenterResult {
    success: boolean;
    error?: string;
    costCenter?: CostCenterSummary;
}

const COST_CENTER_SETTINGS_PATH = '/admin/accounting/cost-centers';
const COST_CENTER_BUDGETS_PATH = '/admin/accounting/cost-centers/budgets';

const serializeCostCenter = (center: CostCenter): CostCenterSummary => ({
    id: center.id,
    companyId: center.companyId,
    parentId: center.parentId ?? null,
    branchId: center.branchId ?? null,
    code: center.code,
    name: center.name,
    description: center.description ?? null,
    type: center.type,
    isActive: center.isActive,
    parent: center.parent
        ? { id: center.parent.id, name: center.parent.name, code: center.parent.code }
        : null,
    branch: center.branch
        ? { id: center.branch.id, name: center.branch.name }
        : null,
    createdAt: center.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: center.updatedAt?.toISOString?.() ?? new Date().toISOString(),
});

const revalidateCostCenterViews = () => {
    revalidatePath(COST_CENTER_SETTINGS_PATH);
    revalidatePath(COST_CENTER_BUDGETS_PATH);
};

const COST_CENTER_CODE_PREFIX = 'CC';
const COST_CENTER_CODE_PADDING = 4;

const normalizeOptionalString = (value?: string | null): string | undefined => {
    if (value == null) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const generateCostCenterCode = async (
    repo: Repository<CostCenter>,
    companyId: string,
): Promise<string> => {
    const existingEntries = await repo.find({
        where: { companyId },
        select: ['code'],
    });

    const existingCodes = existingEntries
        .map((entry) => entry.code?.trim())
        .filter((code): code is string => Boolean(code));

    const codeSet = new Set(existingCodes.map((code) => code.toUpperCase()));
    const pattern = new RegExp(`^${COST_CENTER_CODE_PREFIX}-(\\d+)$`, 'i');

    let maxSequence = 0;
    for (const code of existingCodes) {
        const match = pattern.exec(code);
        if (match) {
            const numericValue = Number.parseInt(match[1], 10);
            if (!Number.isNaN(numericValue) && numericValue > maxSequence) {
                maxSequence = numericValue;
            }
        }
    }

    let nextSequence = maxSequence + 1;
    while (true) {
        const candidate = `${COST_CENTER_CODE_PREFIX}-${String(nextSequence).padStart(
            COST_CENTER_CODE_PADDING,
            '0',
        )}`;
        if (!codeSet.has(candidate.toUpperCase())) {
            return candidate;
        }
        nextSequence += 1;
    }
};

export async function listCostCenters(params?: ListCostCentersParams): Promise<CostCenterSummary[]> {
    const company = await getCompany();
    if (!company) {
        throw new Error('No hay compañía configurada.');
    }

    const ds = await getDb();
    const repo = ds.getRepository(CostCenter);

    const query = repo
        .createQueryBuilder('costCenter')
        .leftJoinAndSelect('costCenter.parent', 'parent')
        .leftJoinAndSelect('costCenter.branch', 'branch')
        .where('costCenter.companyId = :companyId', { companyId: company.id })
        .orderBy('costCenter.code', 'ASC');

    if (!params?.includeInactive) {
        query.andWhere('costCenter.isActive = true');
    }

    const result = await query.getMany();
    return result.map(serializeCostCenter);
}

export async function createCostCenter(data: CreateCostCenterDTO): Promise<CostCenterResult> {
    try {
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No hay compañía configurada.' };
        }

        const ds = await getDb();
        const repo = ds.getRepository(CostCenter);

        const trimmedName = data.name.trim();

        if (!trimmedName) {
            return { success: false, error: 'El nombre es obligatorio.' };
        }

        const generatedCode = await generateCostCenterCode(repo, company.id);

        const costCenter = repo.create();
        costCenter.companyId = company.id;
        costCenter.code = generatedCode;
        costCenter.name = trimmedName;
        costCenter.description = normalizeOptionalString(data.description) ?? undefined;
        costCenter.type = data.type;
        costCenter.branchId = data.branchId || null;
        costCenter.parentId = data.parentId || null;
        costCenter.isActive = data.isActive ?? true;

        const saved = await repo.save(costCenter);
        const withRelations = await repo.findOne({
            where: { id: saved.id },
            relations: ['parent', 'branch'],
        });

        revalidateCostCenterViews();

        const entity = (withRelations ?? saved) as CostCenter;
        return { success: true, costCenter: serializeCostCenter(entity) };
    } catch (error) {
        console.error('[createCostCenter] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear el centro de costo.',
        };
    }
}

export async function updateCostCenter(id: string, data: UpdateCostCenterDTO): Promise<CostCenterResult> {
    try {
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No hay compañía configurada.' };
        }

        const ds = await getDb();
        const repo = ds.getRepository(CostCenter);

        const existing = await repo.findOne({ where: { id, companyId: company.id } });
        if (!existing) {
            return { success: false, error: 'Centro de costo no encontrado.' };
        }

        const trimmedCode = data.code.trim().toUpperCase();
        const trimmedName = data.name.trim();

        if (!trimmedCode) {
            return { success: false, error: 'El código es obligatorio.' };
        }

        if (!trimmedName) {
            return { success: false, error: 'El nombre es obligatorio.' };
        }

        const duplicated = await repo.findOne({ where: { companyId: company.id, code: trimmedCode } });
        if (duplicated && duplicated.id !== id) {
            return { success: false, error: 'Ya existe otro centro de costo con ese código.' };
        }

        existing.code = trimmedCode;
        existing.name = trimmedName;
        existing.description = normalizeOptionalString(data.description) ?? undefined;
        existing.type = data.type;
        existing.branchId = data.branchId || null;
        existing.parentId = data.parentId || null;
        existing.isActive = data.isActive ?? existing.isActive;

        const saved = await repo.save(existing);
        const withRelations = await repo.findOne({
            where: { id: saved.id },
            relations: ['parent', 'branch'],
        });

        revalidateCostCenterViews();

        const entity = (withRelations ?? saved) as CostCenter;
        return { success: true, costCenter: serializeCostCenter(entity) };
    } catch (error) {
        console.error('[updateCostCenter] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar el centro de costo.',
        };
    }
}

export async function setCostCenterStatus(id: string, isActive: boolean): Promise<CostCenterResult> {
    try {
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No hay compañía configurada.' };
        }

        const ds = await getDb();
        const repo = ds.getRepository(CostCenter);

        const existing = await repo.findOne({ where: { id, companyId: company.id } });
        if (!existing) {
            return { success: false, error: 'Centro de costo no encontrado.' };
        }

        existing.isActive = isActive;
        const saved = await repo.save(existing);
        const withRelations = await repo.findOne({
            where: { id: saved.id },
            relations: ['parent', 'branch'],
        });

        revalidateCostCenterViews();

        const entity = (withRelations ?? saved) as CostCenter;
        return { success: true, costCenter: serializeCostCenter(entity) };
    } catch (error) {
        console.error('[setCostCenterStatus] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar el estado.',
        };
    }
}
