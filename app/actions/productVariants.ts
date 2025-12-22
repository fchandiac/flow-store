'use server'

import { getDb } from '@/data/db';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Product } from '@/data/entities/Product';
import { revalidatePath } from 'next/cache';
import { IsNull, Like } from 'typeorm';

// Types
interface CreateVariantDTO {
    productId: string;
    name: string;
    sku?: string;
    barcode?: string;
    attributes?: Record<string, string>;
    costPrice?: number;
    salePrice: number;
    currentStock?: number;
    minStock?: number;
    maxStock?: number;
    imageUrl?: string;
    sortOrder?: number;
}

interface UpdateVariantDTO {
    name?: string;
    sku?: string;
    barcode?: string;
    attributes?: Record<string, string>;
    costPrice?: number;
    salePrice?: number;
    minStock?: number;
    maxStock?: number;
    imageUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
}

interface VariantResult {
    success: boolean;
    variant?: ProductVariant;
    error?: string;
}

/**
 * Obtiene variantes de un producto
 */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.find({
        where: { productId, deletedAt: IsNull() },
        order: { sortOrder: 'ASC', name: 'ASC' }
    });
}

/**
 * Obtiene variantes activas de un producto
 */
export async function getActiveProductVariants(productId: string): Promise<ProductVariant[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.find({
        where: { productId, isActive: true, deletedAt: IsNull() },
        order: { sortOrder: 'ASC', name: 'ASC' }
    });
}

/**
 * Obtiene una variante por ID
 */
export async function getVariantById(id: string): Promise<(ProductVariant & { product: Product }) | null> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['product']
    }) as Promise<(ProductVariant & { product: Product }) | null>;
}

/**
 * Obtiene una variante por SKU
 */
export async function getVariantBySku(sku: string): Promise<ProductVariant | null> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.findOne({
        where: { sku, deletedAt: IsNull() },
        relations: ['product']
    });
}

/**
 * Obtiene una variante por código de barras
 */
export async function getVariantByBarcode(barcode: string): Promise<ProductVariant | null> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.findOne({
        where: { barcode, deletedAt: IsNull() },
        relations: ['product']
    });
}

/**
 * Busca variantes por término (para autocompletado)
 */
export async function searchVariants(term: string, limit: number = 10): Promise<ProductVariant[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.find({
        where: [
            { name: Like(`%${term}%`), isActive: true, deletedAt: IsNull() },
            { sku: Like(`%${term}%`), isActive: true, deletedAt: IsNull() },
            { barcode: Like(`%${term}%`), isActive: true, deletedAt: IsNull() }
        ],
        relations: ['product'],
        take: limit,
        order: { name: 'ASC' }
    });
}

/**
 * Crea una nueva variante
 */
