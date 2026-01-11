'use server'

import { getDb } from '@/data/db';
import { PriceList, PriceListType } from '@/data/entities/PriceList';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { Product } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Tax } from '@/data/entities/Tax';
import { computePriceWithTaxes } from '@/lib/pricing/priceCalculations';
import { revalidatePath } from 'next/cache';
import { DataSource, In, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

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
    netPrice?: number;
    grossPrice?: number;
    minPrice?: number;
    discountPercentage?: number;
    taxIds?: string[];
}

interface UpdatePriceListItemDTO {
    netPrice?: number;
    grossPrice?: number;
    minPrice?: number;
    discountPercentage?: number;
    taxIds?: string[];
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

export interface ProductPriceDetails {
    netPrice: number;
    grossPrice: number;
    taxIds: string[];
    priceListId?: string;
    priceListItemId?: string;
    productVariantId?: string;
    source: 'PRICE_LIST' | 'DEFAULT_VARIANT';
}

type ProductContext = {
    product: Product | null;
    variant: ProductVariant | null;
};

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

async function loadProductContext(
    ds: DataSource,
    productId: string,
    productVariantId?: string
): Promise<ProductContext & { productId: string }> {
    const productRepo = ds.getRepository(Product);
    const variantRepo = ds.getRepository(ProductVariant);

    let variant: ProductVariant | null = null;
    if (productVariantId) {
        variant = await variantRepo.findOne({
            where: { id: productVariantId, deletedAt: IsNull() },
        });
    }

    const resolvedProductId = variant?.productId ?? productId;
    const product = await productRepo.findOne({
        where: { id: resolvedProductId, deletedAt: IsNull() },
    });

    return { product, variant, productId: resolvedProductId };
}

async function resolveApplicableTaxes(
    ds: DataSource,
    options: {
        explicitTaxIds?: string[] | null;
        productId: string;
        productVariantId?: string;
        fallbackTaxIds?: string[] | null;
    }
): Promise<ProductContext & { taxIds: string[]; taxes: Tax[]; productId: string }> {
    const { product, variant, productId } = await loadProductContext(
        ds,
        options.productId,
        options.productVariantId
    );

    const explicitTaxIds = sanitizeIdArray(options.explicitTaxIds);
    const fallbackIds = sanitizeIdArray(options.fallbackTaxIds);
    const variantTaxIds = sanitizeIdArray(variant?.taxIds as string[] | undefined);
    const productTaxIds = sanitizeIdArray(product?.taxIds as string[] | undefined);

    const candidateTaxIds =
        explicitTaxIds.length > 0
            ? explicitTaxIds
            : fallbackIds.length > 0
            ? fallbackIds
            : variantTaxIds.length > 0
            ? variantTaxIds
            : productTaxIds;

    if (candidateTaxIds.length === 0) {
        return { product, variant, productId, taxIds: [], taxes: [] };
    }

    const taxRepo = ds.getRepository(Tax);
    const taxes = await taxRepo.find({
        where: {
            id: In(candidateTaxIds),
            deletedAt: IsNull(),
            isActive: true,
        },
    });

    const availableIds = new Set(taxes.map((tax) => tax.id));
    const filteredTaxIds = candidateTaxIds.filter((id) => availableIds.has(id));

    return { product, variant, productId, taxIds: filteredTaxIds, taxes };
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
    
    const lists = await repo.find({
        where,
        order: { priority: 'DESC', name: 'ASC' }
    });

    return lists.map((list) => JSON.parse(JSON.stringify(list)));
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
    
    const lists = await repo.createQueryBuilder('priceList')
        .where('priceList.deletedAt IS NULL')
        .andWhere('priceList.isActive = true')
        .andWhere('(priceList.validFrom IS NULL OR priceList.validFrom <= :now)', { now })
        .andWhere('(priceList.validUntil IS NULL OR priceList.validUntil >= :now)', { now })
        .orderBy('priceList.priority', 'DESC')
        .getMany();

    return lists.map((list) => JSON.parse(JSON.stringify(list)));
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
            description: data.description,
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
    
    const items = await repo.find({
        where: { priceListId, deletedAt: IsNull() },
        relations: ['product', 'productVariant'],
        order: { createdAt: 'DESC' }
    });

    return items.map((item) => JSON.parse(JSON.stringify(item)));
}

/**
 * Obtiene el precio de un producto en una lista de precios
 */
export async function getProductPrice(
    productId: string,
    priceListId?: string,
    productVariantId?: string
): Promise<ProductPriceDetails | null> {
    const ds = await getDb();
    const itemRepo = ds.getRepository(PriceListItem);

    const tryResolveFromItem = async (
        item: PriceListItem | null,
        source: ProductPriceDetails['source']
    ): Promise<ProductPriceDetails | null> => {
        if (!item) {
            return null;
        }

        const { taxIds, taxes } = await resolveApplicableTaxes(ds, {
            explicitTaxIds: item.taxIds as string[] | undefined,
            productId: item.productId ?? productId,
            productVariantId: item.productVariantId ?? productVariantId,
        });

        const computed = computePriceWithTaxes({
            netPrice: item.netPrice,
            grossPrice: item.grossPrice,
            taxRates: taxes.map((tax) => tax.rate),
        });

        return {
            netPrice: computed.netPrice,
            grossPrice: computed.grossPrice,
            taxIds,
            priceListId: item.priceListId ?? priceListId,
            priceListItemId: item.id,
            productVariantId: item.productVariantId ?? productVariantId,
            source,
        };
    };

    if (priceListId) {
        const directItem = await itemRepo.findOne({
            where: {
                priceListId,
                productId,
                productVariantId: productVariantId || IsNull(),
                deletedAt: IsNull(),
            },
        });
        const directPrice = await tryResolveFromItem(directItem, 'PRICE_LIST');
        if (directPrice) {
            return directPrice;
        }
    }

    const defaultList = await getDefaultPriceList();
    if (defaultList) {
        const defaultItem = await itemRepo.findOne({
            where: {
                priceListId: defaultList.id,
                productId,
                productVariantId: productVariantId || IsNull(),
                deletedAt: IsNull(),
            },
        });
        const defaultPrice = await tryResolveFromItem(defaultItem, 'PRICE_LIST');
        if (defaultPrice) {
            return defaultPrice;
        }
    }

    const { product, variant, productId: resolvedProductId } = await loadProductContext(
        ds,
        productId,
        productVariantId
    );
    const variantRepo = ds.getRepository(ProductVariant);
    const effectiveVariant =
        variant ||
        (await variantRepo.findOne({
            where: { productId: resolvedProductId, deletedAt: IsNull() },
            order: { createdAt: 'ASC', sku: 'ASC' },
        }));

    if (!effectiveVariant) {
        const fallbackVariant = await variantRepo.findOne({
            where: { productId: resolvedProductId, deletedAt: IsNull() },
        });
        if (!fallbackVariant) {
            return null;
        }
        const { taxIds, taxes } = await resolveApplicableTaxes(ds, {
            productId: fallbackVariant.productId ?? resolvedProductId,
            productVariantId: fallbackVariant.id,
        });
        const computed = computePriceWithTaxes({
            netPrice: fallbackVariant.basePrice,
            grossPrice: undefined,
            taxRates: taxes.map((tax) => tax.rate),
        });
        return {
            netPrice: computed.netPrice,
            grossPrice: computed.grossPrice,
            taxIds,
            productVariantId: fallbackVariant.id,
            source: 'DEFAULT_VARIANT',
        };
    }

    const { taxIds, taxes } = await resolveApplicableTaxes(ds, {
        productId: effectiveVariant.productId ?? resolvedProductId,
        productVariantId: effectiveVariant.id,
    });
    const computed = computePriceWithTaxes({
        netPrice: effectiveVariant.basePrice,
        grossPrice: undefined,
        taxRates: taxes.map((tax) => tax.rate),
    });

    return {
        netPrice: computed.netPrice,
        grossPrice: computed.grossPrice,
        taxIds,
        productVariantId: effectiveVariant.id,
        source: 'DEFAULT_VARIANT',
    };
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

        if (data.netPrice === undefined && data.grossPrice === undefined) {
            return { success: false, error: 'Debe ingresar un precio neto o bruto' };
        }

        const { taxIds, taxes } = await resolveApplicableTaxes(ds, {
            explicitTaxIds: data.taxIds,
            productId: data.productId,
            productVariantId: data.productVariantId,
        });

        const computed = computePriceWithTaxes({
            netPrice: data.netPrice,
            grossPrice: data.grossPrice,
            taxRates: taxes.map((tax) => tax.rate),
        });

        const item = repo.create({
            priceListId: data.priceListId,
            productId: data.productId,
            productVariantId: data.productVariantId,
            netPrice: computed.netPrice,
            grossPrice: computed.grossPrice,
            taxIds: taxIds.length > 0 ? taxIds : null,
            minPrice: data.minPrice,
            discountPercentage: data.discountPercentage ?? 0,
        });

        await repo.save(item);
        revalidatePath('/admin/inventory/products');
        
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
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
        const shouldRecalculate =
            data.netPrice !== undefined ||
            data.grossPrice !== undefined ||
            data.taxIds !== undefined;

        if (shouldRecalculate) {
            const productId = item.productId;
            if (!productId) {
                return { success: false, error: 'El item no tiene producto asociado' };
            }

            const { taxIds, taxes } = await resolveApplicableTaxes(ds, {
                explicitTaxIds: data.taxIds ?? (item.taxIds as string[] | undefined),
                fallbackTaxIds: item.taxIds as string[] | undefined,
                productId,
                productVariantId: item.productVariantId ?? undefined,
            });

            const computed = computePriceWithTaxes({
                netPrice: data.netPrice ?? item.netPrice,
                grossPrice: data.grossPrice ?? item.grossPrice,
                taxRates: taxes.map((tax) => tax.rate),
            });

            item.netPrice = computed.netPrice;
            item.grossPrice = computed.grossPrice;
            item.taxIds = taxIds.length > 0 ? taxIds : null;
        } else {
            if (data.netPrice !== undefined) {
                item.netPrice = data.netPrice;
            }
            if (data.grossPrice !== undefined) {
                item.grossPrice = data.grossPrice;
            }
            if (data.taxIds !== undefined) {
                const sanitized = sanitizeIdArray(data.taxIds);
                item.taxIds = sanitized.length > 0 ? sanitized : null;
            }
        }

        if (data.minPrice !== undefined) item.minPrice = data.minPrice;
        if (data.discountPercentage !== undefined) item.discountPercentage = data.discountPercentage;

        await repo.save(item);
        revalidatePath('/admin/inventory/products');
        
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
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
        revalidatePath('/admin/inventory/products');
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting price list item:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al eliminar el item' 
        };
    }
}
