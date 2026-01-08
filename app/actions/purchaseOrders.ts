'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType } from '@/data/entities/Transaction';
import { TransactionLine } from '@/data/entities/TransactionLine';
import { Supplier } from '@/data/entities/Supplier';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Product } from '@/data/entities/Product';
import { Branch } from '@/data/entities/Branch';
import { Storage } from '@/data/entities/Storage';
import { In } from 'typeorm';
import { getCurrentSession } from './auth.server';
import { createTransaction } from './transactions';

type Nullable<T> = T | null;

export interface PurchaseOrderListItem {
    id: string;
    documentNumber: string;
    status: TransactionStatus;
    supplierId?: string | null;
    supplierName?: string | null;
    branchId: string;
    branchName?: string | null;
    total: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    createdAt: string;
    lineCount: number;
    userName?: string | null;
}

export interface GetPurchaseOrdersParams {
    search?: string;
    status?: TransactionStatus;
    supplierId?: string;
    branchId?: string;
    limit?: number;
}

export interface PurchaseOrderProductResult {
    variantId: string;
    productId?: string;
    productName: string;
    sku: string;
    barcode?: string | null;
    unitOfMeasure: string;
    baseCost: number;
    basePrice: number;
    trackInventory: boolean;
    attributeValues?: Record<string, string> | null;
    brand?: string | null;
}

export interface SearchPurchaseProductsParams {
    search?: string;
    categoryId?: string;
    limit?: number;
}

export interface PurchaseOrderLineInput {
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    notes?: string;
}

export interface CreatePurchaseOrderDTO {
    supplierId: string;
    storageId?: string;
    reference?: string;
    notes?: string;
    expectedDate?: string;
    lines: PurchaseOrderLineInput[];
}

export interface PurchaseOrderActionResult {
    success: boolean;
    error?: string;
    orderId?: string;
}

export async function getPurchaseOrders(params?: GetPurchaseOrdersParams): Promise<PurchaseOrderListItem[]> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);

    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;

    const queryBuilder = repo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.supplier', 'supplier')
        .leftJoinAndSelect('supplier.person', 'supplierPerson')
        .leftJoinAndSelect('order.branch', 'branch')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoin(TransactionLine, 'line', 'line.transactionId = order.id')
        .where('order.transactionType = :type', { type: TransactionType.PURCHASE_ORDER })
        .groupBy('order.id')
        .addGroupBy('supplier.id')
        .addGroupBy('supplierPerson.id')
        .addGroupBy('branch.id')
        .addGroupBy('user.id')
        .select([
            'order.id AS id',
            'order.documentNumber AS documentNumber',
            'order.status AS status',
            'order.branchId AS branchId',
            'order.total AS total',
            'order.subtotal AS subtotal',
            'order.taxAmount AS taxAmount',
            'order.discountAmount AS discountAmount',
            'order.createdAt AS createdAt',
            'supplier.id AS supplierId',
            'supplierPerson.businessName AS supplierBusinessName',
            'supplierPerson.firstName AS supplierFirstName',
            'supplierPerson.lastName AS supplierLastName',
            'branch.name AS branchName',
            'user.userName AS userUserName',
        ])
        .addSelect('COUNT(line.id)', 'lineCount')
        .orderBy('order.createdAt', 'DESC')
        .limit(limit);

    if (params?.status) {
        queryBuilder.andWhere('order.status = :status', { status: params.status });
    }

    if (params?.supplierId) {
        queryBuilder.andWhere('order.supplierId = :supplierId', { supplierId: params.supplierId });
    }

    if (params?.branchId) {
        queryBuilder.andWhere('order.branchId = :branchId', { branchId: params.branchId });
    }

    if (params?.search) {
        const searchTerm = `%${params.search.toLowerCase()}%`;
        queryBuilder.andWhere(
            'LOWER(order.documentNumber) LIKE :search OR LOWER(supplierPerson.businessName) LIKE :search OR LOWER(supplierPerson.firstName) LIKE :search OR LOWER(supplierPerson.lastName) LIKE :search',
            { search: searchTerm }
        );
    }

    const raw = await queryBuilder.getRawMany();

    const items: PurchaseOrderListItem[] = raw.map((row) => {
        const supplierName =
            row['supplierBusinessName'] ||
            [row['supplierFirstName'], row['supplierLastName']].filter(Boolean).join(' ') ||
            null;

        const userName = row['userUserName'] || null;

        return {
            id: row['id'],
            documentNumber: row['documentNumber'],
            status: row['status'],
            supplierId: row['supplierId'] ?? null,
            supplierName,
            branchId: row['branchId'],
            branchName: row['branchName'] ?? null,
            total: Number(row['total'] ?? 0),
            subtotal: Number(row['subtotal'] ?? 0),
            taxAmount: Number(row['taxAmount'] ?? 0),
            discountAmount: Number(row['discountAmount'] ?? 0),
            createdAt: new Date(row['createdAt']).toISOString(),
            lineCount: Number(row['lineCount'] ?? 0),
            userName,
        };
    });

    return items;
}

