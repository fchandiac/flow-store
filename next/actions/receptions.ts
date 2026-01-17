'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import { Transaction, TransactionStatus, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { TransactionLine } from '@/data/entities/TransactionLine';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Supplier } from '@/data/entities/Supplier';
import { Storage } from '@/data/entities/Storage';
import { In } from 'typeorm';
import { getCurrentSession } from './auth.server';
import { createTransaction, cancelTransaction, type TransactionLineDTO } from './transactions';

// ==================== TYPES ====================

export interface ReceptionListItem {
    id: string;
    documentNumber: string;
    status: TransactionStatus;
    transactionType: TransactionType;
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
    relatedTransactionId?: string | null;
    relatedDocumentNumber?: string | null;
    externalReference?: string | null;
    cancelledByDocumentNumber?: string | null;
    cancelsDocumentNumber?: string | null;
    cancellationReason?: string | null;
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
    paymentDueDate?: string;
    notes?: string;
    lines: ReceptionLineInput[];
}

export interface CreateDirectReceptionDTO {
    supplierId: string;
    storageId: string;
    receptionDate?: string;
    paymentDueDate?: string;
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

export interface ReceptionProductSearchItem {
    variantId: string;
    productId?: string | null;
    productName: string;
    sku: string;
    pmp: number;
    attributeValues?: Record<string, string> | null;
    unitOfMeasure?: string | null;
}

export interface ReceptionVariantDetail {
    variantId: string;
    productId?: string | null;
    productName: string;
    sku: string;
    pmp: number;
    baseCost: number;
    basePrice: number;
    unitOfMeasure?: string | null;
    attributeValues?: Record<string, string> | null;
    taxIds: string[];
}

export interface SearchReceptionProductsParams {
    search: string;
    limit?: number;
}

const MIN_RECEPTION_PRODUCT_SEARCH_LENGTH = 2;

export async function searchProductsForReception(
    params: SearchReceptionProductsParams
): Promise<ReceptionProductSearchItem[]> {
    const term = params.search?.trim();
    if (!term || term.length < MIN_RECEPTION_PRODUCT_SEARCH_LENGTH) {
        return [];
    }

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 40);
    const normalizedTerm = term.toLowerCase();

    const ds = await getDb();
    const variantRepo = ds.getRepository(ProductVariant);

    const variants = await variantRepo
        .createQueryBuilder('variant')
        .leftJoinAndSelect('variant.unit', 'variantUnit')
        .leftJoinAndSelect('variant.product', 'product')
        .leftJoinAndSelect('product.baseUnit', 'productBaseUnit')
        .where('variant.deletedAt IS NULL')
        .andWhere('product.deletedAt IS NULL')
        .andWhere('product.isActive = :active', { active: true })
        .andWhere(
            'LOWER(product.name) LIKE :search OR LOWER(variant.sku) LIKE :search OR LOWER(variant.sku) = :skuExact',
            {
                search: `%${normalizedTerm}%`,
                skuExact: normalizedTerm,
            }
        )
        .orderBy('product.name', 'ASC')
        .addOrderBy('variant.sku', 'ASC')
        .take(limit)
        .getMany();

    return variants.map((variant) => {
        const product = variant.product;
        const unitSymbol = variant.unit?.symbol ?? product?.baseUnit?.symbol ?? null;
        return {
            variantId: variant.id,
            productId: variant.productId ?? null,
            productName: product?.name ?? 'Producto',
            sku: variant.sku,
            pmp: Number(variant.pmp ?? 0),
            attributeValues: variant.attributeValues ?? null,
            unitOfMeasure: unitSymbol,
        };
    });
}

