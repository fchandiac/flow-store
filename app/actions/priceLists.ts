'use server'

import { getDb } from '@/data/db';
import { PriceList, PriceListType } from '@/data/entities/PriceList';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { Product } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { revalidatePath } from 'next/cache';
import { IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

// Types
interface CreatePriceListDTO {
    name: string;
    priceListType?: PriceListType;
    validFrom?: Date;
    validUntil?: Date;
    priority?: number;
    isDefault?: boolean;
    description?: string;
}

interface UpdatePriceListDTO {
    name?: string;
    priceListType?: PriceListType;
    validFrom?: Date;
    validUntil?: Date;
    priority?: number;
    isDefault?: boolean;
    isActive?: boolean;
    description?: string;
}

interface CreatePriceListItemDTO {
    priceListId: string;
    productId: string;
    productVariantId?: string;
    price: number;
    minPrice?: number;
    discountPercentage?: number;
}

interface UpdatePriceListItemDTO {
    price?: number;
    minPrice?: number;
    discountPercentage?: number;
}

interface PriceListResult {
    success: boolean;
    priceList?: PriceList;
    error?: string;
}

interface PriceListItemResult {
    success: boolean;
    item?: PriceListItem;
    error?: string;
}

/**
 * Obtiene todas las listas de precios
 */
export async function getPriceLists(activeOnly: boolean = false): Promise<PriceList[]> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceList);
    
    const where: any = { deletedAt: IsNull() };
    if (activeOnly) {
        where.isActive = true;
    }
    
    return repo.find({
        where,
        order: { priority: 'DESC', name: 'ASC' }
    });
}

/**
 * Obtiene una lista de precios por ID
 */
export async function getPriceListById(id: string): Promise<PriceList | null> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceList);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['items', 'items.product']
    });
}

/**
 * Obtiene la lista de precios predeterminada
 */
export async function getDefaultPriceList(): Promise<PriceList | null> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceList);
    
    return repo.findOne({
        where: { isDefault: true, isActive: true, deletedAt: IsNull() }
    });
}

/**
 * Obtiene listas de precios activas y vigentes
 */
export async function getActivePriceLists(): Promise<PriceList[]> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceList);
    const now = new Date();
    
    return repo.createQueryBuilder('priceList')
        .where('priceList.deletedAt IS NULL')
        .andWhere('priceList.isActive = true')
        .andWhere('(priceList.validFrom IS NULL OR priceList.validFrom <= :now)', { now })
        .andWhere('(priceList.validUntil IS NULL OR priceList.validUntil >= :now)', { now })
        .orderBy('priceList.priority', 'DESC')
        .getMany();
}

/**
 * Crea una nueva lista de precios
 */
export async function createPriceList(data: CreatePriceListDTO): Promise<PriceListResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceList);
        
        // Si es default, quitar default de otras listas
        if (data.isDefault) {
            await repo.createQueryBuilder()
                .update(PriceList)
                .set({ isDefault: false })
                .where('isDefault = true')
                .execute();
        }
        
        const priceList = repo.create({
            name: data.name,
            priceListType: data.priceListType || PriceListType.RETAIL,
            currency: 'CLP',
            validFrom: data.validFrom,
            validUntil: data.validUntil,
            priority: data.priority || 0,
            isDefault: data.isDefault || false,
            isActive: true,
            description: data.description
        });
        
        const savedPriceList = await repo.save(priceList);
        revalidatePath('/admin/settings/price-lists');
        
        return { success: true, priceList: JSON.parse(JSON.stringify(savedPriceList)) };
    } catch (error) {
        console.error('Error creating price list:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear la lista de precios' 
        };
    }
}

/**
 * Actualiza una lista de precios
 */
export async function updatePriceList(id: string, data: UpdatePriceListDTO): Promise<PriceListResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceList);
        
        const priceList = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!priceList) {
            return { success: false, error: 'Lista de precios no encontrada' };
        }
        
        // Si es default, quitar default de otras listas
        if (data.isDefault && !priceList.isDefault) {
            await repo.createQueryBuilder()
                .update(PriceList)
                .set({ isDefault: false })
                .where('isDefault = true AND id != :id', { id })
                .execute();
        }
        
        // Actualizar campos
        if (data.name !== undefined) priceList.name = data.name;
        if (data.priceListType !== undefined) priceList.priceListType = data.priceListType;
        if (data.validFrom !== undefined) priceList.validFrom = data.validFrom;
        if (data.validUntil !== undefined) priceList.validUntil = data.validUntil;
        if (data.priority !== undefined) priceList.priority = data.priority;
        if (data.isDefault !== undefined) priceList.isDefault = data.isDefault;
        if (data.isActive !== undefined) priceList.isActive = data.isActive;
        if (data.description !== undefined) priceList.description = data.description;
        
        const savedPriceList = await repo.save(priceList);
        revalidatePath('/admin/settings/price-lists');
        
        return { success: true, priceList: JSON.parse(JSON.stringify(savedPriceList)) };
    } catch (error) {
        console.error('Error updating price list:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar la lista de precios' 
        };
    }
}

