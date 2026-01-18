'use server'

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Unit } from '@/data/entities/Unit';
import { UnitDimension } from '@/data/entities/unit-dimension.enum';
import { Brackets, IsNull, Not } from 'typeorm';

const ADMIN_UNITS_PATH = '/admin/settings/units';

export interface UnitSummary {
    id: string;
    name: string;
    symbol: string;
    dimension: string;
    conversionFactor: number;
    isBase: boolean;
    baseUnitId: string;
    allowDecimals: boolean;
}

export interface UnitAdminSummary {
    id: string;
    name: string;
    symbol: string;
    dimension: UnitDimension;
    conversionFactor: number;
    isBase: boolean;
    baseUnitId: string;
    baseUnitName: string;
    baseUnitSymbol: string;
    active: boolean;
    derivedCount: number;
    createdAt: string;
    updatedAt: string;
    allowDecimals: boolean;
}

export interface GetUnitsParams {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    dimension?: string;
}

export interface CreateUnitInput {
    name: string;
    symbol: string;
    dimension: string;
    conversionFactor: number;
    isBase: boolean;
    baseUnitId?: string;
    allowDecimals?: boolean;
}

export interface UpdateUnitInput {
    name?: string;
    symbol?: string;
    dimension?: string;
    conversionFactor?: number;
    isBase?: boolean;
    baseUnitId?: string;
    allowDecimals?: boolean;
}

interface UnitMutationResult {
    success: boolean;
    unit?: UnitAdminSummary;
    error?: string;
}

const validDimensions = new Set<string>(Object.values(UnitDimension));

function normalizeName(name?: string): string {
    return (name ?? '').trim();
}

function normalizeSymbol(symbol?: string): string {
    return (symbol ?? '').trim().toUpperCase();
}

function parseDimension(value?: string): UnitDimension | null {
    if (!value) {
        return null;
    }
    const normalized = value.toLowerCase();
    return validDimensions.has(normalized) ? (normalized as UnitDimension) : null;
}

function toPositiveNumber(value?: number): number | null {
    if (value === undefined || value === null) {
        return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }
    return numeric;
}

function mapUnitToAdminSummary(unit: Unit): UnitAdminSummary {
    const derivedUnits = Array.isArray(unit.derivedUnits) ? unit.derivedUnits : [];
    const derivedCount = derivedUnits.filter((child) => child.id !== unit.id && !child.deletedAt).length;

    const baseUnit = unit.baseUnit ?? unit;

    return {
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        dimension: unit.dimension,
        conversionFactor: Number(unit.conversionFactor ?? 0),
        isBase: Boolean(unit.isBase),
        baseUnitId: baseUnit.id,
        baseUnitName: baseUnit.name,
        baseUnitSymbol: baseUnit.symbol,
        active: Boolean(unit.active),
        derivedCount,
        createdAt: unit.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
        updatedAt: unit.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
        allowDecimals: unit.allowDecimals ?? true,
    };
}

async function ensureUniqueSymbol(repo: ReturnType<typeof getRepository>, symbol: string, excludeId?: string): Promise<boolean> {
    const qb = repo.createQueryBuilder('unit')
        .where('unit.deletedAt IS NULL')
        .andWhere('LOWER(unit.symbol) = :symbol', { symbol: symbol.toLowerCase() });

    if (excludeId) {
        qb.andWhere('unit.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    return !existing;
}

function getRepository(ds: Awaited<ReturnType<typeof getDb>>) {
    return ds.getRepository(Unit);
}

async function reloadUnit(repo: ReturnType<typeof getRepository>, id: string): Promise<Unit | null> {
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['baseUnit', 'derivedUnits'],
    });
}

export async function getActiveUnits(): Promise<UnitSummary[]> {
    const ds = await getDb();
    const repo = getRepository(ds);

    const units = await repo.find({
        where: { deletedAt: IsNull(), active: true },
        relations: ['baseUnit'],
        order: { name: 'ASC' },
    });

    return units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        dimension: unit.dimension,
        conversionFactor: Number(unit.conversionFactor ?? 0),
        isBase: unit.isBase,
        baseUnitId: unit.baseUnit?.id ?? unit.id,
        allowDecimals: unit.allowDecimals ?? true,
    }));
}

