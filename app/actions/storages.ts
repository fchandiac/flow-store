'use server'

import { getDb } from '@/data/db';
import { Storage, StorageType } from '@/data/entities/Storage';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetStoragesParams {
    branchId?: string;
    type?: StorageType;
    includeInactive?: boolean;
}

interface CreateStorageDTO {
    branchId: string;
    name: string;
    code?: string;
    type?: StorageType;
    capacity?: number;
    location?: string;
    isDefault?: boolean;
}

interface UpdateStorageDTO {
    name?: string;
    code?: string;
    type?: StorageType;
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
    
    if (!params?.includeInactive) {
        queryBuilder.andWhere('storage.isActive = :isActive', { isActive: true });
    }
    
    queryBuilder.orderBy('storage.isDefault', 'DESC')
        .addOrderBy('storage.name', 'ASC');
    
    return queryBuilder.getMany();
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
        if (data.isDefault) {
            await repo.update(
                { branchId: data.branchId, isDefault: true },
                { isDefault: false }
            );
        }
        
        const storage = repo.create({
            branchId: data.branchId,
            name: data.name,
            code: data.code,
            type: data.type ?? StorageType.WAREHOUSE,
            capacity: data.capacity,
            location: data.location,
            isDefault: data.isDefault ?? false,
            isActive: true
        });
        
        await repo.save(storage);
        revalidatePath('/admin/storages');
        
        return { success: true, storage };
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
        if (data.isDefault && !storage.isDefault) {
            await repo.update(
                { branchId: storage.branchId, isDefault: true },
                { isDefault: false }
            );
        }
        
        if (data.name !== undefined) storage.name = data.name;
        if (data.code !== undefined) storage.code = data.code;
        if (data.type !== undefined) storage.type = data.type;
        if (data.capacity !== undefined) storage.capacity = data.capacity;
        if (data.location !== undefined) storage.location = data.location;
        if (data.isDefault !== undefined) storage.isDefault = data.isDefault;
        if (data.isActive !== undefined) storage.isActive = data.isActive;
        
        await repo.save(storage);
        revalidatePath('/admin/storages');
        
        return { success: true, storage };
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
        revalidatePath('/admin/storages');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting storage:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el almacén' 
        };
    }
}
