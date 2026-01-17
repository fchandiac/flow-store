'use server';

import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType } from '@/data/entities/Transaction';

export interface SupplierPurchaseListItem {
    id: string;
    documentNumber: string;
    status: TransactionStatus;
    total: number;
    subtotal: number;
    taxAmount: number;
    createdAt: string;
    purchaseOrderNumber?: string | null;
    hasDiscrepancies?: boolean | null;
    userName?: string | null;
    notes?: string | null;
}

export interface GetSupplierPurchasesParams {
    includeCancelled?: boolean;
    limit?: number;
}

const DEFAULT_LIMIT = 50;

export async function getSupplierPurchases(
    supplierId: string,
    params?: GetSupplierPurchasesParams
): Promise<SupplierPurchaseListItem[]> {
    if (!supplierId) {
        return [];
    }

    const ds = await getDb();
    const repo = ds.getRepository(Transaction);

    const limit = Math.min(Math.max(params?.limit ?? DEFAULT_LIMIT, 1), 100);

    const queryBuilder = repo
        .createQueryBuilder('purchase')
        .leftJoinAndSelect('purchase.user', 'user')
        .where('purchase.transactionType = :type', { type: TransactionType.PURCHASE })
        .andWhere('purchase.supplierId = :supplierId', { supplierId })
        .orderBy('purchase.createdAt', 'DESC')
        .take(limit);

    if (!params?.includeCancelled) {
        queryBuilder.andWhere('purchase.status != :cancelled', { cancelled: TransactionStatus.CANCELLED });
    }

    const purchases = await queryBuilder.getMany();

    const results: SupplierPurchaseListItem[] = purchases.map((purchase) => {
        const metadata = (purchase.metadata ?? {}) as Record<string, any>;
        const purchaseOrderNumber = typeof metadata?.purchaseOrderNumber === 'string'
            ? metadata.purchaseOrderNumber
            : null;
        const hasDiscrepancies = typeof metadata?.hasDiscrepancies === 'boolean'
            ? metadata.hasDiscrepancies
            : null;

        return {
            id: purchase.id,
            documentNumber: purchase.documentNumber,
            status: purchase.status,
            total: Number(purchase.total ?? 0),
            subtotal: Number(purchase.subtotal ?? 0),
            taxAmount: Number(purchase.taxAmount ?? 0),
            createdAt: purchase.createdAt.toISOString(),
            purchaseOrderNumber,
            hasDiscrepancies,
            userName: purchase.user?.userName ?? null,
            notes: purchase.notes ?? null,
        };
    });

    return JSON.parse(JSON.stringify(results));
}
