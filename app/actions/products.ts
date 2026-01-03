'use server'

import { getDb } from '@/data/db';
import { Product, ProductType } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Category } from '@/data/entities/Category';
import { PriceList } from '@/data/entities/PriceList';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
interface GetProductsParams {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    productType?: ProductType;
}

/**
 * DTO para crear un producto simple (sin variantes múltiples)
 * Se crea automáticamente una variante "default" con los datos de SKU/precio
 */
interface CreateSimpleProductDTO {
    name: string;
    description?: string;
    brand?: string;
    categoryId?: string;
    productType?: ProductType;
    taxIds?: string[];
    imagePath?: string;
    metadata?: Record<string, any>;
    // Datos de la variante default
    sku: string;
    barcode?: string;
    basePrice: number;
    baseCost?: number;
    unitOfMeasure?: string;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    minimumStock?: number;
    maximumStock?: number;
    reorderPoint?: number;
    priceListId?: string;
}

/**
 * DTO para crear un producto con variantes (hasVariants = true)
 * NO incluye SKU/precio - esos se agregan después vía variantes
 */
interface CreateProductWithVariantsDTO {
    name: string;
    description?: string;
    brand?: string;
    categoryId?: string;
    productType?: ProductType;
    taxIds?: string[];
    imagePath?: string;
    metadata?: Record<string, any>;
}

interface UpdateProductDTO {
    name?: string;
    description?: string;
    brand?: string;
    categoryId?: string;
    productType?: ProductType;
    taxIds?: string[];
    imagePath?: string;
    metadata?: Record<string, any>;
    isActive?: boolean;
}

interface ProductResult {
    success: boolean;
    product?: Product;
    variant?: ProductVariant; // Para productos simples, incluye la variante default
    error?: string;
}

/**
 * Resumen de variante para mostrar en panel expandible
 */
export interface VariantSummary {
    id: string;
    sku: string;
    barcode?: string;
    basePrice: number;
    baseCost: number;
    unitOfMeasure: string;
    attributeValues?: Record<string, string>;
    isDefault: boolean;
    isActive: boolean;
}

/**
 * Producto con datos de su variante default (para productos simples)
 */
export interface ProductWithDefaultVariant {
    id: string;
    name: string;
    description?: string;
    brand?: string;
    categoryId?: string;
    categoryName?: string;
    productType: ProductType;
    hasVariants: boolean;
    isActive: boolean;
    imagePath?: string;
    createdAt: Date;
    // Datos de variante default (si es producto simple)
    sku?: string;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    barcode?: string;
    basePrice?: number;
    baseCost?: number;
    unitOfMeasure?: string;
    variantCount: number;
    // Todas las variantes del producto
    variants: VariantSummary[];
}

/**
 * Obtiene productos con datos de variante default para productos simples
 */
