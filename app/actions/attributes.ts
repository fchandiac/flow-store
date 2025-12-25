'use server'

import { getDb } from '@/data/db';
import { Attribute } from '@/data/entities/Attribute';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface CreateAttributeDTO {
    name: string;
    description?: string;
    options: string[];
    displayOrder?: number;
}

interface UpdateAttributeDTO {
    name?: string;
    description?: string;
    options?: string[];
    displayOrder?: number;
    isActive?: boolean;
}

interface AttributeResult {
    success: boolean;
    attribute?: Attribute;
    error?: string;
}

/**
 * Obtiene todos los atributos activos
 */
export async function getAttributes(includeInactive: boolean = false): Promise<Attribute[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Attribute);
    
    const where: any = { deletedAt: IsNull() };
    if (!includeInactive) {
        where.isActive = true;
    }
    
    const attributes = await repo.find({
        where,
        order: { displayOrder: 'ASC', name: 'ASC' }
    });
    
    return JSON.parse(JSON.stringify(attributes));
}

/**
 * Obtiene un atributo por ID
 */
export async function getAttributeById(id: string): Promise<Attribute | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Attribute);
    
    const attribute = await repo.findOne({
        where: { id, deletedAt: IsNull() }
    });
    
    return attribute ? JSON.parse(JSON.stringify(attribute)) : null;
}

/**
 * Crea un nuevo atributo
 */
export async function createAttribute(data: CreateAttributeDTO): Promise<AttributeResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Attribute);
        
        // Verificar nombre único
        const existing = await repo.findOne({
            where: { name: data.name, deletedAt: IsNull() }
        });
        
        if (existing) {
            return { success: false, error: 'Ya existe un atributo con ese nombre' };
        }
        
        // Validar que haya al menos una opción
        if (!data.options || data.options.length === 0) {
            return { success: false, error: 'Debe definir al menos una opción para el atributo' };
        }
        
        // Limpiar opciones vacías y duplicadas
        const cleanOptions = [...new Set(
            data.options
                .map(opt => opt.trim())
                .filter(opt => opt.length > 0)
        )];
        
        if (cleanOptions.length === 0) {
            return { success: false, error: 'Debe definir al menos una opción válida' };
        }
        
        const attribute = repo.create({
            name: data.name.trim(),
            description: data.description?.trim(),
            options: cleanOptions,
            displayOrder: data.displayOrder || 0,
            isActive: true
        });
        
        await repo.save(attribute);
        revalidatePath('/admin/settings/attributes');
        revalidatePath('/admin/products');
        
        return { success: true, attribute: JSON.parse(JSON.stringify(attribute)) };
    } catch (error) {
        console.error('Error creating attribute:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el atributo' 
        };
    }
}

/**
 * Actualiza un atributo
 */
export async function updateAttribute(id: string, data: UpdateAttributeDTO): Promise<AttributeResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Attribute);
        
        const attribute = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!attribute) {
            return { success: false, error: 'Atributo no encontrado' };
        }
        
        // Verificar nombre único si cambia
        if (data.name && data.name !== attribute.name) {
            const existing = await repo.findOne({
                where: { name: data.name, deletedAt: IsNull() }
            });
            if (existing) {
                return { success: false, error: 'Ya existe un atributo con ese nombre' };
            }
        }
        
        // Actualizar campos
        if (data.name !== undefined) attribute.name = data.name.trim();
        if (data.description !== undefined) attribute.description = data.description?.trim();
        if (data.displayOrder !== undefined) attribute.displayOrder = data.displayOrder;
        if (data.isActive !== undefined) attribute.isActive = data.isActive;
        
        // Actualizar opciones si se proporcionan
        if (data.options !== undefined) {
            const cleanOptions = [...new Set(
                data.options
                    .map(opt => opt.trim())
                    .filter(opt => opt.length > 0)
            )];
            
            if (cleanOptions.length === 0) {
                return { success: false, error: 'Debe mantener al menos una opción válida' };
            }
            
            attribute.options = cleanOptions;
        }
        
        await repo.save(attribute);
        revalidatePath('/admin/settings/attributes');
        revalidatePath('/admin/products');
        
        return { success: true, attribute: JSON.parse(JSON.stringify(attribute)) };
    } catch (error) {
        console.error('Error updating attribute:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el atributo' 
        };
    }
}

/**
 * Elimina un atributo (soft delete)
 */
export async function deleteAttribute(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Attribute);
        
        const attribute = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!attribute) {
            return { success: false, error: 'Atributo no encontrado' };
        }
        
        // TODO: Verificar si hay variantes usando este atributo antes de eliminar
        
        await repo.softRemove(attribute);
        revalidatePath('/admin/settings/attributes');
        revalidatePath('/admin/products');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting attribute:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el atributo' 
        };
    }
}

/**
 * Agrega una opción a un atributo existente
 */
export async function addOptionToAttribute(
    attributeId: string, 
    option: string
): Promise<AttributeResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Attribute);
        
        const attribute = await repo.findOne({
            where: { id: attributeId, deletedAt: IsNull() }
        });
        
        if (!attribute) {
            return { success: false, error: 'Atributo no encontrado' };
        }
        
        const cleanOption = option.trim();
        if (!cleanOption) {
            return { success: false, error: 'La opción no puede estar vacía' };
        }
        
        if (attribute.options.includes(cleanOption)) {
            return { success: false, error: 'Esta opción ya existe' };
        }
        
        attribute.options = [...attribute.options, cleanOption];
        await repo.save(attribute);
        
        revalidatePath('/admin/settings/attributes');
        revalidatePath('/admin/products');
        
        return { success: true, attribute: JSON.parse(JSON.stringify(attribute)) };
    } catch (error) {
        console.error('Error adding option:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al agregar la opción' 
        };
    }
}

/**
 * Elimina una opción de un atributo
 */
export async function removeOptionFromAttribute(
    attributeId: string, 
    option: string
): Promise<AttributeResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Attribute);
        
        const attribute = await repo.findOne({
            where: { id: attributeId, deletedAt: IsNull() }
        });
        
        if (!attribute) {
            return { success: false, error: 'Atributo no encontrado' };
        }
        
        if (attribute.options.length <= 1) {
            return { success: false, error: 'No puede eliminar la última opción' };
        }
        
        // TODO: Verificar si hay variantes usando esta opción antes de eliminar
        
        attribute.options = attribute.options.filter(opt => opt !== option);
        await repo.save(attribute);
        
        revalidatePath('/admin/settings/attributes');
        revalidatePath('/admin/products');
        
        return { success: true, attribute: JSON.parse(JSON.stringify(attribute)) };
    } catch (error) {
        console.error('Error removing option:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar la opción' 
        };
    }
}
