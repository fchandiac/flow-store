'use server'

import { getDb } from '@/data/db';
import { Storage, StorageCategory, StorageType } from '@/data/entities/Storage';
import { revalidatePath } from 'next/cache';
import { IsNull, Not } from 'typeorm';

// Types
interface GetStoragesParams {
    branchId?: string;
    type?: StorageType;
    category?: StorageCategory;
    includeInactive?: boolean;
}

interface CreateStorageDTO {
    branchId?: string | null;
    name: string;
    code?: string;
    type?: StorageType;
    category?: StorageCategory;
    capacity?: number;
    location?: string;
    isDefault?: boolean;
}

interface UpdateStorageDTO {
    name?: string;
    code?: string;
    type?: StorageType;
    category?: StorageCategory;
    branchId?: string | null;
    capacity?: number;
    location?: string;
    isDefault?: boolean;
    isActive?: boolean;
}

interface StorageResult {
    success: boolean;
    storage?: Storage;
    error?: string;
}

/**
 * Obtiene almacenes con filtros
 */
export async function getStorages(params?: GetStoragesParams): Promise<Storage[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Storage);
    
    const queryBuilder = repo.createQueryBuilder('storage')
        .leftJoinAndSelect('storage.branch', 'branch')
        .where('storage.deletedAt IS NULL');
    
    if (params?.branchId) {
        queryBuilder.andWhere('storage.branchId = :branchId', { branchId: params.branchId });
    }
    
    if (params?.type) {
        queryBuilder.andWhere('storage.type = :type', { type: params.type });
    }

    if (params?.category) {
        queryBuilder.andWhere('storage.category = :category', { category: params.category });
    }
    
    if (!params?.includeInactive) {
        queryBuilder.andWhere('storage.isActive = :isActive', { isActive: true });
    }
    
    queryBuilder.orderBy('storage.isDefault', 'DESC')
        .addOrderBy('storage.name', 'ASC');
    
    const storages = await queryBuilder.getMany();
    return JSON.parse(JSON.stringify(storages));
}

/**
 * Obtiene un almacén por ID
 */
export async function getStorageById(id: string): Promise<Storage | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Storage);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['branch']
    });
}

/**
 * Crea un nuevo almacén
 */
export async function createStorage(data: CreateStorageDTO): Promise<StorageResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Storage);

        const category = data.category ?? StorageCategory.IN_BRANCH;
        const normalizedBranchId = data.branchId ?? null;

        if (category === StorageCategory.IN_BRANCH && !normalizedBranchId) {
            return { success: false, error: 'Las bodegas de sucursal deben asociarse a una sucursal' };
        }

        if (category !== StorageCategory.IN_BRANCH && normalizedBranchId) {
            return { success: false, error: 'Esta categoría de bodega no puede asociarse a una sucursal' };
        }
        
        // Verificar código único si se proporciona
        if (data.code) {
            const existing = await repo.findOne({ 
                where: { code: data.code, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El código ya está en uso' };
            }
        }
        
        // Si es default, quitar default de otros en la misma sucursal
        if (data.isDefault && category === StorageCategory.IN_BRANCH && normalizedBranchId) {
            await repo.update(
                { branchId: normalizedBranchId, isDefault: true },
                { isDefault: false }
            );
        }
        
        const storage = repo.create({
            branchId: normalizedBranchId ?? undefined,
            name: data.name,
            code: data.code,
            type: data.type ?? StorageType.WAREHOUSE,
            category,
            capacity: data.capacity,
            location: data.location,
            isDefault: data.isDefault ?? false,
            isActive: true
        });
        
        await repo.save(storage);
        revalidatePath('/admin/settings/storages');
        
        return { success: true, storage: JSON.parse(JSON.stringify(storage)) };
    } catch (error) {
        console.error('Error creating storage:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el almacén' 
        };
    }
}

/**
 * Actualiza un almacén
 */
export async function updateStorage(id: string, data: UpdateStorageDTO): Promise<StorageResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Storage);
        
        const storage = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!storage) {
            return { success: false, error: 'Almacén no encontrado' };
        }
        
        // Verificar código único si se cambia
        if (data.code && data.code !== storage.code) {
            const existing = await repo.findOne({ 
                where: { code: data.code, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El código ya está en uso' };
            }
        }
        
        // Si es default, quitar default de otros en la misma sucursal
        if (data.isDefault && !storage.isDefault && storage.branchId) {
            await repo.update(
                { branchId: storage.branchId, isDefault: true },
                { isDefault: false }
            );
        }
        
        if (data.category !== undefined) {
            storage.category = data.category;
        }

        if (data.branchId !== undefined) {
            storage.branchId = data.branchId ?? null;
        }

        if (data.name !== undefined) storage.name = data.name;
        if (data.code !== undefined) storage.code = data.code;
        if (data.type !== undefined) storage.type = data.type;
        if (data.capacity !== undefined) storage.capacity = data.capacity;
        if (data.location !== undefined) storage.location = data.location;
        if (data.isDefault !== undefined) storage.isDefault = data.isDefault;
        if (data.isActive !== undefined) storage.isActive = data.isActive;
        
        const category = storage.category;
        const branchId = storage.branchId ?? null;

        if (category === StorageCategory.IN_BRANCH && !branchId) {
            return { success: false, error: 'Las bodegas de sucursal deben asociarse a una sucursal' };
        }

        if (category !== StorageCategory.IN_BRANCH && branchId) {
            return { success: false, error: 'Esta categoría de bodega no puede asociarse a una sucursal' };
        }

        if (data.isDefault && category === StorageCategory.IN_BRANCH && branchId) {
            await repo.update(
                { branchId, isDefault: true, id: Not(storage.id) },
                { isDefault: false }
            );
        }

        await repo.save(storage);
        revalidatePath('/admin/settings/storages');
        
        return { success: true, storage: JSON.parse(JSON.stringify(storage)) };
    } catch (error) {
        console.error('Error updating storage:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el almacén' 
        };
    }
}

/**
 * Elimina (soft delete) un almacén
 */
export async function deleteStorage(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Storage);
        
        const storage = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!storage) {
            return { success: false, error: 'Almacén no encontrado' };
        }
        
        // TODO: Verificar que no tenga stock ni transacciones
        
        await repo.softDelete(id);
        revalidatePath('/admin/settings/storages');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting storage:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el almacén' 
        };
    }
}
