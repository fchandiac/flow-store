'use server'

import { getDb } from '@/data/db';
import { PriceList, PriceListType } from '@/data/entities/PriceList';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { Product } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetPriceListsParams {
    search?: string;
    type?: PriceListType;
    isActive?: boolean;
}

interface CreatePriceListDTO {
    name: string;
    description?: string;
    type: PriceListType;
    currency?: string;
    startDate?: Date;
    endDate?: Date;
    priority?: number;
}

interface UpdatePriceListDTO {
    name?: string;
    description?: string;
    type?: PriceListType;
    currency?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    priority?: number;
    isActive?: boolean;
}

interface PriceListResult {
    success: boolean;
    priceList?: PriceList;
    error?: string;
}

interface CreatePriceListItemDTO {
    priceListId: string;
    productId?: string;
    productVariantId?: string;
    price: number;
    minQuantity?: number;
    maxQuantity?: number;
}

interface UpdatePriceListItemDTO {
    price?: number;
    minQuantity?: number;
    maxQuantity?: number | null;
    isActive?: boolean;
}

interface PriceListItemResult {
    success: boolean;
    item?: PriceListItem;
    error?: string;
}

// ==================== PRICE LIST ACTIONS ====================

/**
 * Obtiene todas las listas de precios
 */
export async function getPriceLists(params?: GetPriceListsParams): Promise<PriceList[]> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceList);
    
    const queryBuilder = repo.createQueryBuilder('priceList')
        .where('priceList.deletedAt IS NULL');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(priceList.name LIKE :search OR priceList.description LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.type) {
        queryBuilder.andWhere('priceList.type = :type', { type: params.type });
    }
    
    if (params?.isActive !== undefined) {
        queryBuilder.andWhere('priceList.isActive = :isActive', { isActive: params.isActive });
    }
    
    queryBuilder.orderBy('priceList.priority', 'DESC').addOrderBy('priceList.name', 'ASC');
    
    return queryBuilder.getMany();
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
        .andWhere('(priceList.startDate IS NULL OR priceList.startDate <= :now)', { now })
        .andWhere('(priceList.endDate IS NULL OR priceList.endDate >= :now)', { now })
        .orderBy('priceList.priority', 'DESC')
        .getMany();
}

/**
 * Obtiene una lista de precios por ID con sus items
 */
export async function getPriceListById(id: string): Promise<(PriceList & { items: PriceListItem[] }) | null> {
    const ds = await getDb();
    const priceListRepo = ds.getRepository(PriceList);
    const itemRepo = ds.getRepository(PriceListItem);
    
    const priceList = await priceListRepo.findOne({
        where: { id, deletedAt: IsNull() }
    });
    
    if (!priceList) return null;
    
    const items = await itemRepo.find({
        where: { priceListId: id, deletedAt: IsNull() },
        relations: ['product', 'productVariant']
    });
    
    return { ...priceList, items } as any;
}

/**
 * Crea una nueva lista de precios
 */
