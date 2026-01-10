'use server'

import { getDb } from '@/data/db';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Product, type ProductChangeHistoryChange } from '@/data/entities/Product';
import { Attribute } from '@/data/entities/Attribute';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { Tax } from '@/data/entities/Tax';
import { Unit } from '@/data/entities/Unit';
import { computePriceWithTaxes } from '@/lib/pricing/priceCalculations';
import { revalidatePath } from 'next/cache';
import { DataSource, In, IsNull } from 'typeorm';
import { getCurrentSession } from './auth.server';
import { addHistoryEntry, areValuesEqual, buildHistoryEntry, buildSummary } from './utils/productHistory';

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

function normalizeStringArray(ids?: string[] | null): string[] {
    const sanitized = sanitizeIdArray(ids);
    sanitized.sort();
    return sanitized;
}

function collectVariantChanges(variant: ProductVariant, data: UpdateVariantDTO): ProductChangeHistoryChange[] {
    const changes: ProductChangeHistoryChange[] = [];

    if (data.sku !== undefined && data.sku !== variant.sku) {
        changes.push({ field: 'sku', previousValue: variant.sku, newValue: data.sku });
    }

    if (data.barcode !== undefined && data.barcode !== variant.barcode) {
        changes.push({ field: 'barcode', previousValue: variant.barcode, newValue: data.barcode });
    }

    if (data.basePrice !== undefined && Number(data.basePrice) !== Number(variant.basePrice)) {
        changes.push({ field: 'basePrice', previousValue: Number(variant.basePrice), newValue: Number(data.basePrice) });
    }

    if (data.baseCost !== undefined && Number(data.baseCost) !== Number(variant.baseCost)) {
        changes.push({ field: 'baseCost', previousValue: Number(variant.baseCost), newValue: Number(data.baseCost) });
    }

    if (data.unitId !== undefined && data.unitId !== variant.unitId) {
        changes.push({ field: 'unitId', previousValue: variant.unitId, newValue: data.unitId });
    }

    if (data.weight !== undefined && Number(data.weight) !== Number(variant.weight)) {
        changes.push({ field: 'weight', previousValue: Number(variant.weight), newValue: Number(data.weight) });
    }

    if (data.attributeValues !== undefined && !areValuesEqual(variant.attributeValues ?? null, data.attributeValues ?? null)) {
        changes.push({ field: 'attributeValues', previousValue: variant.attributeValues, newValue: data.attributeValues });
    }

    if (data.taxIds !== undefined) {
        const current = normalizeStringArray(variant.taxIds);
        const next = normalizeStringArray(data.taxIds);
        if (!areValuesEqual(current, next)) {
            changes.push({ field: 'taxIds', previousValue: current, newValue: next });
        }
    }

    if (data.trackInventory !== undefined && data.trackInventory !== variant.trackInventory) {
        changes.push({ field: 'trackInventory', previousValue: variant.trackInventory, newValue: data.trackInventory });
    }

    if (data.allowNegativeStock !== undefined && data.allowNegativeStock !== variant.allowNegativeStock) {
        changes.push({ field: 'allowNegativeStock', previousValue: variant.allowNegativeStock, newValue: data.allowNegativeStock });
    }

    if (data.minimumStock !== undefined && Number(data.minimumStock) !== Number(variant.minimumStock)) {
        changes.push({ field: 'minimumStock', previousValue: Number(variant.minimumStock), newValue: Number(data.minimumStock) });
    }

    if (data.maximumStock !== undefined && Number(data.maximumStock) !== Number(variant.maximumStock)) {
        changes.push({ field: 'maximumStock', previousValue: Number(variant.maximumStock), newValue: Number(data.maximumStock) });
    }

    if (data.reorderPoint !== undefined && Number(data.reorderPoint) !== Number(variant.reorderPoint)) {
        changes.push({ field: 'reorderPoint', previousValue: Number(variant.reorderPoint), newValue: Number(data.reorderPoint) });
    }

    if (data.imagePath !== undefined && data.imagePath !== variant.imagePath) {
        changes.push({ field: 'imagePath', previousValue: variant.imagePath, newValue: data.imagePath });
    }

    if (data.isActive !== undefined && data.isActive !== variant.isActive) {
        changes.push({ field: 'isActive', previousValue: variant.isActive, newValue: data.isActive });
    }

    return changes;
}

