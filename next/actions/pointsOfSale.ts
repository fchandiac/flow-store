'use server'

import { getDb } from '@/data/db';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { CashSession } from '@/data/entities/CashSession';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetPointsOfSaleParams {
    branchId?: string;
    includeInactive?: boolean;
}

interface CreatePointOfSaleDTO {
    branchId: string;
    name: string;
    deviceId?: string;
}

interface UpdatePointOfSaleDTO {
    name?: string;
    deviceId?: string;
    isActive?: boolean;
}

interface PointOfSaleResult {
    success: boolean;
    pointOfSale?: PointOfSale;
    error?: string;
}

/**
 * Obtiene puntos de venta con filtros
 */
export async function getPointsOfSale(params?: GetPointsOfSaleParams): Promise<PointOfSale[]> {
    const ds = await getDb();
    const repo = ds.getRepository(PointOfSale);
    
    const queryBuilder = repo.createQueryBuilder('pos')
        .leftJoinAndSelect('pos.branch', 'branch')
        .where('pos.deletedAt IS NULL');
    
    if (params?.branchId) {
        queryBuilder.andWhere('pos.branchId = :branchId', { branchId: params.branchId });
    }
    
    if (!params?.includeInactive) {
        queryBuilder.andWhere('pos.isActive = :isActive', { isActive: true });
    }
    
    queryBuilder.orderBy('pos.name', 'ASC');
    
    return queryBuilder.getMany();
}

/**
 * Obtiene un punto de venta por ID
 */
export async function getPointOfSaleById(id: string): Promise<PointOfSale | null> {
    const ds = await getDb();
    const repo = ds.getRepository(PointOfSale);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['branch']
    });
}

/**
 * Obtiene un punto de venta con su sesión activa
 */
export async function getPointOfSaleWithActiveSession(id: string): Promise<{
    pointOfSale: PointOfSale | null;
    activeSession: CashSession | null;
}> {
    const ds = await getDb();
    const posRepo = ds.getRepository(PointOfSale);
    const sessionRepo = ds.getRepository(CashSession);
    
    const pointOfSale = await posRepo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['branch']
    });
    
    if (!pointOfSale) {
        return { pointOfSale: null, activeSession: null };
    }
    
    const activeSession = await sessionRepo.findOne({
        where: { 
            pointOfSaleId: id, 
            status: 'OPEN' as any
        },
        relations: ['openedBy']
    });
    
    return { pointOfSale, activeSession };
}

/**
 * Crea un nuevo punto de venta
 */
export async function createPointOfSale(data: CreatePointOfSaleDTO): Promise<PointOfSaleResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PointOfSale);
        
        const pointOfSale = repo.create({
            branchId: data.branchId,
            name: data.name,
            deviceId: data.deviceId,
            isActive: true
        });
        
        await repo.save(pointOfSale);
        revalidatePath('/admin/settings/points-of-sale');
        
        return { success: true, pointOfSale: JSON.parse(JSON.stringify(pointOfSale)) };
    } catch (error) {
        console.error('Error creating point of sale:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el punto de venta' 
        };
    }
}

/**
 * Actualiza un punto de venta
 */
export async function updatePointOfSale(id: string, data: UpdatePointOfSaleDTO): Promise<PointOfSaleResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PointOfSale);
        
        const pointOfSale = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!pointOfSale) {
            return { success: false, error: 'Punto de venta no encontrado' };
        }
        
        if (data.name !== undefined) pointOfSale.name = data.name;
        if (data.deviceId !== undefined) pointOfSale.deviceId = data.deviceId;
        if (data.isActive !== undefined) pointOfSale.isActive = data.isActive;
        
        await repo.save(pointOfSale);
        revalidatePath('/admin/settings/points-of-sale');
        
        return { success: true, pointOfSale: JSON.parse(JSON.stringify(pointOfSale)) };
    } catch (error) {
        console.error('Error updating point of sale:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el punto de venta' 
        };
    }
}

/**
 * Elimina (soft delete) un punto de venta
 */
export async function deletePointOfSale(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PointOfSale);
        const sessionRepo = ds.getRepository(CashSession);
        
        const pointOfSale = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!pointOfSale) {
            return { success: false, error: 'Punto de venta no encontrado' };
        }
        
        // Verificar que no tenga sesiones abiertas
        const openSession = await sessionRepo.findOne({
            where: { pointOfSaleId: id, status: 'OPEN' as any }
        });
        
        if (openSession) {
            return { success: false, error: 'No se puede eliminar: tiene una sesión de caja abierta' };
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/settings/points-of-sale');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting point of sale:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el punto de venta' 
        };
    }
}
