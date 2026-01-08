'use server'

import { getDb } from '@/data/db';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Product } from '@/data/entities/Product';
import { Attribute } from '@/data/entities/Attribute';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { Tax } from '@/data/entities/Tax';
import { Unit } from '@/data/entities/Unit';
import { computePriceWithTaxes } from '@/lib/pricing/priceCalculations';
import { revalidatePath } from 'next/cache';
import { DataSource, In, IsNull } from 'typeorm';

// Types
interface CreateVariantDTO {
    productId: string;
    sku: string;
    barcode?: string;
    basePrice: number;
    baseCost?: number;
    unitId: string;
    weight?: number;
    /** Valores de atributos: { "attributeId": "opción seleccionada" } */
    attributeValues?: Record<string, string>;
    taxIds?: string[];
    priceListItems?: VariantPriceListItemInput[];
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    minimumStock?: number;
    maximumStock?: number;
    reorderPoint?: number;
    imagePath?: string;
}

interface VariantPriceListItemInput {
    priceListId: string;
    grossPrice: number;
    taxIds?: string[];
}

function sanitizeIdArray(ids?: string[] | null): string[] {
    if (!ids) {
        return [];
    }

    const seen = new Set<string>();
    const sanitized: string[] = [];

    for (const rawId of ids) {
        if (typeof rawId !== 'string') {
            continue;
        }
        const trimmed = rawId.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }
        seen.add(trimmed);
        sanitized.push(trimmed);
    }

    return sanitized;
}

async function persistPriceListItemsForVariant(
    ds: DataSource,
    params: { entries?: VariantPriceListItemInput[]; productId: string; variantId: string }
): Promise<void> {
    const { entries, productId, variantId } = params;
    if (!Array.isArray(entries) || entries.length === 0) {
        return;
    }

    const priceListItemRepo = ds.getRepository(PriceListItem);
    const taxRepo = ds.getRepository(Tax);

    for (const entry of entries) {
        if (!entry || !entry.priceListId) {
            continue;
        }

        const sanitizedGross = Number(entry.grossPrice);
        if (!Number.isFinite(sanitizedGross) || sanitizedGross < 0) {
            continue;
        }

        const sanitizedTaxIds = sanitizeIdArray(entry.taxIds);
        const taxes = sanitizedTaxIds.length > 0
            ? await taxRepo.find({
                where: {
                    id: In(sanitizedTaxIds),
                    deletedAt: IsNull(),
                    isActive: true,
                },
            })
            : [];

        const taxRates = taxes.map((tax) => Number(tax.rate) || 0);
        const computed = computePriceWithTaxes({
            grossPrice: sanitizedGross,
            taxRates,
        });

        const priceListItem = priceListItemRepo.create({
            priceListId: entry.priceListId,
            productId,
            productVariantId: variantId,
            netPrice: computed.netPrice,
            grossPrice: computed.grossPrice,
            taxIds: sanitizedTaxIds.length > 0 ? sanitizedTaxIds : null,
        });

        await priceListItemRepo.save(priceListItem);
    }
}

interface UpdateVariantDTO {
    sku?: string;
    barcode?: string;
    basePrice?: number;
    baseCost?: number;
    unitId?: string;
    weight?: number;
    attributeValues?: Record<string, string>;
    taxIds?: string[];
    priceListItems?: VariantPriceListItemInput[];
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    minimumStock?: number;
    maximumStock?: number;
    reorderPoint?: number;
    imagePath?: string;
    isActive?: boolean;
}

interface VariantResult {
    success: boolean;
    variant?: ProductVariant;
    error?: string;
}

/**
 * Producto con sus variantes para la UI de variantes
 */
export interface ProductWithVariants {
    id: string;
    name: string;
    brand?: string;
    categoryId?: string;
    categoryName?: string;
    hasVariants: boolean;
    isActive: boolean;
    variantCount: number;
    variants: VariantDisplay[];
}

