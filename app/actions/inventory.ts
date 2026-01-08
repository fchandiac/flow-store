"use server";

import { getDb } from "@/data/db";
import { Branch } from "@/data/entities/Branch";
import { Product } from "@/data/entities/Product";
import { ProductVariant } from "@/data/entities/ProductVariant";
import { Storage, StorageCategory } from "@/data/entities/Storage";
import {
    Transaction,
    TransactionStatus,
    TransactionType,
} from "@/data/entities/Transaction";
import { TransactionLine } from "@/data/entities/TransactionLine";

export interface InventoryStorageBreakdown {
    storageId: string;
    storageName: string;
    branchId?: string | null;
    branchName?: string;
    quantity: number;
    quantityBase: number;
}

export type InventoryMovementDirection = "IN" | "OUT";

export interface InventoryMovementDTO {
    transactionId: string;
    documentNumber: string;
    transactionType: TransactionType;
    direction: InventoryMovementDirection;
    quantity: number;
    quantityBase: number;
    unitOfMeasure?: string | null;
    storageId?: string | null;
    storageName?: string | null;
    storageBranchId?: string | null;
    storageBranchName?: string | null;
    targetStorageId?: string | null;
    targetStorageName?: string | null;
    targetStorageBranchId?: string | null;
    targetStorageBranchName?: string | null;
    createdAt: string;
    variantNameSnapshot?: string | null;
    productNameSnapshot?: string;
    notes?: string | null;
}

export interface InventoryRowDTO {
    id: string;
    productId?: string;
    productName: string;
    productBrand?: string | null;
    attributeValues?: Record<string, string> | null;
    sku: string;
    barcode?: string | null;
    unitOfMeasure: string;
    unitConversionFactor: number;
    baseCost: number;
    basePrice: number;
    trackInventory: boolean;
    totalStock: number;
    totalStockBase: number;
    availableStock: number;
    availableStockBase: number;
    committedStock: number;
    committedStockBase: number;
    incomingStock: number;
    incomingStockBase: number;
    minimumStock: number;
    maximumStock: number;
    reorderPoint: number;
    storageCount: number;
    primaryStorageName?: string | null;
    primaryStorageQuantity?: number;
    lastMovementAt?: string | null;
    lastMovementType?: TransactionType | null;
    lastMovementDirection?: InventoryMovementDirection | null;
    isBelowMinimum: boolean;
    isBelowReorder: boolean;
    inventoryValueCost: number;
    inventoryValueCostBase: number;
    storageBreakdown: InventoryStorageBreakdown[];
    movements: InventoryMovementDTO[];
}

export interface InventoryFiltersDTO {
    branches: { id: string; name: string; isHeadquarters: boolean }[];
    storages: { id: string; name: string; code?: string | null; branchId?: string | null; branchName?: string | null; category: StorageCategory }[];
}

export interface GetInventoryStockParams {
    search?: string;
    storageId?: string;
    branchId?: string;
    includeZero?: boolean;
    limit?: number;
}

const MOVEMENT_DIRECTION: Record<TransactionType, InventoryMovementDirection | null> = {
    [TransactionType.SALE]: "OUT",
    [TransactionType.PURCHASE]: "IN",
    [TransactionType.PURCHASE_ORDER]: null,  // Órdenes de compra no mueven inventario
    [TransactionType.SALE_RETURN]: "IN",
    [TransactionType.PURCHASE_RETURN]: "OUT",
    [TransactionType.TRANSFER_OUT]: "OUT",
    [TransactionType.TRANSFER_IN]: "IN",
    [TransactionType.ADJUSTMENT_IN]: "IN",
    [TransactionType.ADJUSTMENT_OUT]: "OUT",
    [TransactionType.PAYMENT_IN]: null,
    [TransactionType.PAYMENT_OUT]: null,
};

function resolveDirection(type: TransactionType): InventoryMovementDirection | null {
    return MOVEMENT_DIRECTION[type] ?? null;
}