export async function getReceptionVariantDetail(variantId: string): Promise<ReceptionVariantDetail | null> {
    if (!variantId) {
        return null;
    }

    const ds = await getDb();
    const variantRepo = ds.getRepository(ProductVariant);

    const variant = await variantRepo
        .createQueryBuilder('variant')
        .leftJoinAndSelect('variant.unit', 'variantUnit')
        .leftJoinAndSelect('variant.product', 'product')
        .leftJoinAndSelect('product.baseUnit', 'productBaseUnit')
        .where('variant.id = :variantId', { variantId })
        .andWhere('variant.deletedAt IS NULL')
        .andWhere('product.deletedAt IS NULL')
        .andWhere('product.isActive = :active', { active: true })
        .getOne();

    if (!variant) {
        return null;
    }

    const product = variant.product;
    const taxIds = Array.isArray(variant.taxIds)
        ? variant.taxIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : [];

    const unitSymbol = variant.unit?.symbol ?? product?.baseUnit?.symbol ?? null;

    return {
        variantId: variant.id,
        productId: variant.productId ?? null,
        productName: product?.name ?? 'Producto',
        sku: variant.sku,
        pmp: Number(variant.pmp ?? 0),
        baseCost: Number(variant.baseCost ?? 0),
        basePrice: Number(variant.basePrice ?? 0),
        unitOfMeasure: unitSymbol,
        attributeValues: variant.attributeValues ?? null,
        taxIds,
    };
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseDateInput = (value?: string | null): Date | undefined => {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    const candidate = DATE_ONLY_REGEX.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }
    return parsed;
};

const formatDateOnly = (date: Date): string => date.toISOString().split('T')[0];

const computePaymentDueDate = (options: {
    requestedDueDate?: string | null;
    receptionDate?: string | null;
    supplierTermDays?: number | null;
}): { dueDate: string; termDaysApplied: number } => {
    const receptionDateObj = parseDateInput(options.receptionDate) ?? new Date();
    let dueDateObj = parseDateInput(options.requestedDueDate);
    const termDaysRaw = options.supplierTermDays ?? 0;
    const termDays = Number.isFinite(termDaysRaw) ? Math.round(Number(termDaysRaw)) : 0;

    if (!dueDateObj) {
        dueDateObj = new Date(receptionDateObj);
        dueDateObj.setDate(dueDateObj.getDate() + termDays);
    }

    if (dueDateObj < receptionDateObj) {
        dueDateObj = new Date(receptionDateObj);
    }

    const termMs = dueDateObj.getTime() - receptionDateObj.getTime();
    const termDaysApplied = Math.max(0, Math.round(termMs / (1000 * 60 * 60 * 24)));

    return {
        dueDate: formatDateOnly(dueDateObj),
        termDaysApplied,
    };
};

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
    paymentDueDate?: string | null;
    paymentTermDays?: number | null;
    lines: Array<{
        productVariantId: string;
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        unitCost: number;
        taxId?: string | null;
        taxIds?: string[];
        taxRate?: number | null;
        unitOfMeasure?: string | null;
        variantName?: string | null;
    }>;
}

// ==================== QUERIES ====================

/**
 * Obtiene lista de recepciones con filtros
 * Lista transacciones de tipo PURCHASE (recepciones que mueven inventario)
 */