export async function getProducts(params?: GetProductsParams): Promise<ProductWithDefaultVariant[]> {
    const ds = await getDb();
    const productRepo = ds.getRepository(Product);
    const variantRepo = ds.getRepository(ProductVariant);
    
    const queryBuilder = productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .where('product.deletedAt IS NULL');
    
    if (params?.search) {
        // Buscar en producto y en variantes
        queryBuilder.andWhere(
            `(product.name LIKE :search OR product.brand LIKE :search OR EXISTS (
                SELECT 1 FROM product_variants pv 
                WHERE pv.productId = product.id 
                AND pv.deletedAt IS NULL 
                AND (pv.sku LIKE :search OR pv.barcode LIKE :search)
            ))`,
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
    
    queryBuilder.orderBy('product.name', 'ASC');
    
    const products = await queryBuilder.getMany();
    
    // Para cada producto, obtener info de variantes
    const result: ProductWithDefaultVariant[] = [];
    
    for (const product of products) {
        const variants = await variantRepo.find({
            where: { productId: product.id, deletedAt: IsNull() },
            order: { isDefault: 'DESC', sku: 'ASC' }
        });
        
        const defaultVariant = variants.find(v => v.isDefault) || variants[0];
        
        result.push({
            id: product.id,
            name: product.name,
            description: product.description,
            brand: product.brand,
            categoryId: product.categoryId,
            categoryName: product.category?.name,
            productType: product.productType,
            hasVariants: product.hasVariants,
            isActive: product.isActive,
            imagePath: product.imagePath,
            createdAt: product.createdAt,
            // Datos de variante default
            sku: defaultVariant?.sku,
            barcode: defaultVariant?.barcode,
            basePrice: defaultVariant ? Number(defaultVariant.basePrice) : undefined,
            baseCost: defaultVariant ? Number(defaultVariant.baseCost) : undefined,
            unitOfMeasure: defaultVariant?.unitOfMeasure,
            trackInventory: defaultVariant?.trackInventory,
            allowNegativeStock: defaultVariant?.allowNegativeStock,
            variantCount: variants.length,
            // Todas las variantes
            variants: variants.map(v => ({
                id: v.id,
                sku: v.sku,
                barcode: v.barcode,
                basePrice: Number(v.basePrice),
                baseCost: Number(v.baseCost),
                unitOfMeasure: v.unitOfMeasure,
                attributeValues: v.attributeValues,
                isDefault: v.isDefault,
                isActive: v.isActive
            }))
        });
    }
    
    return JSON.parse(JSON.stringify(result));
}

/**
 * Obtiene un producto por ID con sus variantes
 */
export async function getProductById(id: string): Promise<(Product & { variants?: ProductVariant[] }) | null> {
    const ds = await getDb();
    const productRepo = ds.getRepository(Product);
    const variantRepo = ds.getRepository(ProductVariant);
    
    const product = await productRepo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['category']
    });
    
    if (!product) return null;
    
    const variants = await variantRepo.find({
        where: { productId: id, deletedAt: IsNull() },
        order: { isDefault: 'DESC', sku: 'ASC' }
    });
    
    return JSON.parse(JSON.stringify({ ...product, variants }));
}

/**
 * Crea un producto simple (una única variante default)
 */
export async function createSimpleProduct(data: CreateSimpleProductDTO): Promise<ProductResult> {
    const ds = await getDb();
    
    return await ds.transaction(async (manager) => {
        const productRepo = manager.getRepository(Product);
        const variantRepo = manager.getRepository(ProductVariant);
        
        // Verificar SKU único
        const existingSku = await variantRepo.findOne({
            where: { sku: data.sku }
        });
        
        if (existingSku) {
            return { success: false, error: 'El SKU ya está en uso' };
        }
        
        // Verificar categoría si se proporciona
        if (data.categoryId) {
            const categoryRepo = manager.getRepository(Category);
            const category = await categoryRepo.findOne({
                where: { id: data.categoryId, deletedAt: IsNull() }
            });
            if (!category) {
                return { success: false, error: 'Categoría no encontrada' };
            }
        }

        if (data.priceListId) {
            const priceListRepo = manager.getRepository(PriceList);
            const priceList = await priceListRepo.findOne({
                where: { id: data.priceListId, deletedAt: IsNull(), isActive: true }
            });

            if (!priceList) {
                return { success: false, error: 'Lista de precios no encontrada o inactiva' };
            }
        }
        
        // Crear producto maestro
        const product = productRepo.create({
            name: data.name,
            description: data.description,
            brand: data.brand,
            categoryId: data.categoryId,
            productType: data.productType || ProductType.PHYSICAL,
            taxIds: data.taxIds,
            imagePath: data.imagePath,
            metadata: data.metadata,
            hasVariants: false, // Producto simple
            isActive: true
        });
        
        await productRepo.save(product);
        
        // Crear variante default
        const variant = variantRepo.create({
            productId: product.id,
            sku: data.sku,
            barcode: data.barcode,
            basePrice: data.basePrice,
            baseCost: data.baseCost || 0,
            unitOfMeasure: data.unitOfMeasure || 'UN',
            trackInventory: data.trackInventory ?? true,
            allowNegativeStock: data.allowNegativeStock ?? false,
            minimumStock: data.minimumStock || 0,
            maximumStock: data.maximumStock || 0,
            reorderPoint: data.reorderPoint || 0,
            taxIds: data.taxIds && data.taxIds.length > 0 ? data.taxIds : undefined,
            isDefault: true,
            isActive: true
        });
        
        await variantRepo.save(variant);

        if (data.priceListId) {
            const priceListItemRepo = manager.getRepository(PriceListItem);
            const priceListItem = priceListItemRepo.create({
                priceListId: data.priceListId,
                productId: product.id,
                productVariantId: variant.id,
                price: data.basePrice,
            });

            await priceListItemRepo.save(priceListItem);
        }
        
        revalidatePath('/admin/products');
        
        return { 
            success: true, 
            product: JSON.parse(JSON.stringify(product)),
            variant: JSON.parse(JSON.stringify(variant))
        };
    });
}

