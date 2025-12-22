'use server'

import { getDb } from '@/data/db';
import { Product } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Category } from '@/data/entities/Category';
import { revalidatePath } from 'next/cache';
import { IsNull, In, Like } from 'typeorm';

// Types
interface GetProductsParams {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    hasVariants?: boolean;
    page?: number;
    limit?: number;
}

interface ProductsResponse {
    data: Product[];
    total: number;
}

interface CreateProductDTO {
    name: string;
    description?: string;
    sku?: string;
    barcode?: string;
    categoryId?: string;
    unit: string;
    costPrice?: number;
    salePrice: number;
    minStock?: number;
    maxStock?: number;
    trackInventory?: boolean;
    allowDecimalQuantity?: boolean;
    imageUrl?: string;
    hasVariants?: boolean;
}

interface UpdateProductDTO {
    name?: string;
    description?: string;
    sku?: string;
    barcode?: string;
    categoryId?: string | null;
    unit?: string;
    costPrice?: number;
    salePrice?: number;
    minStock?: number;
    maxStock?: number;
    trackInventory?: boolean;
    allowDecimalQuantity?: boolean;
    imageUrl?: string;
    hasVariants?: boolean;
    isActive?: boolean;
}

interface ProductResult {
    success: boolean;
    product?: Product;
    error?: string;
}

/**
 * Obtiene productos con filtros y paginación
 */
export async function getProducts(params?: GetProductsParams): Promise<ProductsResponse> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    
    const queryBuilder = repo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
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
    
    if (params?.hasVariants !== undefined) {
        queryBuilder.andWhere('product.hasVariants = :hasVariants', { hasVariants: params.hasVariants });
    }
    
    queryBuilder
        .orderBy('product.name', 'ASC')
        .skip(skip)
        .take(limit);
    
    const [data, total] = await queryBuilder.getManyAndCount();
    
    return { data, total };
}

/**
 * Busca productos por término (para autocompletado)
 */
export async function searchProducts(term: string, limit: number = 10): Promise<Product[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    return repo.find({
        where: [
            { name: Like(`%${term}%`), isActive: true, deletedAt: IsNull() },
            { sku: Like(`%${term}%`), isActive: true, deletedAt: IsNull() },
            { barcode: Like(`%${term}%`), isActive: true, deletedAt: IsNull() }
        ],
        relations: ['category'],
        take: limit,
        order: { name: 'ASC' }
    });
}

/**
 * Obtiene un producto por ID con variantes
 */
export async function getProductById(id: string): Promise<(Product & { variants: ProductVariant[] }) | null> {
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
        order: { sortOrder: 'ASC', name: 'ASC' }
    });
    
    return { ...product, variants } as any;
}

/**
 * Obtiene un producto por SKU
 */
export async function getProductBySku(sku: string): Promise<Product | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    return repo.findOne({
        where: { sku, deletedAt: IsNull() },
        relations: ['category']
    });
}

/**
 * Obtiene un producto por código de barras
 */
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    return repo.findOne({
        where: { barcode, deletedAt: IsNull() },
        relations: ['category']
    });
}

/**
 * Obtiene productos por categoría (incluyendo subcategorías)
 */
export async function getProductsByCategory(categoryId: string, includeSubcategories: boolean = true): Promise<Product[]> {
    const ds = await getDb();
    const productRepo = ds.getRepository(Product);
    const categoryRepo = ds.getRepository(Category);
    
    let categoryIds = [categoryId];
    
    if (includeSubcategories) {
        // Obtener todas las subcategorías recursivamente
        const getAllSubcategoryIds = async (parentId: string): Promise<string[]> => {
            const children = await categoryRepo.find({
                where: { parentId, deletedAt: IsNull() },
                select: ['id']
            });
            
            let ids: string[] = [];
            for (const child of children) {
                ids.push(child.id);
                ids = ids.concat(await getAllSubcategoryIds(child.id));
            }
            return ids;
        };
        
        const subcategoryIds = await getAllSubcategoryIds(categoryId);
        categoryIds = categoryIds.concat(subcategoryIds);
    }
    
    return productRepo.find({
        where: { categoryId: In(categoryIds), isActive: true, deletedAt: IsNull() },
        relations: ['category'],
        order: { name: 'ASC' }
    });
}

/**
 * Crea un nuevo producto
 */
