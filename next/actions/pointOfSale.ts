'use server';

import { getDb } from '@/data/db';
import { Branch } from '@/data/entities/Branch';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { PriceList } from '@/data/entities/PriceList';
import { PriceListItem } from '@/data/entities/PriceListItem';
import { Product } from '@/data/entities/Product';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Storage } from '@/data/entities/Storage';
import { Transaction, TransactionStatus, TransactionType } from '@/data/entities/Transaction';
import { TransactionLine } from '@/data/entities/TransactionLine';
import { Customer } from '@/data/entities/Customer';
import { getCurrentSession } from './auth.server';
import { In, IsNull, DataSource } from 'typeorm';

const INVENTORY_IN_TYPES: TransactionType[] = [
    TransactionType.PURCHASE,
    TransactionType.SALE_RETURN,
    TransactionType.TRANSFER_IN,
    TransactionType.ADJUSTMENT_IN,
];

const INVENTORY_OUT_TYPES: TransactionType[] = [
    TransactionType.SALE,
    TransactionType.PURCHASE_RETURN,
    TransactionType.TRANSFER_OUT,
    TransactionType.ADJUSTMENT_OUT,
];

export interface POSBranchSummary {
    id: string;
    name: string;
}

export interface POSStorageSummary {
    id: string;
    name: string;
    branchId?: string | null;
    branchName?: string | null;
    isDefault: boolean;
}

export interface POSPriceListSummary {
    id: string;
    name: string;
    currency: string;
    isDefault: boolean;
    priority: number;
}

export interface POSContextDTO {
    user?: {
        id: string;
        name?: string | null;
        userName?: string;
    } | null;
    pointOfSale?: {
        id: string;
        name: string;
        branchId?: string | null;
        defaultPriceListId: string;
    } | null;
    branch?: POSBranchSummary | null;
    storage?: POSStorageSummary | null;
    priceLists: POSPriceListSummary[];
    defaultPriceListId: string | null;
}

export interface POSProductListItem {
    variantId: string;
    productId?: string | null;
    productName: string;
    productBrand?: string | null;
    sku: string;
    barcode?: string | null;
    displayName: string;
    unitOfMeasure?: string | null;
    attributeValues?: Record<string, string> | null;
    netPrice: number;
    grossPrice: number;
    priceListId?: string | null;
    taxIds: string[];
    basePrice: number;
    baseCost: number;
    stock: number;
    trackInventory: boolean;
    allowNegativeStock: boolean;
}

export interface POSCustomerSummary {
    id: string;
    displayName: string;
    businessName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    documentNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
    defaultPaymentTermDays?: number | null;
}

export interface SearchCustomersForPOSParams {
    search?: string;
    limit?: number;
}

export interface SearchProductsForPOSParams {
    search?: string;
    storageId?: string;
    priceListId?: string;
    limit?: number;
}

const sanitizeNumber = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined) return fallback;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const buildVariantDisplayName = (product: Product | undefined, variant: ProductVariant): string => {
    const baseName = product?.name ?? 'Producto';
    const attributes = variant.attributeValues ?? undefined;
    if (!attributes || Object.keys(attributes).length === 0) {
        return baseName;
    }
    const values = Object.values(attributes).filter((value) => value && typeof value === 'string');
    if (values.length === 0) {
        return baseName;
    }
    return `${baseName} · ${values.join(' · ')}`;
};

const mapPriceLists = (lists: PriceList[]): POSPriceListSummary[] =>
    lists.map((list) => ({
        id: list.id,
        name: list.name,
        currency: list.currency,
        isDefault: Boolean(list.isDefault),
        priority: Number(list.priority ?? 0),
    }));