export async function getUnitsForAdmin(params: GetUnitsParams = {}): Promise<UnitAdminSummary[]> {
    const ds = await getDb();
    const repo = getRepository(ds);

    const dimension = params.dimension ? parseDimension(params.dimension) : null;
    const search = params.search?.trim().toLowerCase();
    const status = params.status ?? 'all';

    const qb = repo.createQueryBuilder('unit')
        .leftJoinAndSelect('unit.baseUnit', 'baseUnit')
        .leftJoinAndSelect('unit.derivedUnits', 'derivedUnits')
        .where('unit.deletedAt IS NULL');

    if (search) {
        qb.andWhere(new Brackets((qbWhere) => {
            qbWhere.where('LOWER(unit.name) LIKE :search', { search: `%${search}%` })
                .orWhere('LOWER(unit.symbol) LIKE :search', { search: `%${search}%` });
        }));
    }

    if (dimension) {
        qb.andWhere('unit.dimension = :dimension', { dimension });
    }

    if (status === 'active') {
        qb.andWhere('unit.active = true');
    } else if (status === 'inactive') {
        qb.andWhere('unit.active = false');
    }

    const units = await qb
        .orderBy('unit.dimension', 'ASC')
        .addOrderBy('unit.isBase', 'DESC')
        .addOrderBy('unit.name', 'ASC')
        .getMany();

    return units.map(mapUnitToAdminSummary);
}

export async function createUnit(input: CreateUnitInput): Promise<UnitMutationResult> {
    const ds = await getDb();
    const repo = getRepository(ds);

    const name = normalizeName(input.name);
    if (!name) {
        return { success: false, error: 'El nombre es requerido' };
    }

    const symbol = normalizeSymbol(input.symbol);
    if (!symbol) {
        return { success: false, error: 'El símbolo es requerido' };
    }

    const dimension = parseDimension(input.dimension);
    if (!dimension) {
        return { success: false, error: 'Dimensión inválida' };
    }

    const conversionFactor = toPositiveNumber(input.conversionFactor);
    if (conversionFactor === null) {
        return { success: false, error: 'El factor de conversión debe ser un número positivo' };
    }

    const allowDecimals = input.allowDecimals === undefined ? true : Boolean(input.allowDecimals);

    const hasUniqueSymbol = await ensureUniqueSymbol(repo, symbol);
    if (!hasUniqueSymbol) {
        return { success: false, error: 'El símbolo ya está en uso' };
    }

    if (input.isBase) {
        const existingBase = await repo.findOne({
            where: {
                dimension,
                isBase: true,
                deletedAt: IsNull(),
            },
        });

        if (existingBase) {
            return { success: false, error: 'Ya existe una unidad base para esta dimensión' };
        }

        const id = randomUUID();
        const unit = repo.create({
            id,
            name,
            symbol,
            dimension,
            conversionFactor,
            isBase: true,
            active: true,
            baseUnit: null,
            allowDecimals,
        });

        await repo.save(unit);

        const reloaded = await reloadUnit(repo, id);
        if (!reloaded) {
            return { success: false, error: 'Error al crear la unidad' };
        }

        revalidatePath(ADMIN_UNITS_PATH);
        return { success: true, unit: mapUnitToAdminSummary(reloaded) };
    }

    if (!input.baseUnitId) {
        return { success: false, error: 'Debe seleccionar una unidad base' };
    }

    const baseUnit = await repo.findOne({
        where: { id: input.baseUnitId, deletedAt: IsNull() },
    });

    if (!baseUnit || !baseUnit.isBase) {
        return { success: false, error: 'La unidad base seleccionada no es válida' };
    }

    if (baseUnit.dimension !== dimension) {
        return { success: false, error: 'La dimensión no coincide con la unidad base' };
    }

    const id = randomUUID();
    const unit = repo.create({
        id,
        name,
        symbol,
        dimension,
        conversionFactor,
        isBase: false,
        baseUnit,
        active: true,
        allowDecimals,
    });

    await repo.save(unit);

    const reloaded = await reloadUnit(repo, id);
    if (!reloaded) {
        return { success: false, error: 'Error al crear la unidad' };
    }

    revalidatePath(ADMIN_UNITS_PATH);
    return { success: true, unit: mapUnitToAdminSummary(reloaded) };
}

