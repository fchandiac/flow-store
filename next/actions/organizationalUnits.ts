'use server';

import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';
import { getDb } from '@/data/db';
import { OrganizationalUnit, OrganizationalUnitType } from '@/data/entities/OrganizationalUnit';
import { Branch } from '@/data/entities/Branch';
import { getCompany } from './companies';

export interface OrganizationalUnitSummary {
    id: string;
    code: string;
    name: string;
    description: string | null;
    unitType: string;
    branchId: string | null;
    branch: { id: string; name: string | null } | null;
    costCenterId: string | null;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateOrganizationalUnitInput {
    name: string;
    description?: string | null;
    branchId?: string | null;
}

export interface OrganizationalUnitMutationResult {
    success: boolean;
    error?: string;
    unit?: OrganizationalUnitSummary;
}

const HUMAN_RESOURCES_PATH = '/admin/human-resources';

const mapOrganizationalUnitToSummary = (unit: OrganizationalUnit): OrganizationalUnitSummary => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    description: unit.description ?? null,
    unitType: unit.unitType,
    branchId: unit.branchId ?? null,
    branch: unit.branch
        ? {
            id: unit.branch.id,
            name: unit.branch.name ?? null,
        }
        : null,
    costCenterId: unit.costCenterId ?? null,
    parentId: unit.parentId ?? null,
    createdAt: unit.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: unit.updatedAt?.toISOString?.() ?? new Date().toISOString(),
});

const sanitizeOptional = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const generateUnitCode = (name: string): string => {
    const base = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
    const safeBase = base || 'UNIT';
    const suffix = Date.now().toString(36).toUpperCase().slice(-5);
    return `${safeBase}-${suffix}`;
};

export async function listOrganizationalUnits(params?: { includeInactive?: boolean }): Promise<OrganizationalUnitSummary[]> {
    const ds = await getDb();
    const repo = ds.getRepository(OrganizationalUnit);

    const query = repo
        .createQueryBuilder('unit')
        .leftJoinAndSelect('unit.branch', 'branch')
        .where('unit.deletedAt IS NULL');

    if (!params?.includeInactive) {
        query.andWhere('unit.isActive = :active', { active: true });
    }

    query.orderBy('unit.unitType', 'ASC').addOrderBy('unit.name', 'ASC');

    const units = await query.getMany();

    return units.map((unit) => mapOrganizationalUnitToSummary(unit));
}

export async function createOrganizationalUnit(input: CreateOrganizationalUnitInput): Promise<OrganizationalUnitMutationResult> {
    try {
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No hay compañía configurada.' };
        }

        const normalizedName = input.name?.trim();
        if (!normalizedName) {
            return { success: false, error: 'El nombre es obligatorio.' };
        }

        const ds = await getDb();
        const unitRepo = ds.getRepository(OrganizationalUnit);
        const branchRepo = ds.getRepository(Branch);

        let branchId: string | null = null;
        if (input.branchId) {
            const branch = await branchRepo.findOne({
                where: { id: input.branchId, companyId: company.id, deletedAt: IsNull() },
            });
            if (!branch) {
                return { success: false, error: 'La sucursal seleccionada no existe.' };
            }
            branchId = branch.id;
        }

        const unit = new OrganizationalUnit();
        unit.companyId = company.id;
        unit.code = generateUnitCode(normalizedName);
        unit.name = normalizedName;
        unit.description = sanitizeOptional(input.description) ?? undefined;
        unit.branchId = sanitizeOptional(branchId) ?? undefined;
        unit.unitType = OrganizationalUnitType.OTHER;
        unit.isActive = true;

        await unitRepo.save(unit);

        const saved = await unitRepo.findOne({
            where: { id: unit.id },
            relations: ['branch'],
        });

        revalidatePath(HUMAN_RESOURCES_PATH);

        if (!saved) {
            return { success: true };
        }

        return { success: true, unit: mapOrganizationalUnitToSummary(saved) };
    } catch (error) {
        console.error('[createOrganizationalUnit] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear la unidad organizativa.',
        };
    }
}