async function resolvePointOfSaleContext(): Promise<POSContextDTO> {
    const ds = await getDb();
    const [session, posRepo, branchRepo, storageRepo, priceListRepo] = [
        await getCurrentSession(),
        ds.getRepository(PointOfSale),
        ds.getRepository(Branch),
        ds.getRepository(Storage),
        ds.getRepository(PriceList),
    ];

    const pointOfSale = await posRepo
        .createQueryBuilder('pos')
        .leftJoinAndSelect('pos.branch', 'branch')
        .where('pos.deletedAt IS NULL')
        .andWhere('pos.isActive = :active', { active: true })
        .orderBy('pos.updatedAt', 'DESC')
        .limit(1)
        .getOne();

    const branch = pointOfSale?.branch
        ?? (await branchRepo
            .createQueryBuilder('branch')
            .where('branch.deletedAt IS NULL')
            .andWhere('branch.isActive = :active', { active: true })
            .orderBy('branch.isHeadquarters', 'DESC')
            .addOrderBy('branch.name', 'ASC')
            .limit(1)
            .getOne());

    const storageQb = storageRepo
        .createQueryBuilder('storage')
        .leftJoinAndSelect('storage.branch', 'branch')
        .where('storage.deletedAt IS NULL')
        .andWhere('storage.isActive = :active', { active: true })
        .orderBy('storage.isDefault', 'DESC')
        .addOrderBy('storage.name', 'ASC')
        .limit(1);

    if (branch?.id) {
        storageQb.andWhere('(storage.branchId = :branchId OR storage.branchId IS NULL)', { branchId: branch.id });
    }

    const storage = await storageQb.getOne();

    const priceLists = await priceListRepo
        .createQueryBuilder('list')
        .where('list.deletedAt IS NULL')
        .andWhere('list.isActive = :active', { active: true })
        .orderBy('list.isDefault', 'DESC')
        .addOrderBy('list.priority', 'DESC')
        .addOrderBy('list.name', 'ASC')
        .getMany();

    const mappedLists = mapPriceLists(priceLists);
    const fallbackPriceListId = mappedLists.find((list) => list.isDefault)?.id
        ?? mappedLists[0]?.id
        ?? null;
    const resolvedDefaultPriceListId = pointOfSale?.defaultPriceListId ?? fallbackPriceListId;

    return {
        user: session
            ? {
                id: session.id,
                name: session.name ?? null,
                userName: session.userName,
            }
            : null,
        pointOfSale: pointOfSale
            ? {
                id: pointOfSale.id,
                name: pointOfSale.name,
                branchId: pointOfSale.branchId ?? null,
                defaultPriceListId: pointOfSale.defaultPriceListId,
            }
            : null,
        branch: branch
            ? {
                id: branch.id,
                name: branch.name,
            }
            : null,
        storage: storage
            ? {
                id: storage.id,
                name: storage.name,
                branchId: storage.branchId ?? null,
                branchName: storage.branch?.name ?? null,
                isDefault: Boolean(storage.isDefault),
            }
            : null,
        priceLists: mappedLists,
        defaultPriceListId: resolvedDefaultPriceListId,
    };
}

