'use server'

import { getDb } from '@/data/db';
import { Product, ProductType, type ProductChangeHistoryChange } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Category } from '@/data/entities/Category';
import { Unit } from '@/data/entities/Unit';
import { revalidatePath } from 'next/cache';
import { In, IsNull } from 'typeorm';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { getCurrentSession } from './auth.server';
import { addHistoryEntry, areValuesEqual, buildHistoryEntry, buildSummary } from './utils/productHistory';

// Types
interface GetProductsParams {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    productType?: ProductType;
}

interface CreateProductMasterDTO {
    name: string;
    description?: string;
    brand?: string;
    categoryId?: string;
    productType?: ProductType;
    taxIds?: string[];
    imagePath?: string;
    metadata?: Record<string, any>;
    isActive?: boolean;
    baseUnitId: string;
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
    baseUnitId?: string;
}

interface ProductResult {
    success: boolean;
    product?: Product;
    error?: string;
}

/**
 * Resumen de variante para mostrar en panel expandible
 */
export interface VariantPriceListSummary {
    priceListId: string;
    priceListName: string;
    currency: string;
    netPrice: number;
    grossPrice: number;
    taxIds: string[];
}

export interface VariantSummary {
    id: string;
    sku: string;
    barcode?: string;
    basePrice: number;
    baseCost: number;
    unitId: string;
    unitOfMeasure: string;
    attributeValues?: Record<string, string>;
    isDefault: boolean;
    isActive: boolean;
    priceListItems?: VariantPriceListSummary[];
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
    isActive: boolean;
    imagePath?: string;
    createdAt: Date;
    baseUnitId?: string;
    baseUnitSymbol?: string;
    baseUnitName?: string;
    isMultiVariant: boolean;
    // Datos de variante default (si es producto simple)
    sku?: string;
    barcode?: string;
    basePrice?: number;
    baseCost?: number;
    unitId?: string;
    unitOfMeasure?: string;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    variantCount: number;
    // Todas las variantes del producto
    variants: VariantSummary[];
}

function normalizeStringArray(values?: string[] | null): string[] {
    if (!Array.isArray(values)) {
        return [];
    }

    const seen = new Set<string>();
    const sanitized: string[] = [];

    for (const raw of values) {
        if (typeof raw !== 'string') {
            continue;
        }
        const trimmed = raw.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }
        seen.add(trimmed);
    }

    sanitized.sort();
    return sanitized;
}

function collectProductChanges(product: Product, data: UpdateProductDTO): ProductChangeHistoryChange[] {
    const changes: ProductChangeHistoryChange[] = [];

    if (data.name !== undefined && data.name !== product.name) {
        changes.push({ field: 'name', previousValue: product.name, newValue: data.name });
    }

    if (data.description !== undefined && data.description !== product.description) {
        changes.push({ field: 'description', previousValue: product.description, newValue: data.description });
    }

    if (data.brand !== undefined && data.brand !== product.brand) {
        changes.push({ field: 'brand', previousValue: product.brand, newValue: data.brand });
    }

    if (data.categoryId !== undefined && data.categoryId !== product.categoryId) {
        changes.push({ field: 'categoryId', previousValue: product.categoryId, newValue: data.categoryId });
    }

    if (data.productType !== undefined && data.productType !== product.productType) {
        changes.push({ field: 'productType', previousValue: product.productType, newValue: data.productType });
    }

    if (data.taxIds !== undefined) {
        const current = normalizeStringArray(product.taxIds);
        const next = normalizeStringArray(data.taxIds);
        if (!areValuesEqual(current, next)) {
            changes.push({ field: 'taxIds', previousValue: current, newValue: next });
        }
    }

    if (data.imagePath !== undefined && data.imagePath !== product.imagePath) {
        changes.push({ field: 'imagePath', previousValue: product.imagePath, newValue: data.imagePath });
    }

    if (data.metadata !== undefined && !areValuesEqual(product.metadata ?? null, data.metadata ?? null)) {
        changes.push({ field: 'metadata', previousValue: product.metadata, newValue: data.metadata });
    }

    if (data.isActive !== undefined && data.isActive !== product.isActive) {
        changes.push({ field: 'isActive', previousValue: product.isActive, newValue: data.isActive });
    }

    if (data.baseUnitId !== undefined && data.baseUnitId !== product.baseUnitId) {
        changes.push({ field: 'baseUnitId', previousValue: product.baseUnitId, newValue: data.baseUnitId });
    }

    return changes;
}