export interface VariantDisplay {
    id: string;
    sku: string;
    barcode?: string;
    basePrice: number;
    baseCost: number;
    unitId: string;
    unitOfMeasure: string;
    /** Valores de atributos: { "attributeId": "opción" } */
    attributeValues?: Record<string, string>;
    /** Nombre generado a partir de los atributos para mostrar en UI */
    displayName: string;
    trackInventory: boolean;
    allowNegativeStock: boolean;
    isDefault: boolean;
    isActive: boolean;
}

/**
 * Genera el nombre para mostrar de una variante basado en sus atributos
 */
async function generateVariantDisplayName(
    attributeValues: Record<string, string> | undefined | null,
    attributes: Attribute[]
): Promise<string> {
    if (!attributeValues || Object.keys(attributeValues).length === 0) {
        return 'Default';
    }
    
    const parts: string[] = [];
    for (const [attrId, value] of Object.entries(attributeValues)) {
        const attr = attributes.find(a => a.id === attrId);
        if (attr) {
            parts.push(`${attr.name}: ${value}`);
        } else {
            parts.push(value);
        }
    }
    
    return parts.join(', ') || 'Default';
}

/**
 * Obtiene productos con sus variantes
 */
export async function getProductsWithVariants(params?: {
    search?: string;
    categoryId?: string;
}): Promise<ProductWithVariants[]> {
    const ds = await getDb();
    const productRepo = ds.getRepository(Product);
    const variantRepo = ds.getRepository(ProductVariant);
    const attributeRepo = ds.getRepository(Attribute);
    
    // Obtener todos los atributos para generar displayNames
    const allAttributes = await attributeRepo.find({ where: { deletedAt: IsNull() } });
    
    const queryBuilder = productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .where('product.deletedAt IS NULL');
    
    if (params?.search) {
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
    
    queryBuilder.orderBy('product.name', 'ASC');
    
    const products = await queryBuilder.getMany();
    
    // Obtener variantes para cada producto
    const result: ProductWithVariants[] = [];
    
    for (const product of products) {
        const variants = await variantRepo.find({
            where: { productId: product.id, deletedAt: IsNull() },
            order: { isDefault: 'DESC', sku: 'ASC' }
        });
        
        const variantDisplays: VariantDisplay[] = [];
        for (const v of variants) {
            const displayName = await generateVariantDisplayName(v.attributeValues, allAttributes);
            variantDisplays.push({
                id: v.id,
                sku: v.sku,
                barcode: v.barcode,
                basePrice: Number(v.basePrice),
                baseCost: Number(v.baseCost),
                unitId: v.unitId,
                unitOfMeasure: v.unit?.symbol ?? '',
                attributeValues: v.attributeValues,
                displayName,
                trackInventory: v.trackInventory,
                allowNegativeStock: v.allowNegativeStock,
                isDefault: v.isDefault,
                isActive: v.isActive
            });
        }
        
        result.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            categoryId: product.categoryId,
            categoryName: product.category?.name,
            hasVariants: product.hasVariants,
            isActive: product.isActive,
            variantCount: variants.length,
            variants: variantDisplays
        });
    }
    
    return JSON.parse(JSON.stringify(result));
}

/**
 * Obtiene todas las variantes de un producto
 */
export async function getVariantsByProductId(productId: string): Promise<ProductVariant[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    const variants = await repo.find({
        where: { productId, deletedAt: IsNull() },
        order: { isDefault: 'DESC', sku: 'ASC' }
    });
    
    return JSON.parse(JSON.stringify(variants));
}

/**
 * Obtiene una variante por ID
 */
export async function getVariantById(id: string): Promise<ProductVariant | null> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    const variant = await repo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: ['product']
    });
    
    return variant ? JSON.parse(JSON.stringify(variant)) : null;
}

/**
 * Obtiene una variante por SKU
 */
export async function getVariantBySku(sku: string): Promise<ProductVariant | null> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    const variant = await repo.findOne({
        where: { sku, deletedAt: IsNull() },
        relations: ['product']
    });
    
    return variant ? JSON.parse(JSON.stringify(variant)) : null;
}

/**
 * Crea una nueva variante de producto
 */