export async function createPriceList(data: CreatePriceListDTO): Promise<PriceListResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceList);
        
        // Validaciones
        if (!data.name?.trim()) {
            return { success: false, error: 'El nombre es requerido' };
        }
        
        // Verificar nombre único
        const existing = await repo.findOne({
            where: { name: data.name, deletedAt: IsNull() }
        });
        if (existing) {
            return { success: false, error: 'Ya existe una lista de precios con ese nombre' };
        }
        
        // Validar fechas
        if (data.startDate && data.endDate && data.startDate > data.endDate) {
            return { success: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin' };
        }
        
        const priceList = repo.create({
            name: data.name.trim(),
            description: data.description,
            type: data.type,
            currency: data.currency ?? 'CLP',
            startDate: data.startDate,
            endDate: data.endDate,
            priority: data.priority ?? 0,
            isActive: true
        });
        
        await repo.save(priceList);
        revalidatePath('/admin/price-lists');
        
        return { success: true, priceList };
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
        
        // Verificar nombre único si se cambia
        if (data.name && data.name !== priceList.name) {
            const existing = await repo.findOne({ 
                where: { name: data.name, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'Ya existe una lista de precios con ese nombre' };
            }
        }
        
        // Validar fechas
        const startDate = data.startDate !== undefined ? data.startDate : priceList.startDate;
        const endDate = data.endDate !== undefined ? data.endDate : priceList.endDate;
        if (startDate && endDate && startDate > endDate) {
            return { success: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin' };
        }
        
        // Aplicar cambios
        if (data.name !== undefined) priceList.name = data.name.trim();
        if (data.description !== undefined) priceList.description = data.description;
        if (data.type !== undefined) priceList.type = data.type;
        if (data.currency !== undefined) priceList.currency = data.currency;
        if (data.startDate !== undefined) priceList.startDate = data.startDate;
        if (data.endDate !== undefined) priceList.endDate = data.endDate;
        if (data.priority !== undefined) priceList.priority = data.priority;
        if (data.isActive !== undefined) priceList.isActive = data.isActive;
        
        await repo.save(priceList);
        revalidatePath('/admin/price-lists');
        
        return { success: true, priceList };
    } catch (error) {
        console.error('Error updating price list:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar la lista de precios' 
        };
    }
}

/**
 * Elimina (soft delete) una lista de precios
 */
export async function deletePriceList(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const priceListRepo = ds.getRepository(PriceList);
        const itemRepo = ds.getRepository(PriceListItem);
        
        const priceList = await priceListRepo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!priceList) {
            return { success: false, error: 'Lista de precios no encontrada' };
        }
        
        // Soft delete de items asociados
        await itemRepo.softDelete({ priceListId: id });
        
        await priceListRepo.softDelete(id);
        revalidatePath('/admin/price-lists');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting price list:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar la lista de precios' 
        };
    }
}

// ==================== PRICE LIST ITEM ACTIONS ====================

/**
 * Obtiene items de una lista de precios
 */
export async function getPriceListItems(priceListId: string): Promise<PriceListItem[]> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceListItem);
    
    return repo.find({
        where: { priceListId, deletedAt: IsNull() },
        relations: ['product', 'productVariant'],
        order: { createdAt: 'ASC' }
    });
}

/**
 * Obtiene el precio de un producto en una lista
 */
export async function getProductPrice(
    productId: string,
    priceListId: string,
    quantity: number = 1
): Promise<number | null> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceListItem);
    const productRepo = ds.getRepository(Product);
    
    // Buscar en la lista de precios
    const item = await repo.createQueryBuilder('item')
        .where('item.priceListId = :priceListId', { priceListId })
        .andWhere('item.productId = :productId', { productId })
        .andWhere('item.isActive = true')
        .andWhere('item.deletedAt IS NULL')
        .andWhere('(item.minQuantity IS NULL OR item.minQuantity <= :quantity)', { quantity })
        .andWhere('(item.maxQuantity IS NULL OR item.maxQuantity >= :quantity)', { quantity })
        .orderBy('item.minQuantity', 'DESC')
        .getOne();
    
    if (item) return Number(item.price);
    
    // Fallback al precio base del producto
    const product = await productRepo.findOne({
        where: { id: productId, deletedAt: IsNull() }
    });
    
    return product ? Number(product.salePrice) : null;
}

/**
 * Obtiene el precio de una variante en una lista
 */
export async function getVariantPrice(
    variantId: string,
    priceListId: string,
    quantity: number = 1
): Promise<number | null> {
    const ds = await getDb();
    const repo = ds.getRepository(PriceListItem);
    const variantRepo = ds.getRepository(ProductVariant);
    
    // Buscar en la lista de precios
    const item = await repo.createQueryBuilder('item')
        .where('item.priceListId = :priceListId', { priceListId })
        .andWhere('item.productVariantId = :variantId', { variantId })
        .andWhere('item.isActive = true')
        .andWhere('item.deletedAt IS NULL')
        .andWhere('(item.minQuantity IS NULL OR item.minQuantity <= :quantity)', { quantity })
        .andWhere('(item.maxQuantity IS NULL OR item.maxQuantity >= :quantity)', { quantity })
        .orderBy('item.minQuantity', 'DESC')
        .getOne();
    
    if (item) return Number(item.price);
    
    // Fallback al precio base de la variante
    const variant = await variantRepo.findOne({
        where: { id: variantId, deletedAt: IsNull() }
    });
    
    return variant ? Number(variant.salePrice) : null;
}

