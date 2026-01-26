'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { GoldPrice } from '@/data/entities/GoldPrice';
import { In, IsNull } from 'typeorm';

export interface GoldPriceDTO {
    id?: string;
    date: string;
    valueCLP: number;
    notes?: string;
}

export interface GoldPriceActionResult {
    success: boolean;
    error?: string;
}

/**
 * Obtiene el listado histórico de los precios del oro
 */
export async function getGoldPrices(): Promise<GoldPrice[]> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(GoldPrice);
        
        const prices = await repo.find({
            where: { deletedAt: IsNull() },
            order: { date: 'DESC' }
        });
        
        return JSON.parse(JSON.stringify(prices));
    } catch (error) {
        console.error('Error fetching gold prices:', error);
        return [];
    }
}

/**
 * Crea o actualiza un registro de precio de oro
 */
export async function saveGoldPrice(data: GoldPriceDTO): Promise<GoldPriceActionResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(GoldPrice);
        
        if (data.id) {
            await repo.update(data.id, {
                date: new Date(data.date),
                valueCLP: data.valueCLP,
                notes: data.notes
            });
        } else {
            const newPrice = repo.create({
                date: new Date(data.date),
                valueCLP: data.valueCLP,
                notes: data.notes
            });
            await repo.save(newPrice);
        }
        
        revalidatePath('/admin/settings/gold-price');
        return { success: true };
    } catch (error: any) {
        console.error('Error saving gold price:', error);
        return { success: false, error: error.message || 'Error al guardar el precio del oro' };
    }
}

/**
 * Elimina un registro de precio de oro (Soft Delete)
 */
export async function deleteGoldPrice(id: string): Promise<GoldPriceActionResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(GoldPrice);
        
        await repo.softDelete(id);
        
        revalidatePath('/admin/settings/gold-price');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting gold price:', error);
        return { success: false, error: error.message || 'Error al eliminar el registro' };
    }
}