export async function getInventoryFilters(): Promise<InventoryFiltersDTO> {
    const ds = await getDb();
    const branchRepo = ds.getRepository(Branch);
    const storageRepo = ds.getRepository(Storage);

    const [branches, storages] = await Promise.all([
        branchRepo
            .createQueryBuilder("branch")
            .where("branch.deletedAt IS NULL")
            .andWhere("branch.isActive = :active", { active: true })
            .orderBy("branch.name", "ASC")
            .getMany(),
        storageRepo
            .createQueryBuilder("storage")
            .leftJoinAndSelect("storage.branch", "branch")
            .where("storage.deletedAt IS NULL")
            .andWhere("storage.isActive = :active", { active: true })
            .orderBy("storage.name", "ASC")
            .getMany(),
    ]);

    const filters: InventoryFiltersDTO = {
        branches: branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            isHeadquarters: branch.isHeadquarters,
        })),
        storages: storages.map((storage) => ({
            id: storage.id,
            name: storage.name,
            code: storage.code,
            branchId: storage.branchId ?? null,
            branchName: storage.branch?.name ?? null,
            category: storage.category,
        })),
    };

    return JSON.parse(JSON.stringify(filters));
}

export async function getInventoryStock(params?: GetInventoryStockParams): Promise<InventoryRowDTO[]> {
    const ds = await getDb();
    const variantRepo = ds.getRepository(ProductVariant);
    const storageRepo = ds.getRepository(Storage);

    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 100;

    const variantQB = variantRepo
        .createQueryBuilder("variant")
        .leftJoinAndSelect("variant.product", "product")
        .where("variant.deletedAt IS NULL")
        .andWhere("variant.trackInventory = :track", { track: true });

    if (params?.search) {
        const searchTerm = `%${params.search.toLowerCase()}%`;
        variantQB.andWhere(
            "LOWER(variant.sku) LIKE :search OR LOWER(product.name) LIKE :search",
            { search: searchTerm }
        );
    }

    variantQB.orderBy("product.name", "ASC").addOrderBy("variant.sku", "ASC").take(limit);

    const variants = await variantQB.getMany();

    if (variants.length === 0) {
        return [];
    }

    const storageQB = storageRepo
        .createQueryBuilder("storage")
        .leftJoinAndSelect("storage.branch", "branch");

    const storages = await storageQB.getMany();
    const storagesById = new Map(
        storages.map((storage) => [storage.id, storage])
    );

    let branchStorageIds: string[] | null = null;
    if (params?.branchId) {
        branchStorageIds = storages
            .filter((storage) => storage.branchId === params.branchId)
            .map((storage) => storage.id);

        if (branchStorageIds.length === 0) {
            return [];
        }
    }

    const variantIds = variants.map((variant) => variant.id);

    const lineQB = ds
        .getRepository(TransactionLine)
        .createQueryBuilder("line")
        .innerJoin(Transaction, "tx", "tx.id = line.transactionId")
        .leftJoin(Storage, "storage", "storage.id = tx.storageId")
        .leftJoin(Storage, "targetStorage", "targetStorage.id = tx.targetStorageId")
        .select("line.productVariantId", "variantId")
        .addSelect("line.productName", "productNameSnapshot")
        .addSelect("line.variantName", "variantNameSnapshot")
        .addSelect("line.quantity", "quantity")
        .addSelect("line.quantityInBase", "quantityInBase")
        .addSelect("line.unitOfMeasure", "unitOfMeasure")
        .addSelect("line.unitConversionFactor", "unitConversionFactor")
        .addSelect("tx.id", "transactionId")
        .addSelect("tx.transactionType", "transactionType")
        .addSelect("tx.documentNumber", "documentNumber")
        .addSelect("tx.storageId", "storageId")
        .addSelect("tx.targetStorageId", "targetStorageId")
        .addSelect("tx.createdAt", "createdAt")
        .addSelect("tx.notes", "notes")
        .addSelect("storage.name", "storageName")
        .addSelect("storage.code", "storageCode")
        .addSelect("storage.branchId", "storageBranchId")
        .addSelect("targetStorage.name", "targetStorageName")
        .addSelect("targetStorage.code", "targetStorageCode")
        .addSelect("targetStorage.branchId", "targetStorageBranchId")
        .where("line.productVariantId IN (:...variantIds)", { variantIds })
        .andWhere("tx.status = :status", { status: TransactionStatus.CONFIRMED })
        .orderBy("tx.createdAt", "DESC");

    if (params?.storageId) {
        lineQB.andWhere(
            "tx.storageId = :storageId OR tx.targetStorageId = :storageId",
            { storageId: params.storageId }
        );
    }

    if (branchStorageIds && branchStorageIds.length > 0) {
        lineQB.andWhere(
            "tx.storageId IN (:...branchStorageIds) OR tx.targetStorageId IN (:...branchStorageIds)",
            { branchStorageIds }
        );
    }

    const rawLines = await lineQB.getRawMany();

    const variantRows = variants.map<InventoryRowDTO>((variant) => {
        const product = variant.product as Product | undefined;
        const baseCost = Number(variant.baseCost || 0);
        const basePrice = Number(variant.basePrice || 0);
        const unitConversionFactor = Number(variant.unit?.conversionFactor ?? 1);

        return {
            id: variant.id,
            productId: variant.productId,
            productName: product?.name ?? "Producto",
            productBrand: product?.brand ?? null,
            attributeValues: variant.attributeValues ?? null,
            sku: variant.sku,
            barcode: variant.barcode ?? null,
            unitOfMeasure: variant.unit?.symbol ?? '',
            unitConversionFactor,
            baseCost,
            basePrice,
            trackInventory: variant.trackInventory,
            totalStock: 0,
            totalStockBase: 0,
            availableStock: 0,
            availableStockBase: 0,
            committedStock: 0,
            committedStockBase: 0,
            incomingStock: 0,
            incomingStockBase: 0,
            minimumStock: variant.minimumStock ?? 0,
            maximumStock: variant.maximumStock ?? 0,
            reorderPoint: variant.reorderPoint ?? 0,
            storageCount: 0,
            primaryStorageName: null,
            primaryStorageQuantity: undefined,
            lastMovementAt: null,
            lastMovementType: null,
            lastMovementDirection: null,
            isBelowMinimum: false,
            isBelowReorder: false,
            inventoryValueCost: 0,
            inventoryValueCostBase: 0,
            storageBreakdown: [],
            movements: [],
        };
    });

    const rowsByVariant = new Map(variantRows.map((row) => [row.id, row]));
    const storageBreakdownMap = new Map<string, Map<string, InventoryStorageBreakdown>>();

    for (const raw of rawLines) {
        const variantId = raw.variantId as string | null;
        if (!variantId) continue;

        const row = rowsByVariant.get(variantId);
        if (!row) continue;

        const quantity = Number(raw.quantity ?? 0);
        if (!quantity) continue;

        const rawConversion = raw.unitConversionFactor !== undefined && raw.unitConversionFactor !== null
            ? Number(raw.unitConversionFactor)
            : null;
        const rawQuantityInBase = raw.quantityInBase !== undefined && raw.quantityInBase !== null
            ? Number(raw.quantityInBase)
            : null;
        const unitOfMeasureSnapshot = (raw.unitOfMeasure as string | null) ?? row.unitOfMeasure ?? null;
        const quantityInBase = rawQuantityInBase !== null && rawQuantityInBase !== undefined
            ? rawQuantityInBase
            : rawConversion !== null && rawConversion !== undefined
                ? Number((quantity * rawConversion).toFixed(6))
                : quantity;

        const transactionType = raw.transactionType as TransactionType;
        const direction = resolveDirection(transactionType);
        if (!direction) continue;

        const storageId = raw.storageId as string | null;
        const targetStorageId = raw.targetStorageId as string | null;
        const storageEntity = storageId ? storagesById.get(storageId) : undefined;
        const targetStorageEntity = targetStorageId ? storagesById.get(targetStorageId) : undefined;
        const createdAt = raw.createdAt instanceof Date
            ? raw.createdAt.toISOString()
            : new Date(raw.createdAt).toISOString();

        const signedQuantity = direction === "IN" ? quantity : -quantity;
        const signedBaseQuantity = direction === "IN" ? quantityInBase : -quantityInBase;

        if (storageId) {
            if (!storageBreakdownMap.has(variantId)) {
                storageBreakdownMap.set(variantId, new Map());
            }
            const breakdownMap = storageBreakdownMap.get(variantId)!;
            if (!breakdownMap.has(storageId)) {
                breakdownMap.set(storageId, {
                    storageId,
                    storageName: (raw.storageName as string | undefined) ?? storageEntity?.name ?? "Bodega",
                    branchId: storageEntity?.branchId,
                    branchName: storageEntity?.branch?.name,
                    quantity: 0,
                    quantityBase: 0,
                });
            }
            const entry = breakdownMap.get(storageId)!;
            entry.quantity = Number((entry.quantity + signedQuantity).toFixed(4));
            entry.quantityBase = Number((entry.quantityBase + signedBaseQuantity).toFixed(4));
        }

        row.totalStock = Number((row.totalStock + signedQuantity).toFixed(4));
        row.totalStockBase = Number((row.totalStockBase + signedBaseQuantity).toFixed(4));

        row.movements.push({
            transactionId: raw.transactionId as string,
            documentNumber: (raw.documentNumber as string) || "-",
            transactionType,
            direction,
            quantity: Math.abs(quantity),
            quantityBase: Math.abs(quantityInBase),
            unitOfMeasure: unitOfMeasureSnapshot,
            storageId,
            storageName: storageEntity?.name ?? (raw.storageName as string | null) ?? null,
            storageBranchId: storageEntity?.branchId ?? null,
            storageBranchName: storageEntity?.branch?.name,
            targetStorageId,
            targetStorageName: targetStorageEntity?.name ?? (raw.targetStorageName as string | null) ?? null,
            targetStorageBranchId: targetStorageEntity?.branchId ?? null,
            targetStorageBranchName: targetStorageEntity?.branch?.name,
            createdAt,
            variantNameSnapshot: raw.variantNameSnapshot as string | null,
            productNameSnapshot: raw.productNameSnapshot as string | undefined,
            notes: raw.notes as string | null,
        });
    }

    const includeZero = params?.includeZero ?? Boolean(params?.search);

    const result: InventoryRowDTO[] = [];

    for (const row of variantRows) {
        const breakdownEntries = storageBreakdownMap.get(row.id);
        if (breakdownEntries) {
            const entries = Array.from(breakdownEntries.values()).filter((entry) => {
                if (params?.storageId && entry.storageId !== params.storageId) {
                    return false;
                }
                if (params?.branchId && entry.branchId !== params.branchId) {
                    return false;
                }
                return true;
            });

            entries.sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity));

            row.storageBreakdown = entries.map((entry) => ({
                ...entry,
                quantity: Number(entry.quantity.toFixed(4)),
                quantityBase: Number(entry.quantityBase.toFixed(4)),
            }));

            row.storageCount = row.storageBreakdown.length;
            if (row.storageBreakdown[0]) {
                row.primaryStorageName = row.storageBreakdown[0].storageName;
                row.primaryStorageQuantity = row.storageBreakdown[0].quantity;
            }
        }

        row.availableStock = row.totalStock - row.committedStock + row.incomingStock;
        row.availableStockBase = row.totalStockBase - row.committedStockBase + row.incomingStockBase;

        const costPerBaseUnit = row.unitConversionFactor
            ? row.baseCost / row.unitConversionFactor
            : row.baseCost;

        row.inventoryValueCost = Number((row.totalStock * row.baseCost).toFixed(2));
        row.inventoryValueCostBase = Number((row.totalStockBase * costPerBaseUnit).toFixed(2));

        row.isBelowMinimum = row.minimumStock > 0 && row.totalStock < row.minimumStock;
        row.isBelowReorder = row.reorderPoint > 0 && row.totalStock <= row.reorderPoint;

        if (row.movements.length > 0) {
            row.movements.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const latest = row.movements[0];
            row.lastMovementAt = latest.createdAt;
            row.lastMovementType = latest.transactionType;
            row.lastMovementDirection = latest.direction;
            if (row.movements.length > 25) {
                row.movements = row.movements.slice(0, 25);
            }
        }

        if (!includeZero && row.totalStock === 0 && row.movements.length === 0) {
            continue;
        }

        if (params?.branchId) {
            const matchesBranch = row.storageBreakdown.some(
                (entry) => entry.branchId === params.branchId
            );
            if (!matchesBranch) {
                continue;
            }
        }

        result.push(row);
    }

    result.sort((a, b) => {
        if (a.isBelowMinimum !== b.isBelowMinimum) {
            return a.isBelowMinimum ? -1 : 1;
        }
        if (a.isBelowReorder !== b.isBelowReorder) {
            return a.isBelowReorder ? -1 : 1;
        }
        return a.productName.localeCompare(b.productName) || a.sku.localeCompare(b.sku);
    });

    return JSON.parse(JSON.stringify(result));
}
