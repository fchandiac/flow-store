'use server'

import { getDb } from '@/data/db';
import { Tax, TaxType } from '@/data/entities/Tax';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface CreateTaxDTO {
    name: string;
    code: string;
    taxType?: TaxType;
    rate: number;
    description?: string;
    isDefault?: boolean;
    companyId: string;
}

interface UpdateTaxDTO {
    name?: string;
    code?: string;
    taxType?: TaxType;
    rate?: number;
    description?: string;
    isDefault?: boolean;
    isActive?: boolean;
}

interface TaxResult {
    success: boolean;
    tax?: Tax;
    error?: string;
}

/**
 * Obtiene todos los impuestos
 */
export async function getTaxes(includeInactive: boolean = false): Promise<Tax[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Tax);
    
    const where: any = { deletedAt: IsNull() };
    if (!includeInactive) {
        where.isActive = true;
    }
    
    const taxes = await repo.find({
        where,
        order: { isDefault: 'DESC', name: 'ASC' }
    });

    return taxes.map((tax) => JSON.parse(JSON.stringify(tax)));
}

/**
 * Obtiene los impuestos activos
 */
export async function getActiveTaxes(): Promise<Tax[]> {
    return getTaxes(false);
}

/**
 * Obtiene el impuesto por defecto
 */
export async function getDefaultTax(): Promise<Tax | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Tax);
    
    return repo.findOne({
        where: { isDefault: true, isActive: true, deletedAt: IsNull() }
    });
}

/**
 * Obtiene un impuesto por ID
 */
export async function getTaxById(id: string): Promise<Tax | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Tax);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() }
    });
}

/**
 * Obtiene un impuesto por código
 */
export async function getTaxByCode(code: string): Promise<Tax | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Tax);
    
    return repo.findOne({
        where: { code, deletedAt: IsNull() }
    });
}

/**
 * Crea un nuevo impuesto
 */
export async function createTax(data: CreateTaxDTO): Promise<TaxResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Tax);
        
        // Validaciones
        if (!data.name?.trim()) {
            return { success: false, error: 'El nombre es requerido' };
        }
        
        if (!data.code?.trim()) {
            return { success: false, error: 'El código es requerido' };
        }
        
        if (data.rate < 0 || data.rate > 100) {
            return { success: false, error: 'La tasa debe estar entre 0 y 100' };
        }
        
        // Verificar código único
        const existing = await repo.findOne({
            where: { code: data.code, deletedAt: IsNull() }
        });
        if (existing) {
            return { success: false, error: 'El código ya está en uso' };
        }
        
        // Si es default, quitar default de otros
        if (data.isDefault) {
            await repo.update(
                { isDefault: true, deletedAt: IsNull() },
                { isDefault: false }
            );
        }
        
        const tax = repo.create({
            companyId: data.companyId,
            name: data.name.trim(),
            code: data.code.trim(),
            taxType: data.taxType ?? TaxType.IVA,
            rate: data.rate,
            description: data.description,
            isDefault: data.isDefault ?? false,
            isActive: true
        });
        
        const savedTax = await repo.save(tax);
        revalidatePath('/admin/taxes');
        
        return { success: true, tax: JSON.parse(JSON.stringify(savedTax)) };
    } catch (error) {
        console.error('Error creating tax:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el impuesto' 
        };
    }
}

/**
 * Actualiza un impuesto
 */
export async function updateTax(id: string, data: UpdateTaxDTO): Promise<TaxResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Tax);
        
        const tax = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!tax) {
            return { success: false, error: 'Impuesto no encontrado' };
        }
        
        // Verificar código único si se cambia
        if (data.code && data.code !== tax.code) {
            const existing = await repo.findOne({ 
                where: { code: data.code, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El código ya está en uso' };
            }
        }
        
        // Validar tasa
        if (data.rate !== undefined && (data.rate < 0 || data.rate > 100)) {
            return { success: false, error: 'La tasa debe estar entre 0 y 100' };
        }
        
        // Si se marca como default, quitar default de otros
        if (data.isDefault === true && !tax.isDefault) {
            await repo.update(
                { isDefault: true, deletedAt: IsNull() },
                { isDefault: false }
            );
        }
        
        // Aplicar cambios
        if (data.name !== undefined) tax.name = data.name.trim();
        if (data.code !== undefined) tax.code = data.code.trim();
        if (data.taxType !== undefined) tax.taxType = data.taxType;
        if (data.rate !== undefined) tax.rate = data.rate;
        if (data.description !== undefined) tax.description = data.description;
        if (data.isDefault !== undefined) tax.isDefault = data.isDefault;
        if (data.isActive !== undefined) tax.isActive = data.isActive;
        
        const savedTax = await repo.save(tax);
        revalidatePath('/admin/taxes');
        
        return { success: true, tax: JSON.parse(JSON.stringify(savedTax)) };
    } catch (error) {
        console.error('Error updating tax:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el impuesto' 
        };
    }
}