/**
 * Agrega un item a una lista de precios
 */
export async function addPriceListItem(data: CreatePriceListItemDTO): Promise<PriceListItemResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceListItem);
        const priceListRepo = ds.getRepository(PriceList);
        const productRepo = ds.getRepository(Product);
        const variantRepo = ds.getRepository(ProductVariant);
        
        // Validaciones
        if (data.price < 0) {
            return { success: false, error: 'El precio no puede ser negativo' };
        }
        
        if (!data.productId && !data.productVariantId) {
            return { success: false, error: 'Se requiere un producto o variante' };
        }
        
        // Verificar que la lista existe
        const priceList = await priceListRepo.findOne({
            where: { id: data.priceListId, deletedAt: IsNull() }
        });
        if (!priceList) {
            return { success: false, error: 'Lista de precios no encontrada' };
        }
        
        // Verificar producto o variante
        if (data.productId) {
            const product = await productRepo.findOne({
                where: { id: data.productId, deletedAt: IsNull() }
            });
            if (!product) {
                return { success: false, error: 'Producto no encontrado' };
            }
        }
        
        if (data.productVariantId) {
            const variant = await variantRepo.findOne({
                where: { id: data.productVariantId, deletedAt: IsNull() }
            });
            if (!variant) {
                return { success: false, error: 'Variante no encontrada' };
            }
        }
        
        // Verificar si ya existe un item con el mismo rango de cantidad
        const existingQuery = repo.createQueryBuilder('item')
            .where('item.priceListId = :priceListId', { priceListId: data.priceListId })
            .andWhere('item.deletedAt IS NULL');
        
        if (data.productId) {
            existingQuery.andWhere('item.productId = :productId', { productId: data.productId });
        }
        if (data.productVariantId) {
            existingQuery.andWhere('item.productVariantId = :variantId', { variantId: data.productVariantId });
        }
        
        // Verificar overlapping de cantidades
        const minQty = data.minQuantity ?? 1;
        const maxQty = data.maxQuantity;
        
        existingQuery.andWhere(
            '((item.minQuantity IS NULL OR item.minQuantity <= :maxQty) AND (item.maxQuantity IS NULL OR item.maxQuantity >= :minQty))',
            { minQty, maxQty: maxQty ?? 999999999 }
        );
        
        const existing = await existingQuery.getOne();
        if (existing) {
            return { success: false, error: 'Ya existe un precio para este rango de cantidad' };
        }
        
        const item = repo.create({
            priceListId: data.priceListId,
            productId: data.productId,
            productVariantId: data.productVariantId,
            price: data.price,
            minQuantity: data.minQuantity ?? 1,
            maxQuantity: data.maxQuantity,
            isActive: true
        });
        
        await repo.save(item);
        revalidatePath('/admin/price-lists');
        
        return { success: true, item };
    } catch (error) {
        console.error('Error adding price list item:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al agregar item' 
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
        
        if (data.price !== undefined && data.price < 0) {
            return { success: false, error: 'El precio no puede ser negativo' };
        }
        
        if (data.price !== undefined) item.price = data.price;
        if (data.minQuantity !== undefined) item.minQuantity = data.minQuantity;
        if (data.maxQuantity !== undefined) item.maxQuantity = data.maxQuantity;
        if (data.isActive !== undefined) item.isActive = data.isActive;
        
        await repo.save(item);
        revalidatePath('/admin/price-lists');
        
        return { success: true, item };
    } catch (error) {
        console.error('Error updating price list item:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar item' 
        };
    }
}

/**
 * Elimina un item de lista de precios
 */
export async function deletePriceListItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(PriceListItem);
        
        await repo.softDelete(id);
        revalidatePath('/admin/price-lists');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting price list item:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar item' 
        };
    }
}