export async function createVariant(data: CreateVariantDTO): Promise<VariantResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        const productRepo = ds.getRepository(Product);
        const unitRepo = ds.getRepository(Unit);
        
        // Verificar que el producto existe
        const product = await productRepo.findOne({
            where: { id: data.productId, deletedAt: IsNull() }
        });
        
        if (!product) {
            return { success: false, error: 'Producto no encontrado' };
        }

        const unit = await unitRepo.findOne({
            where: { id: data.unitId, deletedAt: IsNull(), active: true },
            relations: ['baseUnit'],
        });

        if (!unit) {
            return { success: false, error: 'Unidad de medida no encontrada o inactiva' };
        }

        if (!unit.isBase && (!unit.baseUnit || unit.baseUnit.dimension !== unit.dimension)) {
            return { success: false, error: 'Unidad de medida inválida para la dimensión seleccionada' };
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
            sku: data.sku,
            barcode: data.barcode,
            basePrice: data.basePrice,
            baseCost: data.baseCost || 0,
            unitId: unit.id,
            unit,
            weight: data.weight,
            attributeValues: data.attributeValues,
            taxIds: data.taxIds,
            trackInventory: data.trackInventory ?? true,
            allowNegativeStock: data.allowNegativeStock ?? false,
            minimumStock: data.minimumStock || 0,
            maximumStock: data.maximumStock || 0,
            reorderPoint: data.reorderPoint || 0,
            imagePath: data.imagePath,
            isDefault: false, // Variantes adicionales nunca son default
            isActive: true
        });
        
        await repo.save(variant);
        
        // Registrar precios por lista, si se entregaron
        await persistPriceListItemsForVariant(ds, {
            entries: data.priceListItems,
            productId: product.id,
            variantId: variant.id,
        });

        // Marcar el producto como hasVariants = true si no lo estaba
        if (!product.hasVariants) {
            product.hasVariants = true;
            await productRepo.save(product);
        }
        
        revalidatePath('/admin/inventory/products');
        revalidatePath('/admin/inventory/products/variants');
        
        return JSON.parse(JSON.stringify({ success: true, variant }));
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
        const unitRepo = ds.getRepository(Unit);
        
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
        
        if (data.unitId) {
            const unit = await unitRepo.findOne({
                where: { id: data.unitId, deletedAt: IsNull(), active: true },
                relations: ['baseUnit'],
            });

            if (!unit) {
                return { success: false, error: 'Unidad de medida no encontrada o inactiva' };
            }

            if (!unit.isBase && (!unit.baseUnit || unit.baseUnit.dimension !== unit.dimension)) {
                return { success: false, error: 'Unidad de medida inválida para la dimensión seleccionada' };
            }

            variant.unitId = unit.id;
            variant.unit = unit;
        }

        // Actualizar campos
        if (data.sku !== undefined) variant.sku = data.sku;
        if (data.barcode !== undefined) variant.barcode = data.barcode;
        if (data.basePrice !== undefined) variant.basePrice = data.basePrice;
        if (data.baseCost !== undefined) variant.baseCost = data.baseCost;
        if (data.weight !== undefined) variant.weight = data.weight;
        if (data.attributeValues !== undefined) variant.attributeValues = data.attributeValues;
        if (data.taxIds !== undefined) variant.taxIds = data.taxIds;
        if (data.trackInventory !== undefined) variant.trackInventory = data.trackInventory;
        if (data.allowNegativeStock !== undefined) variant.allowNegativeStock = data.allowNegativeStock;
        if (data.minimumStock !== undefined) variant.minimumStock = data.minimumStock;
        if (data.maximumStock !== undefined) variant.maximumStock = data.maximumStock;
        if (data.reorderPoint !== undefined) variant.reorderPoint = data.reorderPoint;
        if (data.imagePath !== undefined) variant.imagePath = data.imagePath;
        if (data.isActive !== undefined) variant.isActive = data.isActive;
        
        await repo.save(variant);
        revalidatePath('/admin/inventory/products');
        revalidatePath('/admin/inventory/products/variants');
        
        return JSON.parse(JSON.stringify({ success: true, variant }));
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
 * No permite eliminar la última variante de un producto
 */