/**
 * Crea un producto con variantes múltiples
 * Solo crea el producto maestro, las variantes se agregan después
 */
export async function createProductWithVariants(data: CreateProductWithVariantsDTO): Promise<ProductResult> {
    try {
        const ds = await getDb();
        const productRepo = ds.getRepository(Product);
        
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
        
        const product = productRepo.create({
            name: data.name,
            description: data.description,
            brand: data.brand,
            categoryId: data.categoryId,
            productType: data.productType || ProductType.PHYSICAL,
            taxIds: data.taxIds,
            imagePath: data.imagePath,
            metadata: data.metadata,
            hasVariants: true, // Producto con variantes múltiples
            isActive: true
        });
        
        await productRepo.save(product);
        revalidatePath('/admin/products');
        
        return { success: true, product: JSON.parse(JSON.stringify(product)) };
    } catch (error) {
        console.error('Error creating product with variants:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear el producto' 
        };
    }
}

/**
 * Actualiza un producto maestro
 */
export async function updateProduct(id: string, data: UpdateProductDTO): Promise<ProductResult> {
    try {
        const ds = await getDb();
        const productRepo = ds.getRepository(Product);
        
        const product = await productRepo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Actualizar campos
        if (data.name !== undefined) product.name = data.name;
        if (data.description !== undefined) product.description = data.description;
        if (data.brand !== undefined) product.brand = data.brand;
        if (data.categoryId !== undefined) product.categoryId = data.categoryId;
        if (data.productType !== undefined) product.productType = data.productType;
        if (data.taxIds !== undefined) product.taxIds = data.taxIds;
        if (data.imagePath !== undefined) product.imagePath = data.imagePath;
        if (data.metadata !== undefined) product.metadata = data.metadata;
        if (data.isActive !== undefined) product.isActive = data.isActive;
        
        await productRepo.save(product);
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
 * Actualiza un producto simple (producto + variante default)
 */
export async function updateSimpleProduct(
    id: string, 
    productData: UpdateProductDTO,
    variantData?: {
        sku?: string;
        barcode?: string;
        basePrice?: number;
        baseCost?: number;
        unitOfMeasure?: string;
        trackInventory?: boolean;
        allowNegativeStock?: boolean;
        minimumStock?: number;
        maximumStock?: number;
        reorderPoint?: number;
    }
): Promise<ProductResult> {
    const ds = await getDb();
    
    return await ds.transaction(async (manager) => {
        const productRepo = manager.getRepository(Product);
        const variantRepo = manager.getRepository(ProductVariant);
        
        const product = await productRepo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Actualizar producto
        if (productData.name !== undefined) product.name = productData.name;
        if (productData.description !== undefined) product.description = productData.description;
        if (productData.brand !== undefined) product.brand = productData.brand;
        if (productData.categoryId !== undefined) product.categoryId = productData.categoryId;
        if (productData.productType !== undefined) product.productType = productData.productType;
        if (productData.taxIds !== undefined) product.taxIds = productData.taxIds;
        if (productData.imagePath !== undefined) product.imagePath = productData.imagePath;
        if (productData.metadata !== undefined) product.metadata = productData.metadata;
        if (productData.isActive !== undefined) product.isActive = productData.isActive;
        
        await productRepo.save(product);
        
        // Actualizar variante default si hay datos
        if (variantData && !product.hasVariants) {
            const defaultVariant = await variantRepo.findOne({
                where: { productId: id, isDefault: true, deletedAt: IsNull() }
            });
            
            if (defaultVariant) {
                // Verificar SKU único si cambia
                if (variantData.sku && variantData.sku !== defaultVariant.sku) {
                    const existingSku = await variantRepo.findOne({
                        where: { sku: variantData.sku }
                    });
                    if (existingSku) {
                        return { success: false, error: 'El SKU ya está en uso' };
                    }
                }
                
                if (variantData.sku !== undefined) defaultVariant.sku = variantData.sku;
                if (variantData.barcode !== undefined) defaultVariant.barcode = variantData.barcode;
                if (variantData.basePrice !== undefined) defaultVariant.basePrice = variantData.basePrice;
                if (variantData.baseCost !== undefined) defaultVariant.baseCost = variantData.baseCost;
                if (variantData.unitOfMeasure !== undefined) defaultVariant.unitOfMeasure = variantData.unitOfMeasure;
                if (variantData.trackInventory !== undefined) defaultVariant.trackInventory = variantData.trackInventory;
                if (variantData.allowNegativeStock !== undefined) defaultVariant.allowNegativeStock = variantData.allowNegativeStock;
                if (variantData.minimumStock !== undefined) defaultVariant.minimumStock = variantData.minimumStock;
                if (variantData.maximumStock !== undefined) defaultVariant.maximumStock = variantData.maximumStock;
                if (variantData.reorderPoint !== undefined) defaultVariant.reorderPoint = variantData.reorderPoint;
                
                await variantRepo.save(defaultVariant);
                
                return { 
                    success: true, 
                    product: JSON.parse(JSON.stringify(product)),
                    variant: JSON.parse(JSON.stringify(defaultVariant))
                };
            }
        }
        
        revalidatePath('/admin/products');
        
        return { success: true, product: JSON.parse(JSON.stringify(product)) };
    });
}

/**
 * Elimina un producto (soft delete) y todas sus variantes
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const productRepo = ds.getRepository(Product);
        const variantRepo = ds.getRepository(ProductVariant);
        
        const product = await productRepo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Soft delete variantes
        const variants = await variantRepo.find({
            where: { productId: id, deletedAt: IsNull() }
        });
        
        for (const variant of variants) {
            await variantRepo.softRemove(variant);
        }
        
        // Soft delete producto
        await productRepo.softRemove(product);
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
 * Busca productos/variantes por texto
 */
export async function searchProducts(query: string, limit: number = 20): Promise<ProductWithDefaultVariant[]> {
    const ds = await getDb();
    const productRepo = ds.getRepository(Product);
    const variantRepo = ds.getRepository(ProductVariant);
    
    const products = await productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .where('product.deletedAt IS NULL')
        .andWhere('product.isActive = true')
        .andWhere(
            `(product.name LIKE :query OR product.brand LIKE :query OR EXISTS (
                SELECT 1 FROM product_variants pv 
                WHERE pv.productId = product.id 
                AND pv.deletedAt IS NULL 
                AND (pv.sku LIKE :query OR pv.barcode LIKE :query)
            ))`,
            { query: `%${query}%` }
        )
        .orderBy('product.name', 'ASC')
        .limit(limit)
        .getMany();
    
    const result: ProductWithDefaultVariant[] = [];
    
    for (const product of products) {
        const variants = await variantRepo.find({
            where: { productId: product.id, deletedAt: IsNull() },
            order: { isDefault: 'DESC', sku: 'ASC' }
        });
        
        const defaultVariant = variants.find(v => v.isDefault) || variants[0];
        
        result.push({
            id: product.id,
            name: product.name,
            description: product.description,
            brand: product.brand,
            categoryId: product.categoryId,
            categoryName: product.category?.name,
            productType: product.productType,
            hasVariants: product.hasVariants,
            isActive: product.isActive,
            imagePath: product.imagePath,
            createdAt: product.createdAt,
            sku: defaultVariant?.sku,
            barcode: defaultVariant?.barcode,
            basePrice: defaultVariant ? Number(defaultVariant.basePrice) : undefined,
            baseCost: defaultVariant ? Number(defaultVariant.baseCost) : undefined,
            unitOfMeasure: defaultVariant?.unitOfMeasure,
            trackInventory: defaultVariant?.trackInventory,
            allowNegativeStock: defaultVariant?.allowNegativeStock,
            variantCount: variants.length,
            variants: variants.map(v => ({
                id: v.id,
                sku: v.sku,
                barcode: v.barcode,
                basePrice: Number(v.basePrice),
                baseCost: Number(v.baseCost),
                unitOfMeasure: v.unitOfMeasure,
                attributeValues: v.attributeValues,
                isDefault: v.isDefault,
                isActive: v.isActive
            }))
        });
    }
    
    return JSON.parse(JSON.stringify(result));
}
