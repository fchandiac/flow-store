'use server'

import { getDb } from '@/data/db';
import { Company } from '@/data/entities/Company';
import { AccountTypeName, BankName, PersonBankAccount } from '@/data/entities/Person';
import { revalidatePath } from 'next/cache';

// Types
interface UpdateCompanyDTO {
    name?: string;
    defaultCurrency?: string;
    fiscalYearStart?: Date;
    settings?: Record<string, any>;
}

interface UpdateResult {
    success: boolean;
    company?: Company;
    error?: string;
}

export interface CompanyBankAccountInput {
    bankName: BankName;
    accountType: AccountTypeName;
    accountNumber: string;
    accountHolderName?: string;
    notes?: string;
    isPrimary?: boolean;
}

/**
 * Obtiene la compañía (sistema de compañía única)
 */
export async function getCompany(): Promise<Company | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Company);
    
    const company = await repo.findOne({
        where: {},
        order: { createdAt: 'ASC' }
    });
    
    return company;
}

/**
 * Actualiza la configuración de la compañía
 */
export async function updateCompany(data: UpdateCompanyDTO): Promise<UpdateResult> {
    console.log('[updateCompany] Iniciando actualización con datos:', JSON.stringify(data));
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Company);
        
        let company = await repo.findOne({ where: {} });
        console.log('[updateCompany] Empresa encontrada:', company?.id, company?.name);
        
        if (!company) {
            // Crear si no existe
            console.log('[updateCompany] No existe empresa, creando nueva...');
            company = repo.create({
                name: data.name || 'Mi Empresa',
                defaultCurrency: data.defaultCurrency || 'CLP',
                fiscalYearStart: data.fiscalYearStart,
                settings: data.settings,
                isActive: true
            });
        } else {
            // Actualizar existente
            console.log('[updateCompany] Actualizando empresa existente...');
            if (data.name !== undefined) company.name = data.name;
            if (data.defaultCurrency !== undefined) company.defaultCurrency = data.defaultCurrency;
            if (data.fiscalYearStart !== undefined) company.fiscalYearStart = data.fiscalYearStart;
            if (data.settings !== undefined) {
                company.settings = { ...company.settings, ...data.settings };
            }
        }
        
        console.log('[updateCompany] Guardando empresa:', company.name);
        const savedCompany = await repo.save(company);
        console.log('[updateCompany] Empresa guardada exitosamente:', savedCompany.id);
        revalidatePath('/admin');
        revalidatePath('/admin/settings/company');
        
        return { success: true, company: JSON.parse(JSON.stringify(savedCompany)) };
    } catch (error) {
        console.error('[updateCompany] Error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar la compañía' 
        };
    }
}

export async function addCompanyBankAccount(data: CompanyBankAccountInput): Promise<UpdateResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Company);

        const company = await repo.findOne({ where: {} });
        if (!company) {
            return { success: false, error: 'Compañía no encontrada' };
        }

        const bankAccounts: PersonBankAccount[] = Array.isArray(company.bankAccounts)
            ? [...company.bankAccounts]
            : [];

        const normalizedAccountNumber = data.accountNumber.trim();
        if (normalizedAccountNumber.length === 0) {
            return { success: false, error: 'El número de cuenta es requerido' };
        }

        const duplicate = bankAccounts.some(
            (account) => account.accountNumber.trim() === normalizedAccountNumber,
        );

        if (duplicate) {
            return { success: false, error: 'La cuenta bancaria ya está registrada' };
        }

        if (data.isPrimary) {
            for (const account of bankAccounts) {
                account.isPrimary = false;
            }
        }

        const newAccount: PersonBankAccount = {
            bankName: data.bankName,
            accountType: data.accountType,
            accountNumber: normalizedAccountNumber,
            accountHolderName: data.accountHolderName?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
            isPrimary: data.isPrimary ?? bankAccounts.length === 0,
        };

        bankAccounts.push(newAccount);
        company.bankAccounts = bankAccounts;

        const savedCompany = await repo.save(company);

        revalidatePath('/admin');
        revalidatePath('/admin/settings/company');

        return { success: true, company: JSON.parse(JSON.stringify(savedCompany)) };
    } catch (error) {
        console.error('[addCompanyBankAccount] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al agregar la cuenta bancaria',
        };
    }
}

/**
 * Obtiene una configuración específica
 */
export async function getCompanySettings<T>(key: string): Promise<T | null> {
    const company = await getCompany();
    if (!company?.settings) return null;
    return (company.settings as Record<string, T>)[key] ?? null;
}

/**
 * Actualiza una configuración específica
 */
export async function updateCompanySettings(
    key: string, 
    value: any
): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Company);
        
        const company = await repo.findOne({ where: {} });
        if (!company) {
            return { success: false, error: 'Compañía no encontrada' };
        }
        
        company.settings = {
            ...company.settings,
            [key]: value
        };
        
        await repo.save(company);
        revalidatePath('/admin');
        
        return { success: true };
    } catch (error) {
        console.error('Error updating company settings:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar configuración' 
        };
    }
}

/**
 * Inicializa la compañía si no existe
 */
export async function initializeCompany(data: {
    name: string;
    defaultCurrency?: string;
}): Promise<UpdateResult> {
    const existing = await getCompany();
    if (existing) {
        return { success: true, company: existing };
    }
    
    return updateCompany({
        name: data.name,
        defaultCurrency: data.defaultCurrency || 'CLP'
    });
}