export async function createVariant(data: CreateVariantDTO): Promise<VariantResult> {
    try {
        const ds = await getDb();
        const variantRepo = ds.getRepository(ProductVariant);
        const productRepo = ds.getRepository(Product);
        
        // Validaciones
        if (!data.name?.trim()) {
            return { success: false, error: 'El nombre es requerido' };
        }
        
        if (data.salePrice < 0) {
            return { success: false, error: 'El precio de venta no puede ser negativo' };
        }
        
        // Verificar que el producto existe y tiene variantes habilitadas
        const product = await productRepo.findOne({
            where: { id: data.productId, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        if (!product.hasVariants) {
            return { success: false, error: 'Este producto no tiene variantes habilitadas' };
        }
        
        // Verificar SKU único si se proporciona
        if (data.sku) {
            const existingBySku = await variantRepo.findOne({
                where: { sku: data.sku, deletedAt: IsNull() }
            });
            if (existingBySku) {
                return { success: false, error: 'El SKU ya está en uso' };
            }
        }
        
        // Verificar código de barras único si se proporciona
        if (data.barcode) {
            const existingByBarcode = await variantRepo.findOne({
                where: { barcode: data.barcode, deletedAt: IsNull() }
            });
            if (existingByBarcode) {
                return { success: false, error: 'El código de barras ya está en uso' };
            }
        }
        
        // Calcular sortOrder si no se proporciona
        let sortOrder = data.sortOrder;
        if (sortOrder === undefined) {
            const lastVariant = await variantRepo.findOne({
                where: { productId: data.productId, deletedAt: IsNull() },
                order: { sortOrder: 'DESC' }
            });
            sortOrder = (lastVariant?.sortOrder ?? 0) + 1;
        }
        
        const variant = variantRepo.create({
            productId: data.productId,
            name: data.name.trim(),
            sku: data.sku,
            barcode: data.barcode,
            attributes: data.attributes ?? {},
            costPrice: data.costPrice ?? product.costPrice,
            salePrice: data.salePrice,
            currentStock: data.currentStock ?? 0,
            minStock: data.minStock ?? product.minStock,
            maxStock: data.maxStock ?? product.maxStock,
            imageUrl: data.imageUrl,
            sortOrder,
            isActive: true
        });
        
        await variantRepo.save(variant);
        revalidatePath('/admin/products');
        
        return { success: true, variant };
    } catch (error) {
        console.error('Error creating variant:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear la variante' 
        };
    }
}

/**
 * Crea múltiples variantes a la vez
 */
export async function createBulkVariants(
    productId: string,
    variants: Omit<CreateVariantDTO, 'productId'>[]
): Promise<{ success: boolean; variants?: ProductVariant[]; error?: string }> {
    try {
        const ds = await getDb();
        const variantRepo = ds.getRepository(ProductVariant);
        const productRepo = ds.getRepository(Product);
        
        // Verificar producto
        const product = await productRepo.findOne({
            where: { id: productId, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        if (!product.hasVariants) {
            return { success: false, error: 'Este producto no tiene variantes habilitadas' };
        }
        
        // Obtener último sortOrder
        const lastVariant = await variantRepo.findOne({
            where: { productId, deletedAt: IsNull() },
            order: { sortOrder: 'DESC' }
        });
        let nextSortOrder = (lastVariant?.sortOrder ?? 0) + 1;
        
        const createdVariants: ProductVariant[] = [];
        
        for (const variantData of variants) {
            // Verificar SKU único
            if (variantData.sku) {
                const existing = await variantRepo.findOne({
                    where: { sku: variantData.sku, deletedAt: IsNull() }
                });
                if (existing) {
                    continue; // Skip si SKU ya existe
                }
            }
            
            const variant = variantRepo.create({
                productId,
                name: variantData.name.trim(),
                sku: variantData.sku,
                barcode: variantData.barcode,
                attributes: variantData.attributes ?? {},
                costPrice: variantData.costPrice ?? product.costPrice,
                salePrice: variantData.salePrice,
                currentStock: variantData.currentStock ?? 0,
                minStock: variantData.minStock ?? product.minStock,
                maxStock: variantData.maxStock ?? product.maxStock,
                imageUrl: variantData.imageUrl,
                sortOrder: nextSortOrder++,
                isActive: true
            });
            
            await variantRepo.save(variant);
            createdVariants.push(variant);
        }
        
        revalidatePath('/admin/products');
        
        return { success: true, variants: createdVariants };
    } catch (error) {
        console.error('Error creating bulk variants:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear variantes' 
        };
    }
}

/**
 * Actualiza una variante
 */
export async function updateVariant(id: string, data: UpdateVariantDTO): Promise<VariantResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        
        const variant = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!variant) {
            return { success: false, error: 'Variante no encontrada' };
        }
        
        // Verificar SKU único si se cambia
        if (data.sku && data.sku !== variant.sku) {
            const existing = await repo.findOne({ 
                where: { sku: data.sku, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El SKU ya está en uso' };
            }
        }
        
        // Verificar código de barras único si se cambia
        if (data.barcode && data.barcode !== variant.barcode) {
            const existing = await repo.findOne({ 
                where: { barcode: data.barcode, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El código de barras ya está en uso' };
            }
        }
        
        // Aplicar cambios
        if (data.name !== undefined) variant.name = data.name.trim();
        if (data.sku !== undefined) variant.sku = data.sku;
        if (data.barcode !== undefined) variant.barcode = data.barcode;
        if (data.attributes !== undefined) variant.attributes = data.attributes;
        if (data.costPrice !== undefined) variant.costPrice = data.costPrice;
        if (data.salePrice !== undefined) variant.salePrice = data.salePrice;
        if (data.minStock !== undefined) variant.minStock = data.minStock;
        if (data.maxStock !== undefined) variant.maxStock = data.maxStock;
        if (data.imageUrl !== undefined) variant.imageUrl = data.imageUrl;
        if (data.sortOrder !== undefined) variant.sortOrder = data.sortOrder;
        if (data.isActive !== undefined) variant.isActive = data.isActive;
        
        await repo.save(variant);
        revalidatePath('/admin/products');
        
        return { success: true, variant };
    } catch (error) {
        console.error('Error updating variant:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar la variante' 
        };
    }
}

/**
 * Elimina (soft delete) una variante
 */
export async function deleteVariant(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        
        const variant = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!variant) {
            return { success: false, error: 'Variante no encontrada' };
        }
        
        await repo.softDelete(id);
        revalidatePath('/admin/products');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting variant:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar la variante' 
        };
    }
}

/**
 * Actualiza el stock de una variante
 */
export async function updateVariantStock(
    variantId: string,
    quantity: number,
    operation: 'set' | 'add' | 'subtract'
): Promise<{ success: boolean; newStock?: number; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        const productRepo = ds.getRepository(Product);
        
        const variant = await repo.findOne({ 
            where: { id: variantId },
            relations: ['product']
        });
        
        if (!variant) {
            return { success: false, error: 'Variante no encontrada' };
        }
        
        let newStock: number;
        const currentStock = Number(variant.currentStock) || 0;
        
        switch (operation) {
            case 'set':
                newStock = quantity;
                break;
            case 'add':
                newStock = currentStock + quantity;
                break;
            case 'subtract':
                newStock = currentStock - quantity;
                break;
        }
        
        // Verificar si el producto padre controla inventario
        const product = await productRepo.findOne({ where: { id: variant.productId } });
        if (newStock < 0 && product?.trackInventory) {
            return { success: false, error: 'Stock insuficiente' };
        }
        
        variant.currentStock = newStock;
        await repo.save(variant);
        
        return { success: true, newStock };
    } catch (error) {
        console.error('Error updating variant stock:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar stock' 
        };
    }
}

/**
 * Reordena variantes de un producto
 */
export async function reorderVariants(
    productId: string,
    orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        
        for (let i = 0; i < orderedIds.length; i++) {
            await repo.update(
                { id: orderedIds[i], productId },
                { sortOrder: i }
            );
        }
        
        revalidatePath('/admin/products');
        return { success: true };
    } catch (error) {
        console.error('Error reordering variants:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al reordenar variantes' 
        };
    }
}

/**
 * Obtiene variantes con stock bajo
 */
export async function getLowStockVariants(): Promise<ProductVariant[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.createQueryBuilder('variant')
        .innerJoinAndSelect('variant.product', 'product')
        .where('variant.deletedAt IS NULL')
        .andWhere('variant.isActive = true')
        .andWhere('product.trackInventory = true')
        .andWhere('variant.currentStock <= variant.minStock')
        .orderBy('variant.currentStock', 'ASC')
        .getMany();
}
