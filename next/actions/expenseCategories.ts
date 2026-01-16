'use server';

import { revalidatePath } from 'next/cache';
import { IsNull, type Repository, type DeepPartial } from 'typeorm';
import { getDb } from '@/data/db';
import { ExpenseCategory } from '@/data/entities/ExpenseCategory';
import { CostCenter } from '@/data/entities/CostCenter';
import { getCompany } from './companies';

export type PayrollCategoryType = 'salary' | 'advance';

const PAYROLL_CATEGORY_CODES: Record<PayrollCategoryType, string> = {
    salary: 'RRHH_SUELDOS',
    advance: 'RRHH_ADELANTO',
} as const;

const PAYROLL_CATEGORY_CODE_SET = new Set<string>(Object.values(PAYROLL_CATEGORY_CODES));

export interface ExpenseCategoryOption {
    id: string;
    code: string;
    name: string;
    description: string | null;
    groupName: string | null;
    examples: string[];
    defaultCostCenter: {
        id: string;
        code: string;
        name: string;
    } | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    isProtected: boolean;
    payrollType: PayrollCategoryType | null;
}

export interface CreateExpenseCategoryInput {
    name: string;
    description?: string;
    groupName?: string;
    examples?: string[];
    defaultCostCenterId?: string | null;
}

const OPERATING_EXPENSES_PATH = '/admin/operating-expenses';
const MAX_CODE_LENGTH = 50;

const normalizeString = (value?: string | null): string | undefined => {
    if (value == null) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeExamples = (values?: string[]): string[] => {
    if (!Array.isArray(values)) {
        return [];
    }

    const normalized = values
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry): entry is string => entry.length > 0);

    return Array.from(new Set(normalized));
};

const slugifyForCode = (value: string): string => {
    const normalized = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase();

    if (normalized.length === 0) {
        return 'EXP_CAT';
    }

    return normalized.slice(0, MAX_CODE_LENGTH);
};

const generateExpenseCategoryCode = async (
    repo: Repository<ExpenseCategory>,
    baseName: string,
): Promise<string> => {
    const base = slugifyForCode(baseName) || 'EXP_CAT';

    let candidate = base;
    let suffix = 1;

    while (await repo.findOne({ where: { code: candidate } })) {
        const suffixLabel = `_${suffix}`;
        const sliceLength = MAX_CODE_LENGTH - suffixLabel.length;
        candidate = `${base.slice(0, Math.max(sliceLength, 1))}${suffixLabel}`;
        suffix += 1;
    }

    return candidate;
};

const extractMetadata = (category: ExpenseCategory) => {
    type MetadataShape = {
        group?: string;
        examples?: string[];
        locked?: boolean;
        protected?: boolean;
        payrollType?: string;
        payroll?: { type?: string } | string | null;
    };

    const metadata = (category.metadata ?? {}) as MetadataShape;

    const groupName = typeof metadata.group === 'string' ? metadata.group.trim() : '';
    const examplesRaw = Array.isArray(metadata.examples) ? metadata.examples : [];
    const examples = sanitizeExamples(examplesRaw);

    const normalizedCode = category.code?.toUpperCase?.() ?? '';

    let payrollType: PayrollCategoryType | null = null;

    if (typeof metadata.payroll === 'string') {
        const value = metadata.payroll.toLowerCase();
        if (value === 'salary' || value === 'advance') {
            payrollType = value;
        }
    } else if (metadata.payroll && typeof metadata.payroll === 'object') {
        const maybeType = (metadata.payroll as { type?: string }).type;
        if (typeof maybeType === 'string') {
            const value = maybeType.toLowerCase();
            if (value === 'salary' || value === 'advance') {
                payrollType = value;
            }
        }
    }

    if (!payrollType && typeof metadata.payrollType === 'string') {
        const value = metadata.payrollType.toLowerCase();
        if (value === 'salary' || value === 'advance') {
            payrollType = value;
        }
    }

    if (!payrollType) {
        if (normalizedCode === PAYROLL_CATEGORY_CODES.salary) {
            payrollType = 'salary';
        } else if (normalizedCode === PAYROLL_CATEGORY_CODES.advance) {
            payrollType = 'advance';
        }
    }

    const isProtected = Boolean(metadata.locked || metadata.protected || (payrollType && PAYROLL_CATEGORY_CODE_SET.has(normalizedCode)));

    return {
        groupName: groupName.length > 0 ? groupName : null,
        examples,
        payrollType,
        isProtected,
    };
};

