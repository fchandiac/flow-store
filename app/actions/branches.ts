'use server'

import { getDb } from '@/data/db';
import { Branch } from '@/data/entities/Branch';
import { Storage } from '@/data/entities/Storage';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { getCompany } from './companies';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetBranchesParams {
    includeInactive?: boolean;
}

interface CreateBranchDTO {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    isHeadquarters?: boolean;
}

interface UpdateBranchDTO {
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
    isActive?: boolean;
    isHeadquarters?: boolean;
}

interface BranchResult {
    success: boolean;
    branch?: Branch;
    error?: string;
}

/**
 * Obtiene todas las sucursales
 */
export async function getBranches(params?: GetBranchesParams): Promise<Branch[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Branch);
    
    const queryBuilder = repo.createQueryBuilder('branch')
        .leftJoinAndSelect('branch.company', 'company')
        .where('branch.deletedAt IS NULL');
    
    if (!params?.includeInactive) {
        queryBuilder.andWhere('branch.isActive = :isActive', { isActive: true });
    }
    
    queryBuilder.orderBy('branch.isHeadquarters', 'DESC')
        .addOrderBy('branch.name', 'ASC');
    
    return queryBuilder.getMany();
}

/**
 * Obtiene una sucursal por ID
 */
export async function getBranchById(id: string): Promise<Branch | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Branch);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['company', 'storages', 'pointsOfSale']
    });
}

/**
 * Crea una nueva sucursal
 */
export async function createBranch(data: CreateBranchDTO): Promise<BranchResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Branch);
        
        // Obtener compañía
        const company = await getCompany();
        if (!company) {
            return { success: false, error: 'Compañía no configurada' };
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
        
        const branch = repo.create({
            companyId: company.id,
            name: data.name,
            code: data.code,
            address: data.address,
            phone: data.phone,
            isHeadquarters: data.isHeadquarters ?? false,
            isActive: true
        });
        
        await repo.save(branch);
        revalidatePath('/admin/branches');
        
        return { success: true, branch };
    } catch (error) {
        console.error('Error creating branch:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear la sucursal' 
        };
    }
}

/**
 * Actualiza una sucursal
 */
export async function updateBranch(id: string, data: UpdateBranchDTO): Promise<BranchResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Branch);
        
        const branch = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!branch) {
            return { success: false, error: 'Sucursal no encontrada' };
        }
        
        // Verificar código único si se cambia
        if (data.code && data.code !== branch.code) {
            const existing = await repo.findOne({ 
                where: { code: data.code, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El código ya está en uso' };
            }
        }
        
        if (data.name !== undefined) branch.name = data.name;
        if (data.code !== undefined) branch.code = data.code;
        if (data.address !== undefined) branch.address = data.address;
        if (data.phone !== undefined) branch.phone = data.phone;
        if (data.isActive !== undefined) branch.isActive = data.isActive;
        if (data.isHeadquarters !== undefined) branch.isHeadquarters = data.isHeadquarters;
        
        await repo.save(branch);
        revalidatePath('/admin/branches');
        
        return { success: true, branch };
    } catch (error) {
        console.error('Error updating branch:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar la sucursal' 
        };
    }
}

/**
 * Elimina (soft delete) una sucursal
 */
export async function deleteBranch(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Branch);
        
        const branch = await repo.findOne({ 
            where: { id, deletedAt: IsNull() },
            relations: ['storages', 'pointsOfSale']
        });
        
        if (!branch) {
            return { success: false, error: 'Sucursal no encontrada' };
        }
        
        // Verificar que no tenga dependencias activas
        if (branch.storages && branch.storages.length > 0) {
            return { success: false, error: 'No se puede eliminar: tiene almacenes asociados' };
        }
        
        if (branch.pointsOfSale && branch.pointsOfSale.length > 0) {
            return { success: false, error: 'No se puede eliminar: tiene puntos de venta asociados' };
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/branches');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting branch:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar la sucursal' 
        };
    }
}

/**
 * Obtiene los almacenes de una sucursal
 */
export async function getBranchStorages(branchId: string): Promise<Storage[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Storage);
    
    return repo.find({
        where: { branchId, deletedAt: IsNull(), isActive: true },
        order: { isDefault: 'DESC', name: 'ASC' }
    });
}

/**
 * Obtiene los puntos de venta de una sucursal
 */
export async function getBranchPointsOfSale(branchId: string): Promise<PointOfSale[]> {
    const ds = await getDb();
    const repo = ds.getRepository(PointOfSale);
    
    return repo.find({
        where: { branchId, deletedAt: IsNull(), isActive: true },
        order: { name: 'ASC' }
    });
}
