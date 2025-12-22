'use server'

import { getDb } from '@/data/db';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Product } from '@/data/entities/Product';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface CreateVariantDTO {
    productId: string;
    name: string;
    sku: string;
    barcode?: string;
    attributes?: Record<string, any>;
    priceModifier?: number;
    costModifier?: number;
    imagePath?: string;
}

interface UpdateVariantDTO {
    name?: string;
    sku?: string;
    barcode?: string;
    attributes?: Record<string, any>;
    priceModifier?: number;
    costModifier?: number;
    imagePath?: string;
    isActive?: boolean;
}

interface VariantResult {
    success: boolean;
    variant?: ProductVariant;
    error?: string;
}

/**
 * Obtiene todas las variantes de un producto
 */
export async function getVariantsByProductId(productId: string): Promise<ProductVariant[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.find({
        where: { productId, deletedAt: IsNull() },
        order: { name: 'ASC' }
    });
}

/**
 * Obtiene una variante por ID
 */
export async function getVariantById(id: string): Promise<ProductVariant | null> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    return repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['product']
    });
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
 * Crea una nueva variante de producto
 */
export async function createVariant(data: CreateVariantDTO): Promise<VariantResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        const productRepo = ds.getRepository(Product);
        
        // Verificar que el producto existe
        const product = await productRepo.findOne({
            where: { id: data.productId, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Verificar SKU único
        const existingSku = await repo.findOne({
            where: { sku: data.sku }
        });
        
        if (existingSku) {
            return { success: false, error: 'El SKU ya está en uso' };
        }
        
        const variant = repo.create({
            productId: data.productId,
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            attributes: data.attributes,
            priceModifier: data.priceModifier || 0,
            costModifier: data.costModifier || 0,
            imagePath: data.imagePath,
            isActive: true
        });
        
        await repo.save(variant);
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
        
        // Verificar SKU único si cambia
        if (data.sku && data.sku !== variant.sku) {
            const existingSku = await repo.findOne({
                where: { sku: data.sku }
            });
            if (existingSku) {
                return { success: false, error: 'El SKU ya está en uso' };
            }
        }
        
        // Actualizar campos
        if (data.name !== undefined) variant.name = data.name;
        if (data.sku !== undefined) variant.sku = data.sku;
        if (data.barcode !== undefined) variant.barcode = data.barcode;
        if (data.attributes !== undefined) variant.attributes = data.attributes;
        if (data.priceModifier !== undefined) variant.priceModifier = data.priceModifier;
        if (data.costModifier !== undefined) variant.costModifier = data.costModifier;
        if (data.imagePath !== undefined) variant.imagePath = data.imagePath;
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
 * Elimina una variante (soft delete)
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
        
        await repo.softRemove(variant);
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
 * Crea múltiples variantes para un producto
 */
export async function createBulkVariants(
    productId: string, 
    variants: Omit<CreateVariantDTO, 'productId'>[]
): Promise<{ success: boolean; variants?: ProductVariant[]; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        const productRepo = ds.getRepository(Product);
        
        // Verificar que el producto existe
        const product = await productRepo.findOne({
            where: { id: productId, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Verificar SKUs únicos
        for (const v of variants) {
            const existingSku = await repo.findOne({
                where: { sku: v.sku }
            });
            if (existingSku) {
                return { success: false, error: `El SKU '${v.sku}' ya está en uso` };
            }
        }
        
        const createdVariants: ProductVariant[] = [];
        
        for (const v of variants) {
            const variant = repo.create({
                productId,
                name: v.name,
                sku: v.sku,
                barcode: v.barcode,
                attributes: v.attributes,
                priceModifier: v.priceModifier || 0,
                costModifier: v.costModifier || 0,
                imagePath: v.imagePath,
                isActive: true
            });
            
            await repo.save(variant);
            createdVariants.push(variant);
        }
        
        revalidatePath('/admin/products');
        
        return { success: true, variants: createdVariants };
    } catch (error) {
        console.error('Error creating bulk variants:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear las variantes' 
        };
    }
}