async function fetchStockByVariant(dataSource: DataSource, storageId: string, variantIds: string[]): Promise<Map<string, number>> {
    if (!storageId || variantIds.length === 0) {
        return new Map();
    }

    const raw = await dataSource
        .getRepository(TransactionLine)
        .createQueryBuilder('line')
        .innerJoin(Transaction, 'tx', 'tx.id = line.transactionId')
        .select('line.productVariantId', 'variantId')
        .addSelect(
            `COALESCE(SUM(CASE
                WHEN tx.storageId = :storageId AND tx.transactionType IN (:...inTypes)
                    THEN COALESCE(line.quantityInBase, line.quantity)
                WHEN tx.storageId = :storageId AND tx.transactionType IN (:...outTypes)
                    THEN -COALESCE(line.quantityInBase, line.quantity)
                ELSE 0
            END), 0)`,
            'stock'
        )
        .where('line.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('tx.status = :status', { status: TransactionStatus.CONFIRMED })
        .groupBy('line.productVariantId')
        .setParameters({
            storageId,
            inTypes: INVENTORY_IN_TYPES,
            outTypes: INVENTORY_OUT_TYPES,
        })
        .getRawMany<{ variantId: string; stock: string | null }>();

    const stockMap = new Map<string, number>();
    for (const row of raw) {
        const numeric = sanitizeNumber(row.stock, 0);
        stockMap.set(row.variantId, numeric);
    }
    return stockMap;
}

export async function getPointOfSaleContext(): Promise<POSContextDTO> {
    const context = await resolvePointOfSaleContext();
    return JSON.parse(JSON.stringify(context));
}

export async function searchProductsForPOS(params?: SearchProductsForPOSParams): Promise<POSProductListItem[]> {
    const ds = await getDb();
    const variantRepo = ds.getRepository(ProductVariant);
    const priceListItemRepo = ds.getRepository(PriceListItem);

    const limit = params?.limit ? Math.min(Math.max(params.limit, 1), 50) : 20;
    const qb = variantRepo
        .createQueryBuilder('variant')
        .leftJoinAndSelect('variant.product', 'product')
        .where('variant.deletedAt IS NULL')
        .andWhere('variant.isActive = :active', { active: true })
        .andWhere('product.deletedAt IS NULL')
        .andWhere('product.isActive = :active', { active: true })
        .orderBy('product.name', 'ASC')
        .addOrderBy('variant.sku', 'ASC')
        .take(limit);

    if (params?.search) {
        const term = `%${params.search.trim().toLowerCase()}%`;
        qb.andWhere(
            '(LOWER(product.name) LIKE :term OR LOWER(variant.sku) LIKE :term OR LOWER(COALESCE(variant.barcode, "")) LIKE :term)',
            { term }
        );
    }

    const variants = await qb.getMany();
    if (variants.length === 0) {
        return [];
    }

    const variantIds = variants.map((variant) => variant.id);

    const priceListItems = params?.priceListId
        ? await priceListItemRepo.find({
            where: {
                priceListId: params.priceListId,
                productVariantId: In(variantIds),
                deletedAt: IsNull(),
            },
        })
        : [];

    const priceListByVariant = new Map<string, PriceListItem>();
    for (const item of priceListItems) {
        if (item.productVariantId) {
            priceListByVariant.set(item.productVariantId, item);
        }
    }

    const stockMap = params?.storageId
        ? await fetchStockByVariant(ds, params.storageId, variantIds)
        : new Map<string, number>();

    const products = variants.map<POSProductListItem>((variant) => {
        const product = variant.product as Product | undefined;
        const priceListItem = priceListByVariant.get(variant.id);
        const netPrice = sanitizeNumber(priceListItem?.netPrice, variant.basePrice);
        const grossPrice = sanitizeNumber(priceListItem?.grossPrice, variant.basePrice);
        const taxIds = Array.isArray(priceListItem?.taxIds)
            ? (priceListItem?.taxIds ?? []).filter((value): value is string => typeof value === 'string')
            : [];

        return {
            variantId: variant.id,
            productId: variant.productId ?? null,
            productName: product?.name ?? 'Producto',
            productBrand: product?.brand ?? null,
            sku: variant.sku,
            barcode: variant.barcode ?? null,
            displayName: buildVariantDisplayName(product, variant),
            unitOfMeasure: variant.unit?.symbol ?? null,
            attributeValues: variant.attributeValues ?? null,
            netPrice,
            grossPrice,
            priceListId: priceListItem?.priceListId ?? null,
            taxIds,
            basePrice: sanitizeNumber(variant.basePrice, netPrice),
            baseCost: sanitizeNumber(variant.baseCost, 0),
            stock: stockMap.get(variant.id) ?? 0,
            trackInventory: Boolean(variant.trackInventory),
            allowNegativeStock: Boolean(variant.allowNegativeStock),
        };
    });

    return JSON.parse(JSON.stringify(products));
}

const buildCustomerDisplayName = (customer: Customer): string => {
    const person = customer.person;
    if (!person) {
        return 'Cliente sin nombre';
    }
    if (person.businessName && person.businessName.trim().length > 0) {
        return person.businessName;
    }
    const parts = [person.firstName, person.lastName].filter((part) => part && part.trim().length > 0);
    return parts.length > 0 ? parts.join(' ') : 'Cliente sin nombre';
};

export async function searchCustomersForPOS(
    params?: SearchCustomersForPOSParams
): Promise<POSCustomerSummary[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Customer);

    const limit = params?.limit ? Math.min(Math.max(params.limit, 1), 50) : 10;

    const qb = repo
        .createQueryBuilder('customer')
        .leftJoinAndSelect('customer.person', 'person')
        .where('customer.deletedAt IS NULL')
        .andWhere('customer.isActive = :active', { active: true })
        .orderBy('COALESCE(person.businessName, person.firstName)', 'ASC')
        .addOrderBy('person.lastName', 'ASC')
        .take(limit);

    if (params?.search) {
        const term = `%${params.search.trim().toLowerCase()}%`;
        qb.andWhere(
            `(
                LOWER(COALESCE(person.businessName, '')) LIKE :term
                OR LOWER(COALESCE(person.firstName, '')) LIKE :term
                OR LOWER(COALESCE(person.lastName, '')) LIKE :term
                OR LOWER(COALESCE(person.documentNumber, '')) LIKE :term
            )`,
            { term }
        );
    }

    const customers = await qb.getMany();

    const results: POSCustomerSummary[] = customers.map((customer) => {
        const creditLimit = sanitizeNumber(customer.creditLimit, 0);
        const currentBalance = sanitizeNumber(customer.currentBalance, 0);
        const availableCredit = Math.max(creditLimit - currentBalance, 0);
        const person = customer.person;

        return {
            id: customer.id,
            displayName: buildCustomerDisplayName(customer),
            businessName: person?.businessName ?? null,
            firstName: person?.firstName ?? null,
            lastName: person?.lastName ?? null,
            documentNumber: person?.documentNumber ?? null,
            email: person?.email ?? null,
            phone: person?.phone ?? null,
            creditLimit,
            currentBalance,
            availableCredit,
            defaultPaymentTermDays: customer.defaultPaymentTermDays ?? null,
        };
    });

    return JSON.parse(JSON.stringify(results));
}