/**
 * Elimina una lista de precios (soft delete)
 */
export async function deletePriceList(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceList);
        
        const priceList = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!priceList) {
            return { success: false, error: 'Lista de precios no encontrada' };
        }
        
        if (priceList.isDefault) {
            return { success: false, error: 'No se puede eliminar la lista de precios predeterminada' };
        }
        
        await repo.softRemove(priceList);
        revalidatePath('/admin/settings/price-lists');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting price list:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar la lista de precios' 
        };
    }
}

// === PRICE LIST ITEMS ===

/**
 * Obtiene los items de una lista de precios
 */
export async function getPriceListItems(priceListId: string): Promise<PriceListItem[]> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceListItem);
    
    return repo.find({
        where: { priceListId, deletedAt: IsNull() },
        relations: ['product', 'productVariant'],
        order: { createdAt: 'DESC' }
    });
}

/**
 * Obtiene el precio de un producto en una lista de precios
 */
export async function getProductPrice(
    productId: string, 
    priceListId?: string,
    productVariantId?: string
): Promise<number | null> {
    const ds = await getDb();
    const itemRepo = ds.getRepository(PriceListItem);
    const productRepo = ds.getRepository(Product);
    
    // Si se especifica una lista de precios
    if (priceListId) {
        const item = await itemRepo.findOne({
            where: { 
                priceListId, 
                productId, 
                productVariantId: productVariantId || IsNull(),
                deletedAt: IsNull() 
            }
        });
        
        if (item) {
            return item.price;
        }
    }
    
    // Buscar en lista predeterminada
    const defaultList = await getDefaultPriceList();
    if (defaultList) {
        const item = await itemRepo.findOne({
            where: { 
                priceListId: defaultList.id, 
                productId, 
                productVariantId: productVariantId || IsNull(),
                deletedAt: IsNull() 
            }
        });
        
        if (item) {
            return item.price;
        }
    }
    
    // Fallback: usar precio base de la variante default del producto
    const variantRepo = ds.getRepository(ProductVariant);
    const defaultVariant = await variantRepo.findOne({
        where: { productId, isDefault: true, deletedAt: IsNull() }
    });
    
    if (defaultVariant) {
        return Number(defaultVariant.basePrice);
    }
    
    // Si no hay variante default, buscar cualquier variante
    const anyVariant = await variantRepo.findOne({
        where: { productId, deletedAt: IsNull() }
    });
    
    return anyVariant ? Number(anyVariant.basePrice) : null;
}

/**
 * Crea un item en una lista de precios
 */
export async function createPriceListItem(data: CreatePriceListItemDTO): Promise<PriceListItemResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceListItem);
        
        // Verificar que no exista ya el item
        const existing = await repo.findOne({
            where: { 
                priceListId: data.priceListId, 
                productId: data.productId,
                productVariantId: data.productVariantId || IsNull(),
                deletedAt: IsNull() 
            }
        });
        
        if (existing) {
            return { success: false, error: 'El producto ya existe en esta lista de precios' };
        }
        
        const item = repo.create({
            priceListId: data.priceListId,
            productId: data.productId,
            productVariantId: data.productVariantId,
            price: data.price,
            minPrice: data.minPrice,
            discountPercentage: data.discountPercentage || 0
        });
        
        await repo.save(item);
        revalidatePath('/admin/products');
        
        return { success: true, item };
    } catch (error) {
        console.error('Error creating price list item:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al agregar el producto a la lista' 
        };
    }
}

/**
 * Actualiza un item de lista de precios
 */
export async function updatePriceListItem(id: string, data: UpdatePriceListItemDTO): Promise<PriceListItemResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceListItem);
        
        const item = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!item) {
            return { success: false, error: 'Item no encontrado' };
        }
        
        if (data.price !== undefined) item.price = data.price;
        if (data.minPrice !== undefined) item.minPrice = data.minPrice;
        if (data.discountPercentage !== undefined) item.discountPercentage = data.discountPercentage;
        
        await repo.save(item);
        revalidatePath('/admin/products');
        
        return { success: true, item };
    } catch (error) {
        console.error('Error updating price list item:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el item' 
        };
    }
}

/**
 * Elimina un item de lista de precios (soft delete)
 */
export async function deletePriceListItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceListItem);
        
        const item = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!item) {
            return { success: false, error: 'Item no encontrado' };
        }
        
        await repo.softRemove(item);
        revalidatePath('/admin/products');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting price list item:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el item' 
        };
    }
}