export async function getReceptions(params?: GetReceptionsParams): Promise<ReceptionListItem[]> {
    const ds = await getDb();
    const limit = params?.limit ?? 25;
    const offset = params?.offset ?? 0;

    const queryBuilder = ds
        .getRepository(Transaction)
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.supplier', 'supplier')
        .leftJoinAndSelect('supplier.person', 'supplierPerson')
        .leftJoinAndSelect('transaction.user', 'user')
        .leftJoinAndSelect('transaction.relatedTransaction', 'relatedTransaction')
        .where('transaction.transactionType IN (:...types)', {
            types: [TransactionType.PURCHASE, TransactionType.PURCHASE_RETURN],
        });

    if (params?.status) {
        queryBuilder.andWhere('transaction.status = :status', {
            status: params.status,
        });
    } else {
        queryBuilder.andWhere('transaction.status IN (:...statuses)', {
            statuses: [TransactionStatus.CONFIRMED, TransactionStatus.CANCELLED],
        });
    }

    if (params?.search) {
        queryBuilder.andWhere('transaction.documentNumber LIKE :search', {
            search: `%${params.search}%`,
        });
    }

    if (params?.supplierId) {
        queryBuilder.andWhere('transaction.supplierId = :supplierId', {
            supplierId: params.supplierId,
        });
    }

    if (params?.storageId) {
        queryBuilder.andWhere('transaction.storageId = :storageId', {
            storageId: params.storageId,
        });
    }

    if (params?.dateFrom) {
        queryBuilder.andWhere('transaction.createdAt >= :dateFrom', {
            dateFrom: params.dateFrom,
        });
    }

    if (params?.dateTo) {
        queryBuilder.andWhere('transaction.createdAt <= :dateTo', {
            dateTo: params.dateTo,
        });
    }

    queryBuilder
        .orderBy('transaction.createdAt', 'DESC')
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

    const storageNames = new Map<string, string>();
    const storageIds = Array.from(
        new Set(
            receptions
                .map((reception) => reception.storageId)
                .filter((id): id is string => Boolean(id))
        )
    );

    if (storageIds.length > 0) {
        const storages = await ds.getRepository(Storage).find({
            where: { id: In(storageIds) },
        });
        storages.forEach((storage) => {
            storageNames.set(storage.id, storage.name);
        });
    }

    const results: ReceptionListItem[] = receptions.map((reception) => {
        const supplier = reception.supplier;
        const supplierPerson = supplier?.person;
        const metadata = reception.metadata as any;
        const cancellationMetadata = metadata?.cancellation;

        return {
            id: reception.id,
            documentNumber: reception.documentNumber,
            status: reception.status,
            transactionType: reception.transactionType,
            supplierId: reception.supplierId ?? null,
            supplierName: supplierPerson?.businessName ?? supplierPerson?.firstName ?? null,
            storageId: reception.storageId ?? null,
            storageName: reception.storageId ? storageNames.get(reception.storageId) ?? null : null,
            total: Number(reception.total),
            subtotal: Number(reception.subtotal),
            createdAt: reception.createdAt.toISOString(),
            lineCount: lineCountMap.get(reception.id) ?? 0,
            userName: reception.user?.userName ?? null,
            purchaseOrderId: metadata?.purchaseOrderId ?? null,
            purchaseOrderNumber: metadata?.purchaseOrderNumber ?? null,
            isDirect: metadata?.isDirect ?? false,
            hasDiscrepancies: metadata?.hasDiscrepancies ?? false,
            relatedTransactionId: reception.relatedTransactionId ?? null,
            relatedDocumentNumber: reception.relatedTransaction?.documentNumber ?? null,
            externalReference: reception.externalReference ?? null,
            cancelledByDocumentNumber: cancellationMetadata?.documentNumber ?? null,
            cancelsDocumentNumber:
                reception.transactionType === TransactionType.PURCHASE_RETURN
                    ? metadata?.originalDocumentNumber ?? reception.externalReference ?? null
                    : null,
            cancellationReason:
                reception.transactionType === TransactionType.PURCHASE
                    ? cancellationMetadata?.reason ?? null
                    : metadata?.cancellationReason ?? null,
        };
    });

    return JSON.parse(JSON.stringify(results));
}

