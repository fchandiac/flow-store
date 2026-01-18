'use server'

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Shareholder } from '@/data/entities/Shareholder';
import { Person, PersonType, DocumentType } from '@/data/entities/Person';
import { getCompany } from './companies';

const COMPANY_SETTINGS_PATH = '/admin/settings/company';

export interface ShareholderPersonSummary {
    id: string;
    type: PersonType;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
    displayName: string;
    documentType: DocumentType | null;
    documentNumber: string | null;
    email: string | null;
    phone: string | null;
}

export interface ShareholderRecord {
    id: string;
    companyId: string;
    personId: string;
    role: string | null;
    ownershipPercentage: number | null;
    notes: string | null;
    isActive: boolean;
    metadata: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
    person: ShareholderPersonSummary | null;
}

export type ShareholderActionResult =
    | { success: true; shareholder: ShareholderRecord }
    | { success: false; error: string };

export interface CreateShareholderInput {
    personId: string;
    role?: string | null;
    ownershipPercentage?: number | null;
    notes?: string | null;
}

export interface UpdateShareholderInput {
    shareholderId: string;
    role?: string | null;
    ownershipPercentage?: number | null;
    notes?: string | null;
}

const normalizePercentage = (value: number | null | undefined): number | null => {
    if (value === null || value === undefined) {
        return null;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        throw new Error('El porcentaje de participación debe ser un número.');
    }

    if (numeric < 0 || numeric > 100) {
        throw new Error('El porcentaje de participación debe estar entre 0% y 100%.');
    }

    return Number(numeric.toFixed(2));
};

const buildDisplayName = (person: Person): string => {
    if (person.type === PersonType.COMPANY) {
        return person.businessName?.trim() || person.firstName || 'Empresa sin nombre';
    }

    const naturalName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    if (naturalName) {
        return naturalName;
    }

    return person.businessName?.trim() || 'Persona sin nombre';
};

const coerceNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
        return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const mapShareholder = (shareholder: Shareholder & { person?: Person | null }): ShareholderRecord => {
    return {
        id: shareholder.id,
        companyId: shareholder.companyId,
        personId: shareholder.personId,
        role: shareholder.role ?? null,
        ownershipPercentage: coerceNullableNumber(shareholder.ownershipPercentage),
        notes: shareholder.notes ?? null,
        isActive: shareholder.isActive,
        metadata: shareholder.metadata ?? null,
        createdAt: shareholder.createdAt?.toISOString?.() ?? new Date().toISOString(),
        updatedAt: shareholder.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        person: shareholder.person
            ? {
                  id: shareholder.person.id,
                  type: shareholder.person.type,
                  firstName: shareholder.person.firstName ?? null,
                  lastName: shareholder.person.lastName ?? null,
                  businessName: shareholder.person.businessName ?? null,
                  displayName: buildDisplayName(shareholder.person),
                  documentType: shareholder.person.documentType ?? null,
                  documentNumber: shareholder.person.documentNumber ?? null,
                  email: shareholder.person.email ?? null,
                  phone: shareholder.person.phone ?? null,
              }
            : null,
    };
};

export async function listShareholders(): Promise<ShareholderRecord[]> {
    const company = await getCompany();
    if (!company) {
        return [];
    }

    const ds = await getDb();
    const repo = ds.getRepository(Shareholder);

    const shareholders = await repo.find({
        where: { companyId: company.id },
        relations: { person: true },
        order: { isActive: 'DESC', createdAt: 'ASC' },
    });

    return shareholders.map(mapShareholder);
}