function buildVariantCreationChanges(variant: ProductVariant): ProductChangeHistoryChange[] {
    return [
        { field: 'sku', newValue: variant.sku },
        { field: 'basePrice', newValue: Number(variant.basePrice) },
        { field: 'baseCost', newValue: Number(variant.baseCost) },
        { field: 'unitId', newValue: variant.unitId },
    ];
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
    isActive: boolean;
    variantCount: number;
    isMultiVariant: boolean;
    variants: VariantDisplay[];
}

interface VariantPriceListDisplay {
    priceListId: string;
    priceListName: string;
    currency: string;
    netPrice: number;
    grossPrice: number;
    taxIds: string[];
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
    isActive: boolean;
    priceListItems?: VariantPriceListDisplay[];
}

/**
 * Genera el nombre para mostrar de una variante basado en sus atributos
 */
async function generateVariantDisplayName(
    attributeValues: Record<string, string> | undefined | null,
    attributes: Attribute[]
): Promise<string> {
    if (!attributeValues || Object.keys(attributeValues).length === 0) {
        return 'Variante sin atributos';
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
    
    return parts.join(', ') || 'Variante sin atributos';
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
    const priceListItemRepo = ds.getRepository(PriceListItem);
    
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
            order: { createdAt: 'ASC', sku: 'ASC' }
        });
        
        const variantIds = variants.map((v) => v.id);
        let priceListItemsByVariant: Record<string, VariantPriceListDisplay[]> = {};

        if (variantIds.length > 0) {
            const items = await priceListItemRepo.find({
                where: {
                    productVariantId: In(variantIds),
                    deletedAt: IsNull(),
                },
                relations: ['priceList'],
            });

            priceListItemsByVariant = items.reduce<Record<string, VariantPriceListDisplay[]>>((acc, item) => {
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
                isActive: v.isActive,
                priceListItems: priceListItemsByVariant[v.id] ?? [],
            });
        }
        
        result.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            categoryId: product.categoryId,
            categoryName: product.category?.name,
            isActive: product.isActive,
            variantCount: variants.length,
            isMultiVariant: variants.length > 1,
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
        order: { createdAt: 'ASC', sku: 'ASC' }
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
        const session = await getCurrentSession();
        
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
            isActive: true
        });
        
        await repo.save(variant);
        
        // Registrar precios por lista, si se entregaron
        await persistPriceListItemsForVariant(ds, {
            entries: data.priceListItems,
            productId: product.id,
            variantId: variant.id,
        });

        const historyEntry = buildHistoryEntry({
            action: 'CREATE',
            targetType: 'VARIANT',
            targetId: variant.id,
            targetLabel: variant.sku,
            summary: buildSummary('CREATE', 'VARIANT', variant.sku),
            userId: session?.id,
            userName: session?.userName,
            changes: buildVariantCreationChanges(variant),
            metadata: {
                attributeValues: variant.attributeValues ?? null,
                priceListItemCount: Array.isArray(data.priceListItems) ? data.priceListItems.length : 0,
            },
        });
        addHistoryEntry(product, historyEntry);
        await productRepo.save(product);
        
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
        const productRepo = ds.getRepository(Product);
        const priceListItemRepo = ds.getRepository(PriceListItem);
        const session = await getCurrentSession();
        
        const variant = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!variant) {
            return { success: false, error: 'Variante no encontrada' };
        }

        if (!variant.productId) {
            return { success: false, error: 'La variante no está asociada a un producto válido' };
        }

        const variantChanges = collectVariantChanges(variant, data);
        
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

        if (data.priceListItems !== undefined) {
            const existingItems = await priceListItemRepo.find({
                where: { productVariantId: variant.id, deletedAt: IsNull() },
            });

            const normalizeExisting = existingItems
                .map((item) => ({
                    priceListId: item.priceListId ?? '',
                    grossPrice: Number(item.grossPrice),
                    taxIds: normalizeStringArray(item.taxIds as string[] | undefined),
                }))
                .filter((entry) => entry.priceListId)
                .sort((a, b) => a.priceListId.localeCompare(b.priceListId));

            const normalizedNext = (Array.isArray(data.priceListItems) ? data.priceListItems : [])
                .map((entry) => ({
                    priceListId: typeof entry?.priceListId === 'string' ? entry.priceListId.trim() : '',
                    grossPrice: Number(entry?.grossPrice),
                    taxIds: normalizeStringArray(entry?.taxIds),
                }))
                .filter((entry) => entry.priceListId && Number.isFinite(entry.grossPrice) && entry.grossPrice >= 0)
                .sort((a, b) => a.priceListId.localeCompare(b.priceListId));

            const hasDifference = JSON.stringify(normalizeExisting) !== JSON.stringify(normalizedNext);

            if (hasDifference) {
                if (existingItems.length > 0) {
                    await priceListItemRepo.remove(existingItems);
                }

                if (normalizedNext.length > 0) {
                    await persistPriceListItemsForVariant(ds, {
                        entries: normalizedNext.map((entry) => ({
                            priceListId: entry.priceListId,
                            grossPrice: entry.grossPrice,
                            taxIds: entry.taxIds,
                        })),
                        productId: variant.productId,
                        variantId: variant.id,
                    });
                }

                variantChanges.push({
                    field: 'priceListItems',
                    previousValue: normalizeExisting,
                    newValue: normalizedNext,
                });
            }
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

        const product = await productRepo.findOne({
            where: { id: variant.productId, deletedAt: IsNull() }
        });

        if (product && variantChanges.length > 0) {
            const variantLabel = variant.sku;

            const historyEntry = buildHistoryEntry({
                action: 'UPDATE',
                targetType: 'VARIANT',
                targetId: variant.id,
                targetLabel: variantLabel,
                summary: buildSummary('UPDATE', 'VARIANT', variantLabel, variantChanges.map(change => change.field)),
                userId: session?.id,
                userName: session?.userName,
                changes: variantChanges,
            });

            addHistoryEntry(product, historyEntry);
            await productRepo.save(product);
        }
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
        const session = await getCurrentSession();
        
        const variant = await repo.findOne({
            where: { id, deletedAt: IsNull() }
        });
        
        if (!variant) {
            return { success: false, error: 'Variante no encontrada' };
        }

        const product = await productRepo.findOne({
            where: { id: variant.productId, deletedAt: IsNull() }
        });
        
        // Verificar que no es la última variante
        const variantCount = await repo.count({
            where: { productId: variant.productId, deletedAt: IsNull() }
        });
        
        if (variantCount <= 1) {
            return { success: false, error: 'No se puede eliminar la última variante de un producto' };
        }
        
        if (product) {
            const historyEntry = buildHistoryEntry({
                action: 'DELETE',
                targetType: 'VARIANT',
                targetId: variant.id,
                targetLabel: variant.sku,
                summary: buildSummary('DELETE', 'VARIANT', variant.sku),
                userId: session?.id,
                userName: session?.userName,
                metadata: {
                    attributeValues: variant.attributeValues ?? null,
                },
            });
            addHistoryEntry(product, historyEntry);
        }

        await repo.softRemove(variant);

        if (product) {
            await productRepo.save(product);
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
        const session = await getCurrentSession();
        
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
                isActive: true
            });
            
            await repo.save(variant);
            await persistPriceListItemsForVariant(ds, {
                entries: v.priceListItems,
                productId: product.id,
                variantId: variant.id,
            });
            createdVariants.push(variant);

            const historyEntry = buildHistoryEntry({
                action: 'CREATE',
                targetType: 'VARIANT',
                targetId: variant.id,
                targetLabel: variant.sku,
                summary: buildSummary('CREATE', 'VARIANT', variant.sku),
                userId: session?.id,
                userName: session?.userName,
                changes: buildVariantCreationChanges(variant),
                metadata: {
                    attributeValues: variant.attributeValues ?? null,
                    priceListItemCount: Array.isArray(v.priceListItems) ? v.priceListItems.length : 0,
                },
            });
            addHistoryEntry(product, historyEntry);
        }

        if (createdVariants.length > 0) {
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