export async function createProductMaster(data: CreateProductMasterDTO): Promise<ProductResult> {
    try {
        const ds = await getDb();
        const productRepo = ds.getRepository(Product);
        const unitRepo = ds.getRepository(Unit);
        const session = await getCurrentSession();

        if (data.categoryId) {
            const categoryRepo = ds.getRepository(Category);
            const category = await categoryRepo.findOne({
                where: { id: data.categoryId, deletedAt: IsNull() }
            });

            if (!category) {
                return { success: false, error: 'Categoría no encontrada' };
            }
        }

        const baseUnit = await unitRepo.findOne({
            where: { id: data.baseUnitId, deletedAt: IsNull(), active: true },
        });

        if (!baseUnit || !baseUnit.isBase) {
            return { success: false, error: 'Unidad base no encontrada o inactiva' };
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
            isActive: data.isActive ?? true,
            baseUnitId: baseUnit.id,
            baseUnit,
            changeHistory: [],
        });

        await productRepo.save(product);

        const historyEntry = buildHistoryEntry({
            action: 'CREATE',
            targetType: 'PRODUCT',
            targetId: product.id,
            targetLabel: product.name,
            summary: buildSummary('CREATE', 'PRODUCT', product.name),
            userId: session?.id,
            userName: session?.userName,
        });
        addHistoryEntry(product, historyEntry);

        await productRepo.save(product);
        revalidatePath('/admin/inventory/products');

        return { success: true, product: JSON.parse(JSON.stringify(product)) };
    } catch (error) {
        console.error('Error creating product master:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear el producto',
        };
    }
}

/**
 * Obtiene productos con datos de variante default para productos simples
 */
export async function getProducts(params?: GetProductsParams): Promise<ProductWithDefaultVariant[]> {
    const ds = await getDb();
    const productRepo = ds.getRepository(Product);
    const variantRepo = ds.getRepository(ProductVariant);
    const priceListItemRepo = ds.getRepository(PriceListItem);
    
    const queryBuilder = productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.baseUnit', 'baseUnit')
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

        const variantIds = variants.map(v => v.id);
        let priceListItemsByVariant: Record<string, VariantPriceListSummary[]> = {};

        if (variantIds.length > 0) {
            const items = await priceListItemRepo.find({
                where: {
                    productVariantId: In(variantIds),
                    deletedAt: IsNull(),
                },
                relations: ['priceList'],
            });

            priceListItemsByVariant = items.reduce<Record<string, VariantPriceListSummary[]>>((acc, item) => {
                if (!item.productVariantId) {
                    return acc;
                }

                const current = acc[item.productVariantId] ?? [];
                current.push({
                    priceListId: item.priceListId ?? '',
                    priceListName: item.priceList?.name ?? 'Lista sin nombre',
                    currency: item.priceList?.currency ?? 'CLP',
                    netPrice: Number(item.netPrice),
                    grossPrice: Number(item.grossPrice),
                    taxIds: normalizeStringArray(item.taxIds as string[] | undefined),
                });

                acc[item.productVariantId] = current;
                return acc;
            }, {});

            for (const key of Object.keys(priceListItemsByVariant)) {
                priceListItemsByVariant[key].sort((a, b) => a.priceListName.localeCompare(b.priceListName));
            }
        }
        
        const defaultVariant = variants.find(v => v.isDefault) || variants[0];
        
        result.push({
            id: product.id,
            name: product.name,
            description: product.description,
            brand: product.brand,
            categoryId: product.categoryId,
            categoryName: product.category?.name,
            productType: product.productType,
            isActive: product.isActive,
            imagePath: product.imagePath,
            createdAt: product.createdAt,
            baseUnitId: product.baseUnit?.id ?? product.baseUnitId,
            baseUnitSymbol: product.baseUnit?.symbol,
            baseUnitName: product.baseUnit?.name,
            isMultiVariant: variants.length > 1,
            // Datos de variante default
            sku: defaultVariant?.sku,
            barcode: defaultVariant?.barcode,
            basePrice: defaultVariant ? Number(defaultVariant.basePrice) : undefined,
            baseCost: defaultVariant ? Number(defaultVariant.baseCost) : undefined,
            unitId: defaultVariant?.unitId,
            unitOfMeasure: defaultVariant?.unit?.symbol,
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
                unitId: v.unitId,
                unitOfMeasure: v.unit?.symbol ?? '',
                attributeValues: v.attributeValues,
                isDefault: v.isDefault,
                isActive: v.isActive,
                priceListItems: priceListItemsByVariant[v.id] ?? [],
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
        relations: ['category', 'baseUnit']
    });
    
    if (!product) return null;
    
    const variants = await variantRepo.find({
        where: { productId: id, deletedAt: IsNull() },
        order: { isDefault: 'DESC', sku: 'ASC' }
    });
    
    return JSON.parse(JSON.stringify({ ...product, variants }));
}

/**
 * Actualiza un producto maestro
 */