const serializeExpenseCategory = (category: ExpenseCategory): ExpenseCategoryOption => {
    const { groupName, examples, payrollType, isProtected } = extractMetadata(category);

    return {
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description ?? null,
        groupName,
        examples,
        defaultCostCenter: category.defaultCostCenter
            ? {
                  id: category.defaultCostCenter.id,
                  code: category.defaultCostCenter.code,
                  name: category.defaultCostCenter.name,
              }
            : null,
        isActive: category.isActive,
        createdAt: category.createdAt?.toISOString?.() ?? new Date().toISOString(),
        updatedAt: category.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        isProtected,
        payrollType,
    };
};

export async function listOperatingExpenseCategories(): Promise<ExpenseCategoryOption[]> {
    const company = await getCompany();
    if (!company) {
        return [];
    }

    const ds = await getDb();
    const repo = ds.getRepository(ExpenseCategory);

    const categories = await repo.find({
        where: {
            companyId: company.id,
            isActive: true,
            deletedAt: IsNull(),
        },
        relations: ['defaultCostCenter'],
        order: { name: 'ASC' },
    });

    return categories.map(serializeExpenseCategory);
}

export interface ExpenseCategoryResult {
    success: boolean;
    error?: string;
    category?: ExpenseCategoryOption;
}

export async function createOperatingExpenseCategory(
    input: CreateExpenseCategoryInput,
): Promise<ExpenseCategoryResult> {
    try {
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'No hay compañía configurada.' };
        }

        const ds = await getDb();
        const repo = ds.getRepository(ExpenseCategory);
        const costCenterRepo = ds.getRepository(CostCenter);

        const name = input.name.trim();
        if (!name) {
            return { success: false, error: 'El nombre de la categoría es obligatorio.' };
        }

        const existing = await repo
            .createQueryBuilder('category')
            .where('category.companyId = :companyId', { companyId: company.id })
            .andWhere('LOWER(category.name) = LOWER(:name)', { name })
            .getOne();

        if (existing) {
            return { success: false, error: 'Ya existe una categoría con ese nombre.' };
        }

        let defaultCostCenterId: string | null = null;
        if (input.defaultCostCenterId) {
            const costCenter = await costCenterRepo.findOne({
                where: { id: input.defaultCostCenterId, companyId: company.id },
            });

            if (!costCenter) {
                return { success: false, error: 'El centro de costos seleccionado no existe.' };
            }

            defaultCostCenterId = costCenter.id;
        }

        const description = normalizeString(input.description) ?? null;
        const groupName = normalizeString(input.groupName) ?? null;
        const examples = sanitizeExamples(input.examples);

        const metadata = groupName || examples.length > 0
            ? {
                  ...(groupName ? { group: groupName } : {}),
                  ...(examples.length > 0 ? { examples } : {}),
              }
            : null;

        const code = await generateExpenseCategoryCode(repo, name);

        const categoryPayload: DeepPartial<ExpenseCategory> = {
            companyId: company.id,
            code,
            name,
            description: description ?? undefined,
            requiresApproval: false,
            approvalThreshold: '0',
            defaultCostCenterId: defaultCostCenterId ?? null,
            isActive: true,
            metadata: metadata ?? null,
        };

        const category = repo.create(categoryPayload);

        const saved = await repo.save(category);
        const withRelations = await repo.findOne({
            where: { id: saved.id },
            relations: ['defaultCostCenter'],
        });

        revalidatePath(OPERATING_EXPENSES_PATH);

        return {
            success: true,
            category: serializeExpenseCategory(withRelations ?? saved),
        };
    } catch (error) {
        console.error('[createOperatingExpenseCategory] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear la categoría de gasto operativo.',
        };
    }
}