/**
 * Busca órdenes de compra disponibles para recepción
 * Lista transacciones de tipo PURCHASE_ORDER
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
        .where('po.transactionType = :type', { type: TransactionType.PURCHASE_ORDER })
        .andWhere('po.status IN (:...statuses)', {
            statuses: [
                TransactionStatus.DRAFT,
                TransactionStatus.CONFIRMED,
                TransactionStatus.PARTIALLY_RECEIVED,
            ],
        });

    if (search) {
        queryBuilder.andWhere('po.documentNumber LIKE :search', {
            search: `%${search}%`,
        });
    }

    queryBuilder.orderBy('po.createdAt', 'DESC').take(10);

    const orders = await queryBuilder.getMany();

    // Si no hay órdenes, retornar array vacío
    if (orders.length === 0) {
        return [];
    }

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
        const metadata = (order.metadata ?? null) as Record<string, any> | null;
        const metadataPaymentDue = metadata?.paymentDueDate;
        const paymentDueDate = metadataPaymentDue
            ? (() => {
                  const parsed = parseDateInput(String(metadataPaymentDue));
                  return parsed ? formatDateOnly(parsed) : null;
              })()
            : null;
        const paymentTermDays = typeof metadata?.paymentTermDays === 'number' ? metadata.paymentTermDays : null;

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
            paymentDueDate,
            paymentTermDays,
            lines: orderLines.map((line) => ({
                productVariantId: line.productVariantId ?? '',
                productName: line.productName,
                sku: line.productSku,
                quantity: Number(line.quantity),
                unitPrice: Number(line.unitPrice),
                unitCost: Number(line.unitCost ?? line.unitPrice),
                taxId: line.taxId ?? null,
                taxIds: line.taxId ? [line.taxId] : [],
                taxRate: line.taxRate !== undefined && line.taxRate !== null ? Number(line.taxRate) : null,
                unitOfMeasure: line.unitOfMeasure ?? null,
                variantName: line.variantName ?? null,
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

        if (purchaseOrder.transactionType !== TransactionType.PURCHASE_ORDER) {
            return { success: false, error: 'La transacción no es una orden de compra' };
        }

        // Cargar líneas de la orden original
        const originalLines = await lineRepo.find({
            where: { transactionId: data.purchaseOrderId },
        });

        const supplierTermDays = purchaseOrder.supplier?.defaultPaymentTermDays ?? 0;
        const receptionDateValue = data.receptionDate ?? new Date().toISOString();
        const { dueDate: paymentDueDate, termDaysApplied: paymentTermDaysApplied } = computePaymentDueDate({
            requestedDueDate: data.paymentDueDate,
            receptionDate: receptionDateValue,
            supplierTermDays,
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
        const variantRepo = ds.getRepository(ProductVariant);
        const variantIds = Array.from(new Set(data.lines.map((line) => line.productVariantId).filter(Boolean)));
        const variants = variantIds.length
            ? await variantRepo.find({ where: { id: In(variantIds) } })
            : [];
        const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

        const transactionLines: TransactionLineDTO[] = data.lines.map((line) => {
            const originalLine = originalLines.find(
                (ol) => ol.productVariantId === line.productVariantId
            );
            const variant = variantMap.get(line.productVariantId);
            const unit = variant?.unit;
            const quantity = Number(line.receivedQuantity);
            const conversionFromVariant = Number(unit?.conversionFactor ?? 1);
            const conversionFromOriginal = originalLine?.unitConversionFactor !== undefined && originalLine?.unitConversionFactor !== null
                ? Number(originalLine.unitConversionFactor)
                : null;
            const effectiveConversion = conversionFromVariant || conversionFromOriginal || 1;
            const quantityInBase = Number((quantity * effectiveConversion).toFixed(6));

            return {
                productId: originalLine?.productId ?? '',
                productVariantId: line.productVariantId,
                productName: originalLine?.productName ?? 'Producto',
                productSku: originalLine?.productSku ?? '',
                variantName: originalLine?.variantName,
                quantity,
                quantityInBase,
                unitId: unit?.id ?? originalLine?.unitId ?? variant?.unitId ?? undefined,
                unitOfMeasure: unit?.symbol ?? originalLine?.unitOfMeasure ?? undefined,
                unitConversionFactor: effectiveConversion,
                unitPrice: Number(line.unitPrice),
                unitCost: Number(line.unitCost ?? line.unitPrice),
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
            receptionDate: receptionDateValue,
            receptionNotes: data.notes,
            inspectionStatus: 'APPROVED',
            hasDiscrepancies: discrepancies.length > 0,
            paymentDueDate,
            paymentTermDays: paymentTermDaysApplied,
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

        const receptionTransaction = result.transaction;

        const existingPayment = await transactionRepo.findOne({
            where: {
                relatedTransactionId: receptionTransaction.id,
                transactionType: TransactionType.PAYMENT_OUT,
            },
        });

        if (!existingPayment) {
            const paymentLines = transactionLines.map((line) => ({
                ...line,
                quantity: Number(line.quantity),
                unitPrice: Number(line.unitPrice),
                unitCost: Number(line.unitCost ?? line.unitPrice),
                discountAmount: Number(line.discountAmount ?? 0),
                discountPercentage: Number(line.discountPercentage ?? 0),
                taxAmount: Number(line.taxAmount ?? 0),
                taxRate: Number(line.taxRate ?? 0),
            }));

            const supplierIdForPayment = purchaseOrder.supplierId ?? null;

            if (!supplierIdForPayment) {
                console.warn('Saltando creación de obligación de pago: la orden no tiene proveedor asociado');
            } else {
                const paymentResult = await createTransaction({
                    transactionType: TransactionType.PAYMENT_OUT,
                    supplierId: supplierIdForPayment,
                    userId: session.id,
                    paymentMethod: PaymentMethod.CREDIT,
                    status: TransactionStatus.DRAFT,
                    relatedTransactionId: receptionTransaction.id,
                    metadata: {
                        origin: 'PURCHASE_RECEPTION',
                        receptionTransactionId: receptionTransaction.id,
                        receptionDocumentNumber: receptionTransaction.documentNumber,
                        purchaseOrderId: purchaseOrder.id,
                        paymentDueDate,
                        paymentTermDays: paymentTermDaysApplied,
                        paymentStatus: 'PENDING',
                        receptionTotal: Number(receptionTransaction.total ?? 0),
                    },
                    notes: data.notes,
                    lines: paymentLines,
                });

                if (!paymentResult.success) {
                    console.error('Error creating pending payment transaction for reception:', paymentResult.error);
                    return {
                        success: false,
                        error: paymentResult.error ?? 'Error al generar la obligación de pago',
                    };
                }
            }
        }

        // Actualizar metadata
        await transactionRepo.update(receptionTransaction.id, { metadata: metadata as any });

        // Actualizar estado de la orden de compra a PARTIALLY_RECEIVED o RECEIVED
        const nextStatus = discrepancies.length > 0
            ? TransactionStatus.PARTIALLY_RECEIVED
            : TransactionStatus.RECEIVED;

        const orderMetadata: Record<string, any> = {
            ...(purchaseOrder.metadata ?? {}),
            lastReceptionId: receptionTransaction.id,
            lastReceptionAt: metadata.receptionDate,
            lastReceptionUserId: session.id,
            lastReceptionHasDiscrepancies: discrepancies.length > 0,
            receivedQuantitiesSnapshot: receivedQuantities,
            paymentDueDate,
            paymentTermDays: paymentTermDaysApplied,
        };

        if (discrepancies.length > 0) {
            orderMetadata.lastReceptionDiscrepancies = discrepancies;
        } else if ('lastReceptionDiscrepancies' in orderMetadata) {
            delete orderMetadata.lastReceptionDiscrepancies;
        }

        await transactionRepo.update(purchaseOrder.id, {
            status: nextStatus,
            metadata: orderMetadata as any,
        });

        revalidatePath('/admin/purchasing/receptions');
        revalidatePath('/admin/purchasing/purchase-orders');

        return {
            success: true,
            receptionId: receptionTransaction.id,
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
        const supplierRepo = ds.getRepository(Supplier);

        const supplier = await supplierRepo.findOne({ where: { id: data.supplierId } });
        if (!supplier) {
            return { success: false, error: 'Proveedor no encontrado' };
        }

        const receptionDateValue = data.receptionDate ?? new Date().toISOString();
        const { dueDate: paymentDueDate, termDaysApplied: paymentTermDaysApplied } = computePaymentDueDate({
            requestedDueDate: data.paymentDueDate,
            receptionDate: receptionDateValue,
            supplierTermDays: supplier.defaultPaymentTermDays,
        });

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
        const transactionLines: TransactionLineDTO[] = data.lines.map((line) => {
            const variant = variantMap.get(line.productVariantId)!;
            const product = variant.product;
            const unit = variant.unit;
            const quantity = Number(line.receivedQuantity);
            const conversionFactor = Number(unit?.conversionFactor ?? 1);
            const quantityInBase = Number((quantity * conversionFactor).toFixed(6));

            return {
                productId: product?.id ?? '',
                productVariantId: line.productVariantId,
                productName: product?.name ?? 'Producto',
                productSku: variant.sku,
                variantName: Object.values(variant.attributeValues ?? {}).join(', '),
                quantity,
                quantityInBase,
                unitId: unit?.id ?? variant.unitId ?? undefined,
                unitOfMeasure: unit?.symbol ?? undefined,
                unitConversionFactor: conversionFactor,
                unitPrice: Number(line.unitPrice),
                unitCost: Number(line.unitCost ?? line.unitPrice),
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
            receptionDate: receptionDateValue,
            receptionNotes: data.notes,
            inspectionStatus: 'APPROVED',
            reason: 'DIRECT_PURCHASE',
            paymentDueDate,
            paymentTermDays: paymentTermDaysApplied,
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

        const receptionTransaction = result.transaction;

        const transactionRepo = ds.getRepository(Transaction);
        const existingPayment = await transactionRepo.findOne({
            where: {
                relatedTransactionId: receptionTransaction.id,
                transactionType: TransactionType.PAYMENT_OUT,
            },
        });

        if (!existingPayment) {
            const paymentLines = transactionLines.map((line) => ({
                ...line,
                quantity: Number(line.quantity),
                unitPrice: Number(line.unitPrice),
                unitCost: Number(line.unitCost ?? line.unitPrice),
                discountAmount: Number(line.discountAmount ?? 0),
                discountPercentage: Number(line.discountPercentage ?? 0),
                taxAmount: Number(line.taxAmount ?? 0),
                taxRate: Number(line.taxRate ?? 0),
            }));

            const paymentResult = await createTransaction({
                transactionType: TransactionType.PAYMENT_OUT,
                supplierId: data.supplierId,
                userId: session.id,
                paymentMethod: PaymentMethod.CREDIT,
                status: TransactionStatus.DRAFT,
                relatedTransactionId: receptionTransaction.id,
                metadata: {
                    origin: 'DIRECT_RECEPTION',
                    receptionTransactionId: receptionTransaction.id,
                    receptionDocumentNumber: receptionTransaction.documentNumber,
                    paymentDueDate,
                    paymentTermDays: paymentTermDaysApplied,
                    paymentStatus: 'PENDING',
                    receptionTotal: Number(receptionTransaction.total ?? 0),
                },
                notes: data.notes,
                lines: paymentLines,
            });

            if (!paymentResult.success) {
                console.error('Error creating pending payment transaction for direct reception:', paymentResult.error);
                return {
                    success: false,
                    error: paymentResult.error ?? 'Error al generar la obligación de pago',
                };
            }
        }

        // Actualizar metadata
        await transactionRepo.update(receptionTransaction.id, { metadata: metadata as any });

        revalidatePath('/admin/purchasing/receptions');

        return {
            success: true,
            receptionId: receptionTransaction.id,
        };
    } catch (err) {
        console.error('Error creating direct reception:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error al crear la recepción',
        };
    }
}

export interface CancelReceptionResult {
    success: boolean;
    error?: string;
}

export async function cancelReception(receptionId: string, reason: string): Promise<CancelReceptionResult> {
    try {
        const trimmedReason = reason?.trim();
        if (!receptionId) {
            return { success: false, error: 'Recepción inválida' };
        }

        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const result = await cancelTransaction(
            receptionId,
            session.id,
            trimmedReason && trimmedReason.length > 0 ? trimmedReason : 'Anulación de recepción'
        );

        if (!result.success) {
            return {
                success: false,
                error: result.error ?? 'No se pudo anular la recepción',
            };
        }

        revalidatePath('/admin/purchasing/receptions');
        return { success: true };
    } catch (err) {
        console.error('Error cancelling reception:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error al anular la recepción',
        };
    }
}