export async function deleteVariant(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(ProductVariant);
        const productRepo = ds.getRepository(Product);
        const unitRepo = ds.getRepository(Unit);
        
        const variant = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!variant) {
            return { success: false, error: 'Variante no encontrada' };
        }
        
        // Verificar que no es la última variante
        const variantCount = await repo.count({
            where: { productId: variant.productId, deletedAt: IsNull() }
        });
        
        if (variantCount <= 1) {
            return { success: false, error: 'No se puede eliminar la última variante de un producto' };
        }
        
        // Si era la variante default, marcar otra como default
        if (variant.isDefault) {
            const otherVariant = await repo.findOne({
                where: { productId: variant.productId, deletedAt: IsNull() },
                order: { createdAt: 'ASC' }
            });
            
            if (otherVariant && otherVariant.id !== id) {
                otherVariant.isDefault = true;
                await repo.save(otherVariant);
            }
        }
        
        await repo.softRemove(variant);
        
        // Actualizar hasVariants si solo queda 1 variante
        const remainingCount = await repo.count({
            where: { productId: variant.productId, deletedAt: IsNull() }
        });
        
        if (remainingCount === 1) {
            const product = await productRepo.findOne({
                where: { id: variant.productId }
            });
            if (product) {
                product.hasVariants = false;
                await productRepo.save(product);
            }
        }
        
        revalidatePath('/admin/inventory/products');
        revalidatePath('/admin/inventory/products/variants');
        
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
        const unitRepo = ds.getRepository(Unit);
        
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
            const unit = await unitRepo.findOne({
                where: { id: v.unitId, deletedAt: IsNull(), active: true },
                relations: ['baseUnit'],
            });

            if (!unit) {
                return { success: false, error: 'Unidad de medida no encontrada o inactiva' };
            }

            if (!unit.isBase && (!unit.baseUnit || unit.baseUnit.dimension !== unit.dimension)) {
                return { success: false, error: `Unidad de medida inválida para la variante ${v.sku}` };
            }

            const variant = repo.create({
                productId,
                sku: v.sku,
                barcode: v.barcode,
                basePrice: v.basePrice,
                baseCost: v.baseCost || 0,
                unitId: unit.id,
                unit,
                weight: v.weight,
                attributeValues: v.attributeValues,
                taxIds: v.taxIds,
                trackInventory: v.trackInventory ?? true,
                allowNegativeStock: v.allowNegativeStock ?? false,
                minimumStock: v.minimumStock || 0,
                maximumStock: v.maximumStock || 0,
                reorderPoint: v.reorderPoint || 0,
                imagePath: v.imagePath,
                isDefault: false,
                isActive: true
            });
            
            await repo.save(variant);
            await persistPriceListItemsForVariant(ds, {
                entries: v.priceListItems,
                productId: product.id,
                variantId: variant.id,
            });
            createdVariants.push(variant);
        }
        
        // Marcar el producto como hasVariants
        if (!product.hasVariants && createdVariants.length > 0) {
            product.hasVariants = true;
            await productRepo.save(product);
        }
        
        revalidatePath('/admin/inventory/products');
        revalidatePath('/admin/inventory/products/variants');
        
        return { success: true, variants: JSON.parse(JSON.stringify(createdVariants)) };
    } catch (error) {
        console.error('Error creating bulk variants:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear las variantes' 
        };
    }
}

/**
 * Busca variantes por SKU o código de barras
 */
export async function searchVariants(query: string, limit: number = 20): Promise<ProductVariant[]> {
    const ds = await getDb();
    const repo = ds.getRepository(ProductVariant);
    
    const variants = await repo.createQueryBuilder('variant')
        .leftJoinAndSelect('variant.product', 'product')
        .where('variant.deletedAt IS NULL')
        .andWhere('variant.isActive = true')
        .andWhere(
            '(variant.sku LIKE :query OR variant.barcode LIKE :query)',
            { query: `%${query}%` }
        )
        .orderBy('variant.sku', 'ASC')
        .limit(limit)
        .getMany();
    
    return JSON.parse(JSON.stringify(variants));
}
