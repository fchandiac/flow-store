'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType } from '@/data/entities/Transaction';
import { TransactionLine } from '@/data/entities/TransactionLine';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Supplier } from '@/data/entities/Supplier';
import { Storage } from '@/data/entities/Storage';
import { getCurrentSession } from './auth.server';
import { createTransaction } from './transactions';

// ==================== TYPES ====================

export interface ReceptionListItem {
    id: string;
    documentNumber: string;
    status: TransactionStatus;
    supplierId?: string | null;
    supplierName?: string | null;
    storageId?: string | null;
    storageName?: string | null;
    total: number;
    subtotal: number;
    createdAt: string;
    lineCount: number;
    userName?: string | null;
    purchaseOrderId?: string | null;
    purchaseOrderNumber?: string | null;
    isDirect?: boolean;
    hasDiscrepancies?: boolean;
}

export interface GetReceptionsParams {
    search?: string;
    status?: TransactionStatus;
    supplierId?: string;
    storageId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

export interface ReceptionLineInput {
    productVariantId: string;
    expectedQuantity?: number;
    receivedQuantity: number;
    unitPrice: number;
    unitCost?: number;
    notes?: string;
    qualityStatus?: 'APPROVED' | 'REJECTED' | 'PARTIAL';
}

export interface CreateReceptionFromPurchaseOrderDTO {
    purchaseOrderId: string;
    storageId: string;
    receptionDate?: string;
    notes?: string;
    lines: ReceptionLineInput[];
}

export interface CreateDirectReceptionDTO {
    supplierId: string;
    storageId: string;
    receptionDate?: string;
    reference?: string;
    notes?: string;
    lines: ReceptionLineInput[];
}

export interface ReceptionActionResult {
    success: boolean;
    receptionId?: string;
    error?: string;
    discrepancies?: Array<{
        productName: string;
        expected: number;
        received: number;
        difference: number;
    }>;
}

export interface PurchaseOrderForReception {
    id: string;
    documentNumber: string;
    supplierId: string;
    supplierName: string;
    storageId?: string;
    storageName?: string;
    total: number;
    createdAt: string;
    status: TransactionStatus;
    lines: Array<{
        productVariantId: string;
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        unitCost: number;
    }>;
}

// ==================== QUERIES ====================

/**
 * Obtiene lista de recepciones con filtros
 * Solo lista transacciones que son RECEPCIONES (tienen metadata.receptionId)
 * NO lista órdenes de compra normales
 */
export async function getReceptions(params?: GetReceptionsParams): Promise<ReceptionListItem[]> {
    const ds = await getDb();
    const limit = params?.limit ?? 25;
    const offset = params?.offset ?? 0;

    const queryBuilder = ds
        .getRepository(Transaction)
        .createQueryBuilder('reception')
        .leftJoinAndSelect('reception.supplier', 'supplier')
        .leftJoinAndSelect('supplier.person', 'supplierPerson')
        .leftJoinAndSelect('reception.user', 'user')
        .where('reception.transactionType = :type', { type: TransactionType.PURCHASE })
        .andWhere('reception.status = :status', { status: TransactionStatus.CONFIRMED })
        // CRITICAL: Solo transacciones que sean recepciones (tienen receptionId en metadata)
        .andWhere("JSON_EXTRACT(reception.metadata, '$.receptionId') IS NOT NULL");

    if (params?.search) {
        queryBuilder.andWhere('reception.documentNumber LIKE :search', {
            search: `%${params.search}%`,
        });
    }

    if (params?.supplierId) {
        queryBuilder.andWhere('reception.supplierId = :supplierId', {
            supplierId: params.supplierId,
        });
    }

    if (params?.storageId) {
        queryBuilder.andWhere('reception.storageId = :storageId', {
            storageId: params.storageId,
        });
    }

    if (params?.dateFrom) {
        queryBuilder.andWhere('reception.createdAt >= :dateFrom', {
            dateFrom: params.dateFrom,
        });
    }

    if (params?.dateTo) {
        queryBuilder.andWhere('reception.createdAt <= :dateTo', {
            dateTo: params.dateTo,
        });
    }

    queryBuilder
        .orderBy('reception.createdAt', 'DESC')
        .skip(offset)
        .take(limit);

    const receptions = await queryBuilder.getMany();

    // Contar líneas por recepción
    const lineCountMap = new Map<string, number>();
    
    if (receptions.length > 0) {
        const lineRepo = ds.getRepository(TransactionLine);
        const receptionIds = receptions.map((r) => r.id);
        const lineCounts = await lineRepo
            .createQueryBuilder('line')
            .select('line.transactionId', 'transactionId')
            .addSelect('COUNT(line.id)', 'count')
            .where('line.transactionId IN (:...ids)', { ids: receptionIds })
            .groupBy('line.transactionId')
            .getRawMany();

        lineCounts.forEach((lc) => {
            lineCountMap.set(lc.transactionId, parseInt(lc.count));
        });
    }

    const results: ReceptionListItem[] = receptions.map((reception) => {
        const supplier = reception.supplier;
        const supplierPerson = supplier?.person;
        const metadata = reception.metadata as any;

        return {
            id: reception.id,
            documentNumber: reception.documentNumber,
            status: reception.status,
            supplierId: reception.supplierId ?? null,
            supplierName: supplierPerson?.businessName ?? supplierPerson?.firstName ?? null,
            storageId: reception.storageId ?? null,
            storageName: null, // TODO: join storage
            total: Number(reception.total),
            subtotal: Number(reception.subtotal),
            createdAt: reception.createdAt.toISOString(),
            lineCount: lineCountMap.get(reception.id) ?? 0,
            userName: reception.user?.userName ?? null,
            purchaseOrderId: metadata?.purchaseOrderId ?? null,
            purchaseOrderNumber: metadata?.purchaseOrderNumber ?? null,
            isDirect: metadata?.isDirect ?? false,
            hasDiscrepancies: metadata?.hasDiscrepancies ?? false,
        };
    });

    return JSON.parse(JSON.stringify(results));
}

/**
 * Busca órdenes de compra disponibles para recepción
 * Solo lista ÓRDENES DE COMPRA puras (sin metadata.receptionId)
 * NO lista recepciones
 */
export async function searchPurchaseOrdersForReception(
    search?: string
): Promise<PurchaseOrderForReception[]> {
    const ds = await getDb();

    const queryBuilder = ds
        .getRepository(Transaction)
        .createQueryBuilder('po')
        .leftJoinAndSelect('po.supplier', 'supplier')
        .leftJoinAndSelect('supplier.person', 'supplierPerson')
        .where('po.transactionType = :type', { type: TransactionType.PURCHASE })
        .andWhere('po.status = :status', { status: TransactionStatus.CONFIRMED })
        // CRITICAL: Solo órdenes de compra que NO sean recepciones
        .andWhere("JSON_EXTRACT(po.metadata, '$.receptionId') IS NULL");

    if (search) {
        queryBuilder.andWhere('po.documentNumber LIKE :search', {
            search: `%${search}%`,
        });
    }

    queryBuilder.orderBy('po.createdAt', 'DESC').take(10);

    const orders = await queryBuilder.getMany();

    // Cargar líneas
    const lineRepo = ds.getRepository(TransactionLine);
    const orderIds = orders.map((o) => o.id);
    const lines = await lineRepo
        .createQueryBuilder('line')
        .where('line.transactionId IN (:...ids)', { ids: orderIds })
        .orderBy('line.lineNumber', 'ASC')
        .getMany();

    const linesByOrder = new Map<string, TransactionLine[]>();
    lines.forEach((line) => {
        if (line.transactionId) {
            const existing = linesByOrder.get(line.transactionId) ?? [];
            existing.push(line);
            linesByOrder.set(line.transactionId, existing);
        }
    });

    const results: PurchaseOrderForReception[] = orders.map((order) => {
        const supplier = order.supplier;
        const supplierPerson = supplier?.person;
        const orderLines = linesByOrder.get(order.id) ?? [];

        return {
            id: order.id,
            documentNumber: order.documentNumber,
            supplierId: order.supplierId ?? '',
            supplierName: supplierPerson?.businessName ?? supplierPerson?.firstName ?? 'Sin nombre',
            storageId: order.storageId ?? undefined,
            storageName: undefined, // TODO: join storage
            total: Number(order.total),
            createdAt: order.createdAt.toISOString(),
            status: order.status,
            lines: orderLines.map((line) => ({
                productVariantId: line.productVariantId ?? '',
                productName: line.productName,
                sku: line.productSku,
                quantity: Number(line.quantity),
                unitPrice: Number(line.unitPrice),
                unitCost: Number(line.unitCost ?? line.unitPrice),
            })),
        };
    });

    return JSON.parse(JSON.stringify(results));
}

// ==================== MUTATIONS ====================

/**
 * Crea una recepción basada en una orden de compra
 */
export async function createReceptionFromPurchaseOrder(
    data: CreateReceptionFromPurchaseOrderDTO
): Promise<ReceptionActionResult> {
    try {
        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        if (!data.lines || data.lines.length === 0) {
            return { success: false, error: 'La recepción debe incluir al menos un producto' };
        }

        const ds = await getDb();
        const transactionRepo = ds.getRepository(Transaction);
        const lineRepo = ds.getRepository(TransactionLine);

        // Validar que la orden existe
        const purchaseOrder = await transactionRepo.findOne({
            where: { id: data.purchaseOrderId },
            relations: ['supplier'],
        });

        if (!purchaseOrder) {
            return { success: false, error: 'Orden de compra no encontrada' };
        }

        if (purchaseOrder.transactionType !== TransactionType.PURCHASE) {
            return { success: false, error: 'La transacción no es una orden de compra' };
        }

        // Cargar líneas de la orden original
        const originalLines = await lineRepo.find({
            where: { transactionId: data.purchaseOrderId },
        });

        // Calcular discrepancias
        const discrepancies: Array<{
            productName: string;
            expected: number;
            received: number;
            difference: number;
        }> = [];

        const expectedQuantities: Record<string, number> = {};
        const receivedQuantities: Record<string, number> = {};

        originalLines.forEach((line) => {
            if (line.productVariantId) {
                expectedQuantities[line.productVariantId] = Number(line.quantity);
            }
        });

        data.lines.forEach((line) => {
            receivedQuantities[line.productVariantId] = line.receivedQuantity;

            const expected = expectedQuantities[line.productVariantId] ?? 0;
            const received = line.receivedQuantity;
            const difference = received - expected;

            if (difference !== 0) {
                const originalLine = originalLines.find(
                    (ol) => ol.productVariantId === line.productVariantId
                );
                discrepancies.push({
                    productName: originalLine?.productName ?? 'Producto',
                    expected,
                    received,
                    difference,
                });
            }
        });

        // Preparar líneas para la transacción
        const transactionLines = data.lines.map((line) => {
            const originalLine = originalLines.find(
                (ol) => ol.productVariantId === line.productVariantId
            );

            return {
                productId: originalLine?.productId ?? '',
                productVariantId: line.productVariantId,
                productName: originalLine?.productName ?? 'Producto',
                productSku: originalLine?.productSku ?? '',
                variantName: originalLine?.variantName,
                quantity: line.receivedQuantity,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost ?? line.unitPrice,
                discountAmount: 0,
                discountPercentage: 0,
                taxAmount: 0,
                taxRate: 0,
                notes: line.notes,
            };
        });

        // Metadata de la recepción
        const metadata = {
            receptionId: `RCP-${Date.now()}`,
            purchaseOrderId: data.purchaseOrderId,
            purchaseOrderNumber: purchaseOrder.documentNumber,
            isDirect: false,
            isPartialReception: discrepancies.length > 0,
            expectedQuantities,
            receivedQuantities,
            discrepancies:
                discrepancies.length > 0
                    ? Object.fromEntries(
                          discrepancies.map((d) => [
                              d.productName,
                              {
                                  expected: d.expected,
                                  received: d.received,
                                  difference: d.difference,
                              },
                          ])
                      )
                    : undefined,
            receptionDate: data.receptionDate ?? new Date().toISOString(),
            receptionNotes: data.notes,
            inspectionStatus: 'APPROVED',
            hasDiscrepancies: discrepancies.length > 0,
        };

        // Crear transacción de recepción
        const result = await createTransaction({
            transactionType: TransactionType.PURCHASE,
            storageId: data.storageId,
            supplierId: purchaseOrder.supplierId ?? undefined,
            userId: session.id,
            notes: data.notes,
            lines: transactionLines,
        });

        if (!result.success || !result.transaction) {
            return {
                success: false,
                error: result.error || 'No se pudo crear la recepción',
            };
        }

        // Actualizar metadata
        await transactionRepo.update(result.transaction.id, { metadata: metadata as any });

        // TODO: Actualizar estado de la orden de compra a PARTIALLY_RECEIVED o RECEIVED

        revalidatePath('/admin/inventory/receptions');
        revalidatePath('/admin/inventory/purchase-orders');

        return {
            success: true,
            receptionId: result.transaction.id,
            discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        };
    } catch (err) {
        console.error('Error creating reception from purchase order:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error al crear la recepción',
        };
    }
}

/**
 * Crea una recepción directa sin orden de compra
 */
export async function createDirectReception(
    data: CreateDirectReceptionDTO
): Promise<ReceptionActionResult> {
    try {
        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        if (!data.lines || data.lines.length === 0) {
            return { success: false, error: 'La recepción debe incluir al menos un producto' };
        }

        const ds = await getDb();
        const variantRepo = ds.getRepository(ProductVariant);

        // Validar productos
        const variantIds = data.lines.map((l) => l.productVariantId);
        const variants = await variantRepo.find({
            where: variantIds.map((id) => ({ id })),
            relations: ['product'],
        });

        if (variants.length !== variantIds.length) {
            return { success: false, error: 'Algunos productos no existen' };
        }

        const variantMap = new Map(variants.map((v) => [v.id, v]));

        // Preparar líneas
        const transactionLines = data.lines.map((line) => {
            const variant = variantMap.get(line.productVariantId)!;
            const product = variant.product;

            return {
                productId: product?.id ?? '',
                productVariantId: line.productVariantId,
                productName: product?.name ?? 'Producto',
                productSku: variant.sku,
                variantName: Object.values(variant.attributeValues ?? {}).join(', '),
                quantity: line.receivedQuantity,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost ?? line.unitPrice,
                discountAmount: 0,
                discountPercentage: 0,
                taxAmount: 0,
                taxRate: 0,
                notes: line.notes,
            };
        });

        // Metadata de recepción directa
        const metadata = {
            receptionId: `RCP-${Date.now()}`,
            isDirect: true,
            receptionDate: data.receptionDate ?? new Date().toISOString(),
            receptionNotes: data.notes,
            inspectionStatus: 'APPROVED',
            reason: 'DIRECT_PURCHASE',
        };

        // Crear transacción
        const result = await createTransaction({
            transactionType: TransactionType.PURCHASE,
            storageId: data.storageId,
            supplierId: data.supplierId,
            userId: session.id,
            externalReference: data.reference,
            notes: data.notes,
            lines: transactionLines,
        });

        if (!result.success || !result.transaction) {
            return {
                success: false,
                error: result.error || 'No se pudo crear la recepción',
            };
        }

        // Actualizar metadata
        const transactionRepo = ds.getRepository(Transaction);
        await transactionRepo.update(result.transaction.id, { metadata: metadata as any });

        revalidatePath('/admin/inventory/receptions');

        return {
            success: true,
            receptionId: result.transaction.id,
        };
    } catch (err) {
        console.error('Error creating direct reception:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error al crear la recepción',
        };
    }
}