export async function updateProduct(id: string, data: UpdateProductDTO): Promise<ProductResult> {
    try {
        const ds = await getDb();
        const productRepo = ds.getRepository(Product);
        const unitRepo = ds.getRepository(Unit);
        const variantRepo = ds.getRepository(ProductVariant);
        const session = await getCurrentSession();
        
        const product = await productRepo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }

        const detectedChanges = collectProductChanges(product, data);
        
        if (data.baseUnitId !== undefined) {
            if (!data.baseUnitId) {
                return { success: false, error: 'Debe seleccionar una unidad base válida' };
            }

            const baseUnit = await unitRepo.findOne({
                where: { id: data.baseUnitId, deletedAt: IsNull(), active: true },
            });

            if (!baseUnit || !baseUnit.isBase) {
                return { success: false, error: 'Unidad base no encontrada o inactiva' };
            }

            const variants = await variantRepo.find({
                where: { productId: id, deletedAt: IsNull() },
                relations: ['unit'],
            });

            const incompatibleVariant = variants.find((variant) => {
                const unit = variant.unit;
                if (!unit) {
                    return true;
                }
                const variantBaseId = unit.isBase ? unit.id : unit.baseUnitId;
                return variantBaseId !== baseUnit.id;
            });

            if (incompatibleVariant) {
                return { success: false, error: 'Existen variantes con unidades incompatibles con la unidad base solicitada' };
            }

            product.baseUnitId = baseUnit.id;
            product.baseUnit = baseUnit;
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
        
        if (detectedChanges.length > 0) {
            const nameChange = detectedChanges.find(change => change.field === 'name');
            const summaryLabel = (typeof nameChange?.newValue === 'string' && nameChange.newValue.length > 0)
                ? nameChange.newValue
                : product.name;

            const historyEntry = buildHistoryEntry({
                action: 'UPDATE',
                targetType: 'PRODUCT',
                targetId: product.id,
                targetLabel: summaryLabel,
                summary: buildSummary('UPDATE', 'PRODUCT', summaryLabel, detectedChanges.map(change => change.field)),
                userId: session?.id,
                userName: session?.userName,
                changes: detectedChanges,
            });
            addHistoryEntry(product, historyEntry);
        }

        await productRepo.save(product);
        revalidatePath('/admin/inventory/products');
        
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
 * Elimina un producto (soft delete) y todas sus variantes
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const productRepo = ds.getRepository(Product);
        const variantRepo = ds.getRepository(ProductVariant);
        const session = await getCurrentSession();
        
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

        const historyEntry = buildHistoryEntry({
            action: 'DELETE',
            targetType: 'PRODUCT',
            targetId: product.id,
            targetLabel: product.name,
            summary: buildSummary('DELETE', 'PRODUCT', product.name),
            userId: session?.id,
            userName: session?.userName,
            metadata: variants.length > 0
                ? {
                    variantsDeleted: variants.map((variant) => ({ id: variant.id, sku: variant.sku })),
                    variantCount: variants.length,
                }
                : undefined,
        });
        addHistoryEntry(product, historyEntry);

        await productRepo.save(product);
        
        for (const variant of variants) {
            await variantRepo.softRemove(variant);
        }
        
        // Soft delete producto
        await productRepo.softRemove(product);
        revalidatePath('/admin/inventory/products');
        
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
        .leftJoinAndSelect('product.baseUnit', 'baseUnit')
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
            isActive: product.isActive,
            imagePath: product.imagePath,
            createdAt: product.createdAt,
            baseUnitId: product.baseUnit?.id ?? product.baseUnitId,
            baseUnitSymbol: product.baseUnit?.symbol,
            baseUnitName: product.baseUnit?.name,
            isMultiVariant: variants.length > 1,
            sku: defaultVariant?.sku,
            barcode: defaultVariant?.barcode,
            basePrice: defaultVariant ? Number(defaultVariant.basePrice) : undefined,
            baseCost: defaultVariant ? Number(defaultVariant.baseCost) : undefined,
            unitId: defaultVariant?.unitId,
            unitOfMeasure: defaultVariant?.unit?.symbol,
            trackInventory: defaultVariant?.trackInventory,
            allowNegativeStock: defaultVariant?.allowNegativeStock,
            variantCount: variants.length,
            variants: variants.map(v => ({
                id: v.id,
                sku: v.sku,
                barcode: v.barcode,
                basePrice: Number(v.basePrice),
                baseCost: Number(v.baseCost),
                unitId: v.unitId,
                unitOfMeasure: v.unit?.symbol ?? '',
                attributeValues: v.attributeValues,
                isDefault: v.isDefault,
                isActive: v.isActive
            }))
        });
    }
    
    return JSON.parse(JSON.stringify(result));
}