export async function createShareholder(input: CreateShareholderInput): Promise<ShareholderActionResult> {
    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No se encontró una compañía configurada.' };
    }

    const personId = input.personId?.trim();
    if (!personId) {
        return { success: false, error: 'Selecciona una persona para registrarla como socia.' };
    }

    const role = input.role?.trim() ?? null;
    const notes = input.notes?.trim() ?? null;

    let ownership: number | null = null;
    try {
        ownership = normalizePercentage(input.ownershipPercentage);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Porcentaje de participación inválido.',
        };
    }

    try {
        const ds = await getDb();
        const shareholderRepo = ds.getRepository(Shareholder);
        const personRepo = ds.getRepository(Person);

        const person = await personRepo.findOne({ where: { id: personId } });
        if (!person) {
            return { success: false, error: 'La persona seleccionada no existe.' };
        }

        const duplicate = await shareholderRepo.findOne({ where: { companyId: company.id, personId } });
        if (duplicate) {
            return { success: false, error: 'Esta persona ya está registrada como socia de la empresa.' };
        }

        const shareholder = shareholderRepo.create({
            companyId: company.id,
            personId,
            role,
            ownershipPercentage: ownership,
            notes,
            isActive: true,
        });

        await shareholderRepo.save(shareholder);

        const saved = await shareholderRepo.findOne({
            where: { id: shareholder.id },
            relations: { person: true },
        });

        if (!saved) {
            return { success: false, error: 'No fue posible cargar el socio recién creado.' };
        }

        revalidatePath(COMPANY_SETTINGS_PATH);
        return { success: true, shareholder: mapShareholder(saved) };
    } catch (error) {
        console.error('[createShareholder] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'No se pudo crear el socio.',
        };
    }
}

export async function updateShareholder(input: UpdateShareholderInput): Promise<ShareholderActionResult> {
    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No se encontró una compañía configurada.' };
    }

    try {
        const ds = await getDb();
        const shareholderRepo = ds.getRepository(Shareholder);

        const shareholder = await shareholderRepo.findOne({
            where: { id: input.shareholderId, companyId: company.id },
            relations: { person: true },
        });

        if (!shareholder) {
            return { success: false, error: 'El socio seleccionado no existe.' };
        }

        if (input.role !== undefined) {
            shareholder.role = input.role?.trim() || null;
        }

        if (input.notes !== undefined) {
            shareholder.notes = input.notes?.trim() || null;
        }

        if (input.ownershipPercentage !== undefined) {
            try {
                shareholder.ownershipPercentage = normalizePercentage(input.ownershipPercentage);
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Porcentaje de participación inválido.',
                };
            }
        }

        await shareholderRepo.save(shareholder);

        const saved = await shareholderRepo.findOne({
            where: { id: shareholder.id },
            relations: { person: true },
        });

        if (!saved) {
            return { success: false, error: 'No fue posible cargar el socio actualizado.' };
        }

        revalidatePath(COMPANY_SETTINGS_PATH);
        return { success: true, shareholder: mapShareholder(saved) };
    } catch (error) {
        console.error('[updateShareholder] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'No se pudo actualizar la información del socio.',
        };
    }
}

export async function setShareholderActive(shareholderId: string, isActive: boolean): Promise<ShareholderActionResult> {
    const company = await getCompany();
    if (!company) {
        return { success: false, error: 'No se encontró una compañía configurada.' };
    }

    try {
        const ds = await getDb();
        const shareholderRepo = ds.getRepository(Shareholder);

        const shareholder = await shareholderRepo.findOne({
            where: { id: shareholderId, companyId: company.id },
            relations: { person: true },
        });

        if (!shareholder) {
            return { success: false, error: 'El socio seleccionado no existe.' };
        }

        shareholder.isActive = isActive;
        await shareholderRepo.save(shareholder);

        const saved = await shareholderRepo.findOne({
            where: { id: shareholder.id },
            relations: { person: true },
        });

        if (!saved) {
            return { success: false, error: 'No fue posible cargar el socio actualizado.' };
        }

        revalidatePath(COMPANY_SETTINGS_PATH);
        return { success: true, shareholder: mapShareholder(saved) };
    } catch (error) {
        console.error('[setShareholderActive] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'No se pudo actualizar el estado del socio.',
        };
    }
}