export async function updateUnit(id: string, input: UpdateUnitInput): Promise<UnitMutationResult> {
    const ds = await getDb();
    const repo = getRepository(ds);

    const unit = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['baseUnit', 'derivedUnits'],
    });

    if (!unit) {
        return { success: false, error: 'Unidad no encontrada' };
    }

    const nextName = input.name !== undefined ? normalizeName(input.name) : unit.name;
    if (!nextName) {
        return { success: false, error: 'El nombre es requerido' };
    }

    const nextSymbol = input.symbol !== undefined ? normalizeSymbol(input.symbol) : unit.symbol;
    if (!nextSymbol) {
        return { success: false, error: 'El símbolo es requerido' };
    }

    const nextDimension = input.dimension ? parseDimension(input.dimension) : unit.dimension;
    if (!nextDimension) {
        return { success: false, error: 'Dimensión inválida' };
    }

    const nextConversion = input.conversionFactor !== undefined
        ? toPositiveNumber(input.conversionFactor)
        : Number(unit.conversionFactor ?? 0);

    if (nextConversion === null) {
        return { success: false, error: 'El factor de conversión debe ser un número positivo' };
    }

    const wantsBase = input.isBase !== undefined ? input.isBase : unit.isBase;
    const nextAllowDecimals = input.allowDecimals !== undefined
        ? Boolean(input.allowDecimals)
        : unit.allowDecimals ?? true;

    const hasUniqueSymbol = await ensureUniqueSymbol(repo, nextSymbol, unit.id);
    if (!hasUniqueSymbol) {
        return { success: false, error: 'El símbolo ya está en uso' };
    }

    let nextBaseUnit: Unit | null = null;

    if (wantsBase) {
        const otherBase = await repo.findOne({
            where: {
                dimension: nextDimension,
                isBase: true,
                deletedAt: IsNull(),
                id: Not(unit.id),
            },
        });

        if (otherBase) {
            return { success: false, error: 'Ya existe otra unidad base para esta dimensión' };
        }

        nextBaseUnit = null;
    } else {
        const baseUnitId = input.baseUnitId ?? (unit.isBase ? undefined : unit.baseUnit?.id);
        if (!baseUnitId) {
            return { success: false, error: 'Debe seleccionar una unidad base' };
        }

        if (unit.isBase) {
            const activeDerived = (unit.derivedUnits || []).filter((child) => child.id !== unit.id && !child.deletedAt);
            if (activeDerived.length > 0) {
                return { success: false, error: 'No se puede convertir la unidad base porque tiene derivadas asociadas' };
            }
        }

        const candidateBase = await repo.findOne({
            where: { id: baseUnitId, deletedAt: IsNull() },
        });

        if (!candidateBase || !candidateBase.isBase) {
            return { success: false, error: 'La unidad base seleccionada no es válida' };
        }

        if (candidateBase.dimension !== nextDimension) {
            return { success: false, error: 'La dimensión no coincide con la unidad base' };
        }

        if (candidateBase.id === unit.id) {
            return { success: false, error: 'Debe seleccionar una unidad base distinta' };
        }

        nextBaseUnit = candidateBase;
    }

    unit.name = nextName;
    unit.symbol = nextSymbol;
    unit.dimension = nextDimension;
    unit.conversionFactor = nextConversion;
    unit.isBase = wantsBase;
    unit.baseUnit = nextBaseUnit ?? null;
    unit.allowDecimals = nextAllowDecimals;

    await repo.save(unit);

    const reloaded = await reloadUnit(repo, id);
    if (!reloaded) {
        return { success: false, error: 'Error al actualizar la unidad' };
    }

    revalidatePath(ADMIN_UNITS_PATH);
    return { success: true, unit: mapUnitToAdminSummary(reloaded) };
}

export async function setUnitActive(id: string, active: boolean): Promise<{ success: boolean; error?: string }> {
    const ds = await getDb();
    const repo = getRepository(ds);

    const unit = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['baseUnit', 'derivedUnits'],
    });

    if (!unit) {
        return { success: false, error: 'Unidad no encontrada' };
    }

    if (!active && unit.isBase) {
        const derived = (unit.derivedUnits || []).filter((child) => child.id !== unit.id && !child.deletedAt && child.active);
        if (derived.length > 0) {
            return { success: false, error: 'No se puede desactivar una unidad base con derivadas activas' };
        }
    }

    unit.active = active;
    await repo.save(unit);

    revalidatePath(ADMIN_UNITS_PATH);
    return { success: true };
}
