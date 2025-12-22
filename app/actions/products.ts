'use server'

import { getDb } from '@/data/db';
import { Product, ProductType } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Category } from '@/data/entities/Category';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetProductsParams {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    productType?: ProductType;
    includeVariants?: boolean;
}

interface CreateProductDTO {
    name: string;
    sku: string;
    barcode?: string;
    description?: string;
    categoryId?: string;
    productType?: ProductType;
    unitOfMeasure?: string;
    basePrice: number;
    baseCost?: number;
    taxIds?: string[];  // Array de IDs de impuestos
    trackInventory?: boolean;
    minimumStock?: number;
    maximumStock?: number;
    reorderPoint?: number;
    imagePath?: string;
    attributes?: Record<string, any>;
}

interface UpdateProductDTO {
    name?: string;
    sku?: string;
    barcode?: string;
    description?: string;
    categoryId?: string;
    productType?: ProductType;
    unitOfMeasure?: string;
    basePrice?: number;
    baseCost?: number;
    taxIds?: string[];  // Array de IDs de impuestos
    trackInventory?: boolean;
    minimumStock?: number;
    maximumStock?: number;
    reorderPoint?: number;
    imagePath?: string;
    attributes?: Record<string, any>;
    isActive?: boolean;
}

interface ProductResult {
    success: boolean;
    product?: Product;
    error?: string;
}

/**
 * Obtiene productos con filtros opcionales
 */
export async function getProducts(params?: GetProductsParams): Promise<Product[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    const queryBuilder = repo.createQueryBuilder('product')
        .where('product.deletedAt IS NULL');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(product.name LIKE :search OR product.sku LIKE :search OR product.barcode LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: params.categoryId });
    }
    
    if (params?.isActive !== undefined) {
        queryBuilder.andWhere('product.isActive = :isActive', { isActive: params.isActive });
    }
    
    if (params?.productType) {
        queryBuilder.andWhere('product.productType = :productType', { productType: params.productType });
    }
    
    if (params?.includeVariants) {
        queryBuilder.leftJoinAndSelect('product.variants', 'variants', 'variants.deletedAt IS NULL');
    }
    
    queryBuilder.leftJoinAndSelect('product.category', 'category');
    queryBuilder.orderBy('product.name', 'ASC');
    
    const products = await queryBuilder.getMany();
    return JSON.parse(JSON.stringify(products));
}

/**
 * Obtiene un producto por ID
 */
export async function getProductById(id: string): Promise<Product | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    const product = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['category']
    });
    return product ? JSON.parse(JSON.stringify(product)) : null;
}

/**
 * Obtiene un producto por SKU
 */
export async function getProductBySku(sku: string): Promise<Product | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    const product = await repo.findOne({
        where: { sku, deletedAt: IsNull() },
        relations: ['category']
    });
    return product ? JSON.parse(JSON.stringify(product)) : null;
}

/**
 * Crea un nuevo producto
 */
export async function createProduct(data: CreateProductDTO): Promise<ProductResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Product);
        
        // Verificar SKU único
        const existingSku = await repo.findOne({
            where: { sku: data.sku }
        });
        
        if (existingSku) {
            return { success: false, error: 'El SKU ya está en uso' };
        }
        
        // Verificar categoría si se proporciona
        if (data.categoryId) {
            const categoryRepo = ds.getRepository(Category);
            const category = await categoryRepo.findOne({
                where: { id: data.categoryId, deletedAt: IsNull() }
            });
            if (!category) {
                return { success: false, error: 'Categoría no encontrada' };
            }
        }
        
        const product = repo.create({
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            description: data.description,
            categoryId: data.categoryId,
            productType: data.productType || ProductType.PHYSICAL,
            unitOfMeasure: data.unitOfMeasure,
            basePrice: data.basePrice,
            baseCost: data.baseCost || 0,
            taxIds: data.taxIds,  // Array de IDs de impuestos
            trackInventory: data.trackInventory ?? true,
            minimumStock: data.minimumStock || 0,
            maximumStock: data.maximumStock || 0,
            reorderPoint: data.reorderPoint || 0,
            imagePath: data.imagePath,
            attributes: data.attributes,
            isActive: true
        });
        
        await repo.save(product);
        revalidatePath('/admin/products');
        
        return { success: true, product: JSON.parse(JSON.stringify(product)) };
    } catch (error) {
        console.error('Error creating product:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el producto' 
        };
    }
}

/**
 * Actualiza un producto
 */
export async function updateProduct(id: string, data: UpdateProductDTO): Promise<ProductResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Product);
        
        const product = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Verificar SKU único si cambia
        if (data.sku && data.sku !== product.sku) {
            const existingSku = await repo.findOne({
                where: { sku: data.sku }
            });
            if (existingSku) {
                return { success: false, error: 'El SKU ya está en uso' };
            }
        }
        
        // Actualizar campos
        if (data.name !== undefined) product.name = data.name;
        if (data.sku !== undefined) product.sku = data.sku;
        if (data.barcode !== undefined) product.barcode = data.barcode;
        if (data.description !== undefined) product.description = data.description;
        if (data.categoryId !== undefined) product.categoryId = data.categoryId;
        if (data.productType !== undefined) product.productType = data.productType;
        if (data.unitOfMeasure !== undefined) product.unitOfMeasure = data.unitOfMeasure;
        if (data.basePrice !== undefined) product.basePrice = data.basePrice;
        if (data.baseCost !== undefined) product.baseCost = data.baseCost;
        if (data.taxIds !== undefined) product.taxIds = data.taxIds;
        if (data.trackInventory !== undefined) product.trackInventory = data.trackInventory;
        if (data.minimumStock !== undefined) product.minimumStock = data.minimumStock;
        if (data.maximumStock !== undefined) product.maximumStock = data.maximumStock;
        if (data.reorderPoint !== undefined) product.reorderPoint = data.reorderPoint;
        if (data.imagePath !== undefined) product.imagePath = data.imagePath;
        if (data.attributes !== undefined) product.attributes = data.attributes;
        if (data.isActive !== undefined) product.isActive = data.isActive;
        
        await repo.save(product);
        revalidatePath('/admin/products');
        
        return { success: true, product: JSON.parse(JSON.stringify(product)) };
    } catch (error) {
        console.error('Error updating product:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el producto' 
        };
    }
}

/**
 * Elimina un producto (soft delete)
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Product);
        
        const product = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        await repo.softRemove(product);
        revalidatePath('/admin/products');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el producto' 
        };
    }
}

/**
 * Busca productos por texto
 */
export async function searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    const products = await repo.createQueryBuilder('product')
        .where('product.deletedAt IS NULL')
        .andWhere('product.isActive = true')
        .andWhere(
            '(product.name LIKE :query OR product.sku LIKE :query OR product.barcode LIKE :query)',
            { query: `%${query}%` }
        )
        .leftJoinAndSelect('product.category', 'category')
        .orderBy('product.name', 'ASC')
        .limit(limit)
        .getMany();
    return JSON.parse(JSON.stringify(products));
}