export async function createProduct(data: CreateProductDTO): Promise<ProductResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Product);
        const categoryRepo = ds.getRepository(Category);
        
        // Validaciones
        if (!data.name?.trim()) {
            return { success: false, error: 'El nombre es requerido' };
        }
        
        if (!data.unit?.trim()) {
            return { success: false, error: 'La unidad de medida es requerida' };
        }
        
        if (data.salePrice < 0) {
            return { success: false, error: 'El precio de venta no puede ser negativo' };
        }
        
        // Verificar SKU único si se proporciona
        if (data.sku) {
            const existingBySku = await repo.findOne({
                where: { sku: data.sku, deletedAt: IsNull() }
            });
            if (existingBySku) {
                return { success: false, error: 'El SKU ya está en uso' };
            }
        }
        
        // Verificar código de barras único si se proporciona
        if (data.barcode) {
            const existingByBarcode = await repo.findOne({
                where: { barcode: data.barcode, deletedAt: IsNull() }
            });
            if (existingByBarcode) {
                return { success: false, error: 'El código de barras ya está en uso' };
            }
        }
        
        // Verificar categoría si se proporciona
        if (data.categoryId) {
            const category = await categoryRepo.findOne({
                where: { id: data.categoryId, deletedAt: IsNull() }
            });
            if (!category) {
                return { success: false, error: 'Categoría no encontrada' };
            }
        }
        
        const product = repo.create({
            name: data.name.trim(),
            description: data.description,
            sku: data.sku,
            barcode: data.barcode,
            categoryId: data.categoryId,
            unit: data.unit,
            costPrice: data.costPrice ?? 0,
            salePrice: data.salePrice,
            minStock: data.minStock ?? 0,
            maxStock: data.maxStock,
            currentStock: 0,
            trackInventory: data.trackInventory ?? true,
            allowDecimalQuantity: data.allowDecimalQuantity ?? false,
            imageUrl: data.imageUrl,
            hasVariants: data.hasVariants ?? false,
            isActive: true
        });
        
        await repo.save(product);
        
        // Recargar con relaciones
        const savedProduct = await repo.findOne({
            where: { id: product.id },
            relations: ['category']
        });
        
        revalidatePath('/admin/products');
        
        return { success: true, product: savedProduct! };
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
        const categoryRepo = ds.getRepository(Category);
        
        const product = await repo.findOne({ 
            where: { id, deletedAt: IsNull() },
            relations: ['category']
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Verificar SKU único si se cambia
        if (data.sku && data.sku !== product.sku) {
            const existing = await repo.findOne({ 
                where: { sku: data.sku, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El SKU ya está en uso' };
            }
        }
        
        // Verificar código de barras único si se cambia
        if (data.barcode && data.barcode !== product.barcode) {
            const existing = await repo.findOne({ 
                where: { barcode: data.barcode, deletedAt: IsNull() } 
            });
            if (existing) {
                return { success: false, error: 'El código de barras ya está en uso' };
            }
        }
        
        // Verificar categoría si se cambia
        if (data.categoryId !== undefined && data.categoryId !== product.categoryId) {
            if (data.categoryId) {
                const category = await categoryRepo.findOne({
                    where: { id: data.categoryId, deletedAt: IsNull() }
                });
                if (!category) {
                    return { success: false, error: 'Categoría no encontrada' };
                }
            }
        }
        
        // Aplicar cambios
        if (data.name !== undefined) product.name = data.name.trim();
        if (data.description !== undefined) product.description = data.description;
        if (data.sku !== undefined) product.sku = data.sku;
        if (data.barcode !== undefined) product.barcode = data.barcode;
        if (data.categoryId !== undefined) product.categoryId = data.categoryId;
        if (data.unit !== undefined) product.unit = data.unit;
        if (data.costPrice !== undefined) product.costPrice = data.costPrice;
        if (data.salePrice !== undefined) product.salePrice = data.salePrice;
        if (data.minStock !== undefined) product.minStock = data.minStock;
        if (data.maxStock !== undefined) product.maxStock = data.maxStock;
        if (data.trackInventory !== undefined) product.trackInventory = data.trackInventory;
        if (data.allowDecimalQuantity !== undefined) product.allowDecimalQuantity = data.allowDecimalQuantity;
        if (data.imageUrl !== undefined) product.imageUrl = data.imageUrl;
        if (data.hasVariants !== undefined) product.hasVariants = data.hasVariants;
        if (data.isActive !== undefined) product.isActive = data.isActive;
        
        await repo.save(product);
        revalidatePath('/admin/products');
        
        return { success: true, product };
    } catch (error) {
        console.error('Error updating product:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar el producto' 
        };
    }
}

/**
 * Elimina (soft delete) un producto
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Product);
        const variantRepo = ds.getRepository(ProductVariant);
        
        const product = await repo.findOne({ 
            where: { id, deletedAt: IsNull() } 
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        // Soft delete de variantes asociadas
        await variantRepo.softDelete({ productId: id });
        
        await repo.softDelete(id);
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
 * Actualiza el stock de un producto
 */
export async function updateProductStock(
    productId: string,
    quantity: number,
    operation: 'set' | 'add' | 'subtract'
): Promise<{ success: boolean; newStock?: number; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(Product);
        
        const product = await repo.findOne({ where: { id: productId } });
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }
        
        let newStock: number;
        const currentStock = Number(product.currentStock) || 0;
        
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
        
        if (newStock < 0 && product.trackInventory) {
            return { success: false, error: 'Stock insuficiente' };
        }
        
        product.currentStock = newStock;
        await repo.save(product);
        
        return { success: true, newStock };
    } catch (error) {
        console.error('Error updating product stock:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al actualizar stock' 
        };
    }
}

/**
 * Obtiene productos con stock bajo
 */
export async function getLowStockProducts(): Promise<Product[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Product);
    
    return repo.createQueryBuilder('product')
        .where('product.deletedAt IS NULL')
        .andWhere('product.isActive = true')
        .andWhere('product.trackInventory = true')
        .andWhere('product.currentStock <= product.minStock')
        .orderBy('product.currentStock', 'ASC')
        .getMany();
}