/**
 * Elimina (soft delete) un impuesto
 */
export async function deleteTax(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Tax);
        
        const tax = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!tax) {
            return { success: false, error: 'Impuesto no encontrado' };
        }
        
        // No permitir eliminar si es el único activo
        const activeCount = await repo.count({
            where: { isActive: true, deletedAt: IsNull() }
        });
        
        if (activeCount === 1 && tax.isActive) {
            return { success: false, error: 'No se puede eliminar el único impuesto activo' };
        }
        
        // Si es default, asignar otro como default
        if (tax.isDefault) {
            const otherTax = await repo.findOne({
                where: { isActive: true, deletedAt: IsNull() }
            });
            if (otherTax) {
                otherTax.isDefault = true;
                await repo.save(otherTax);
            }
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/taxes');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting tax:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el impuesto' 
        };
    }
}

/**
 * Establece un impuesto como default
 */
export async function setDefaultTax(id: string): Promise<TaxResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Tax);
        
        const tax = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!tax) {
            return { success: false, error: 'Impuesto no encontrado' };
        }
        
        if (!tax.isActive) {
            return { success: false, error: 'No se puede establecer un impuesto inactivo como default' };
        }
        
        // Quitar default de otros
        await repo.update(
            { isDefault: true, deletedAt: IsNull() },
            { isDefault: false }
        );
        
        tax.isDefault = true;
        const savedTax = await repo.save(tax);
        
        revalidatePath('/admin/taxes');
        
        return { success: true, tax: JSON.parse(JSON.stringify(savedTax)) };
    } catch (error) {
        console.error('Error setting default tax:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al establecer impuesto default' 
        };
    }
}

/**
 * Calcula el impuesto para un monto dado
 * Por defecto asume que el impuesto NO está incluido en el precio
 */
export async function calculateTax(
    amount: number, 
    taxId?: string,
    includedInPrice: boolean = false
): Promise<{ tax: number; taxRate: number; total: number }> {
    let taxEntity: Tax | null = null;
    
    if (taxId) {
        taxEntity = await getTaxById(taxId);
    }
    
    if (!taxEntity) {
        taxEntity = await getDefaultTax();
    }
    
    if (!taxEntity) {
        return { tax: 0, taxRate: 0, total: amount };
    }
    
    const taxRate = Number(taxEntity.rate) / 100;
    let tax: number;
    let total: number;
    
    if (includedInPrice) {
        // El impuesto ya está incluido en el precio
        tax = amount - (amount / (1 + taxRate));
        total = amount;
    } else {
        // El impuesto se agrega al precio
        tax = amount * taxRate;
        total = amount + tax;
    }
    
    return {
        tax: Math.round(tax * 100) / 100,
        taxRate: Number(taxEntity.rate),
        total: Math.round(total * 100) / 100
    };
}

/**
 * Inicializa el impuesto IVA por defecto (Chile 19%)
 */
export async function initializeDefaultTax(companyId: string): Promise<TaxResult> {
    const ds = await getDb();
    const repo = ds.getRepository(Tax);
    
    // Verificar si ya existe
    const existing = await repo.findOne({
        where: { code: 'IVA', deletedAt: IsNull() }
    });
    
    if (existing) {
        return { success: true, tax: JSON.parse(JSON.stringify(existing)) };
    }
    
    return createTax({
        companyId,
        name: 'IVA',
        code: 'IVA',
        taxType: TaxType.IVA,
        rate: 19,
        description: 'Impuesto al Valor Agregado',
        isDefault: true
    });
}