export async function deletePurchaseOrder(id: string): Promise<PurchaseOrderActionResult> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);

    const order = await repo.findOne({ where: { id, transactionType: TransactionType.PURCHASE } });
    if (!order) {
        return { success: false, error: 'Orden de compra no encontrada' };
    }

    if (order.status === TransactionStatus.CANCELLED) {
        return { success: true, orderId: order.id };
    }

    order.status = TransactionStatus.CANCELLED;
    await repo.save(order);

    revalidatePath('/admin/inventory/purchase-orders');
    return { success: true, orderId: order.id };
}

export async function searchProductsForPurchase(params?: SearchPurchaseProductsParams): Promise<PurchaseOrderProductResult[]> {
    const ds = await getDb();
    const variantRepo = ds.getRepository(ProductVariant);

    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 40) : 20;

    const queryBuilder = variantRepo
        .createQueryBuilder('variant')
        .leftJoinAndSelect('variant.product', 'product')
        .where('variant.deletedAt IS NULL')
        .andWhere('product.deletedAt IS NULL')
        .andWhere('product.isActive = :active', { active: true });

    if (params?.categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: params.categoryId });
    }

    if (params?.search) {
        const searchTerm = `%${params.search.toLowerCase()}%`;
        queryBuilder.andWhere(
            'LOWER(product.name) LIKE :search OR LOWER(variant.sku) LIKE :search OR LOWER(product.brand) LIKE :search',
            { search: searchTerm }
        );
    }

    queryBuilder.orderBy('product.name', 'ASC').addOrderBy('variant.sku', 'ASC').take(limit);

    const variants = await queryBuilder.getMany();

    const results: PurchaseOrderProductResult[] = variants.map((variant) => {
        const product = variant.product as Product | undefined;
        return {
            variantId: variant.id,
            productId: variant.productId,
            productName: product?.name ?? 'Producto',
            sku: variant.sku,
            barcode: variant.barcode ?? null,
            unitOfMeasure: variant.unit?.symbol ?? '',
            baseCost: Number(variant.baseCost ?? 0),
            basePrice: Number(variant.basePrice ?? 0),
            trackInventory: variant.trackInventory,
            attributeValues: variant.attributeValues ?? null,
            brand: product?.brand ?? null,
        };
    });

    return JSON.parse(JSON.stringify(results));
}

export async function createPurchaseOrder(data: CreatePurchaseOrderDTO): Promise<PurchaseOrderActionResult> {
    try {
        if (!data.lines || data.lines.length === 0) {
            return { success: false, error: 'La orden debe incluir al menos un producto' };
        }

        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const ds = await getDb();
        const variantRepo = ds.getRepository(ProductVariant);
        const supplierRepo = ds.getRepository(Supplier);
        const storageRepo = ds.getRepository(Storage);

        const supplier = await supplierRepo.findOne({ where: { id: data.supplierId } });
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }

        if (data.storageId) {
            const storage = await storageRepo.findOne({ where: { id: data.storageId } });
            if (!storage) {
                return { success: false, error: 'Bodega no encontrada' };
            }
        }

        const variantIds = data.lines.map((line) => line.productVariantId);
        const variants = await variantRepo.find({
            where: { id: In(variantIds) },
            relations: ['product'],
        });

        if (variants.length !== variantIds.length) {
            return { success: false, error: 'Algunos productos seleccionados no existen' };
        }

        const variantMap = new Map<string, ProductVariant>();
        variants.forEach((variant) => variantMap.set(variant.id, variant));

        const lines = data.lines.map((lineInput) => {
            const variant = variantMap.get(lineInput.productVariantId)!;
            const product = variant.product as Product;

            const quantity = Number(lineInput.quantity);
            const unitPrice = Number(lineInput.unitPrice ?? variant.baseCost ?? 0);
            const unitCost = Number(lineInput.unitCost ?? variant.baseCost ?? 0);

            return {
                productId: product.id,
                productVariantId: variant.id,
                productName: product.name,
                productSku: variant.sku,
                variantName: Object.values(variant.attributeValues ?? {}).join(', '),
                quantity,
                unitPrice,
                unitCost,
                discountAmount: 0,
                discountPercentage: 0,
                taxAmount: 0,
                taxRate: 0,
                notes: lineInput.notes,
            };
        });

        const result = await createTransaction({
            transactionType: TransactionType.PURCHASE_ORDER,
            storageId: data.storageId,
            supplierId: data.supplierId,
            userId: session.id,
            externalReference: data.reference,
            notes: data.notes,
            status: TransactionStatus.DRAFT,
            lines,
        });

        if (!result.success || !result.transaction) {
            return { success: false, error: result.error || 'No se pudo crear la orden de compra' };
        }

        if (data.expectedDate || data.notes) {
            const repo = ds.getRepository(Transaction);
            const metadata: Record<string, any> = {
                ...(result.transaction.metadata || {}),
                expectedDate: data.expectedDate ?? null,
            };
            await repo.update(result.transaction.id, { metadata });
        }

        revalidatePath('/admin/inventory/purchase-orders');
        return { success: true, orderId: result.transaction?.id };
    } catch (err) {
        console.error('Error creating purchase order:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error al crear la orden de compra',
        };
    }
}
