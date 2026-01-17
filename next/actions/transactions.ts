'use server'

import { getDb } from '@/data/db';
import { Transaction, TransactionType, TransactionStatus, PaymentMethod } from '@/data/entities/Transaction';
import { TransactionLine } from '@/data/entities/TransactionLine';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { CashSession } from '@/data/entities/CashSession';
import { User } from '@/data/entities/User';
import { revalidatePath } from 'next/cache';
import { EntityManager, IsNull } from 'typeorm';

// Types
interface GetTransactionsParams {
    search?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    paymentMethod?: PaymentMethod;
    branchId?: string;
    pointOfSaleId?: string;
    cashSessionId?: string;
    customerId?: string;
    supplierId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

interface TransactionsResponse {
    data: Transaction[];
    total: number;
}

export interface TransactionLineDTO {
    productId: string;
    productVariantId?: string;
    productName: string;
    productSku: string;
    variantName?: string;
    quantity: number;
    unitId?: string;
    unitOfMeasure?: string;
    unitConversionFactor?: number;
    quantityInBase?: number;
    unitPrice: number;
    unitCost?: number;
    discountPercentage?: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    notes?: string;
}

export interface CreateTransactionDTO {
    transactionType: TransactionType;
    branchId?: string;
    pointOfSaleId?: string;
    cashSessionId?: string;
    bankAccountKey?: string | null;
    storageId?: string;
    targetStorageId?: string;
    customerId?: string;
    supplierId?: string;
    userId: string;
    paymentMethod?: PaymentMethod;
    documentNumber?: string;
    externalReference?: string;
    notes?: string;
    lines: TransactionLineDTO[];
    status?: TransactionStatus;
    relatedTransactionId?: string;
    metadata?: Record<string, any> | null;
}

interface TransactionResult {
    success: boolean;
    transaction?: Transaction;
    error?: string;
}

const INVENTORY_IN_TRANSACTION_TYPES: TransactionType[] = [
    TransactionType.PURCHASE,
    TransactionType.SALE_RETURN,
    TransactionType.TRANSFER_IN,
    TransactionType.ADJUSTMENT_IN,
];

const INVENTORY_OUT_TRANSACTION_TYPES: TransactionType[] = [
    TransactionType.SALE,
    TransactionType.PURCHASE_RETURN,
    TransactionType.TRANSFER_OUT,
    TransactionType.ADJUSTMENT_OUT,
];

async function getVariantTotalStock(manager: EntityManager, variantId: string): Promise<number> {
    const result = await manager
        .createQueryBuilder()
        .select(
            `COALESCE(SUM(CASE
                WHEN tx.transactionType IN (:...inTypes) THEN COALESCE(line.quantityInBase, line.quantity)
                WHEN tx.transactionType IN (:...outTypes) THEN -COALESCE(line.quantityInBase, line.quantity)
                ELSE 0
            END), 0)`,
            'stock'
        )
        .from(TransactionLine, 'line')
        .innerJoin(Transaction, 'tx', 'tx.id = line.transactionId')
        .where('line.productVariantId = :variantId', { variantId })
        .andWhere('tx.status = :status', { status: TransactionStatus.CONFIRMED })
        .setParameters({
            inTypes: INVENTORY_IN_TRANSACTION_TYPES,
            outTypes: INVENTORY_OUT_TRANSACTION_TYPES,
        })
        .getRawOne<{ stock: string | null }>();

    const rawStock = result?.stock;
    const numericStock = rawStock !== null && rawStock !== undefined ? Number(rawStock) : 0;
    return Number.isFinite(numericStock) ? numericStock : 0;
}

/**
 * Obtiene transacciones con filtros y paginación
 * Las transacciones son INMUTABLES - solo lectura después de creadas
 */
export async function getTransactions(params?: GetTransactionsParams): Promise<TransactionsResponse> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    
    const queryBuilder = repo.createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.branch', 'branch')
        .leftJoinAndSelect('transaction.pointOfSale', 'pointOfSale')
        .leftJoinAndSelect('transaction.customer', 'customer')
        .leftJoinAndSelect('customer.person', 'customerPerson')
        .leftJoinAndSelect('transaction.supplier', 'supplier')
        .leftJoinAndSelect('supplier.person', 'supplierPerson')
        .leftJoinAndSelect('transaction.user', 'transactionUser')
        .leftJoinAndSelect('transactionUser.person', 'transactionUserPerson');
    
    if (params?.search) {
        queryBuilder.andWhere(
            '(transaction.documentNumber LIKE :search OR transaction.externalReference LIKE :search)',
            { search: `%${params.search}%` }
        );
    }
    
    if (params?.type) {
        queryBuilder.andWhere('transaction.transactionType = :type', { type: params.type });
    }
    
    if (params?.status) {
        queryBuilder.andWhere('transaction.status = :status', { status: params.status });
    }

    if (params?.paymentMethod) {
        queryBuilder.andWhere('transaction.paymentMethod = :paymentMethod', { paymentMethod: params.paymentMethod });
    }
    
    if (params?.branchId) {
        queryBuilder.andWhere('transaction.branchId = :branchId', { branchId: params.branchId });
    }
    
    if (params?.pointOfSaleId) {
        queryBuilder.andWhere('transaction.pointOfSaleId = :pointOfSaleId', { pointOfSaleId: params.pointOfSaleId });
    }
    
    if (params?.cashSessionId) {
        queryBuilder.andWhere('transaction.cashSessionId = :cashSessionId', { cashSessionId: params.cashSessionId });
    }
    
    if (params?.customerId) {
        queryBuilder.andWhere('transaction.customerId = :customerId', { customerId: params.customerId });
    }
    
    if (params?.supplierId) {
        queryBuilder.andWhere('transaction.supplierId = :supplierId', { supplierId: params.supplierId });
    }
    
    if (params?.dateFrom && params?.dateTo) {
        queryBuilder.andWhere('transaction.createdAt BETWEEN :dateFrom AND :dateTo', {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo
        });
    } else if (params?.dateFrom) {
        queryBuilder.andWhere('transaction.createdAt >= :dateFrom', { dateFrom: params.dateFrom });
    } else if (params?.dateTo) {
        queryBuilder.andWhere('transaction.createdAt <= :dateTo', { dateTo: params.dateTo });
    }
    
    queryBuilder
        .orderBy('transaction.createdAt', 'DESC')
        .skip(skip)
        .take(limit);
    
    const [data, total] = await queryBuilder.getManyAndCount();
    
    return { data, total };
}

const buildPersonFullName = (person?: { firstName?: string | null; lastName?: string | null; businessName?: string | null } | null): string | null => {
    if (!person) {
        return null;
    }

    if (person.businessName && person.businessName.trim().length > 0) {
        return person.businessName.trim();
    }

    const firstName = person.firstName?.trim() ?? '';
    const lastName = person.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName.length > 0 ? fullName : null;
};

const normalizeStartOfDay = (value?: string): Date | undefined => {
    if (!value) {
        return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const normalizeEndOfDay = (value?: string): Date | undefined => {
    if (!value) {
        return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    date.setUTCHours(23, 59, 59, 999);
    return date;
};

export interface SalesTransactionFilters {
    status?: TransactionStatus;
    paymentMethod?: PaymentMethod;
    branchId?: string;
    pointOfSaleId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export interface SalesTransactionListItem {
    id: string;
    documentNumber: string;
    createdAt: string;
    status: TransactionStatus;
    paymentMethod: PaymentMethod | null;
    total: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    branchName: string | null;
    pointOfSaleName: string | null;
    cashSessionId: string | null;
    customerName: string | null;
    userId: string | null;
    userName: string | null;
    userFullName: string | null;
    notes: string | null;
}

export interface SalesTransactionListResult {
    rows: SalesTransactionListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export async function listSaleTransactions(params?: {
    filters?: SalesTransactionFilters;
    page?: number;
    pageSize?: number;
}): Promise<SalesTransactionListResult> {
    const filters = params?.filters ?? {};
    const page = Math.max(params?.page ?? 1, 1);
    const requestedPageSize = params?.pageSize ?? 25;
    const pageSize = Math.min(Math.max(requestedPageSize, 1), 200);

    const dateFrom = normalizeStartOfDay(filters.dateFrom);
    const dateTo = normalizeEndOfDay(filters.dateTo);

    const response = await getTransactions({
        page,
        limit: pageSize,
        type: TransactionType.SALE,
        status: filters.status,
        paymentMethod: filters.paymentMethod,
        branchId: filters.branchId,
        pointOfSaleId: filters.pointOfSaleId,
        dateFrom,
        dateTo,
        search: filters.search?.trim() || undefined,
    });

    const rows: SalesTransactionListItem[] = response.data.map((transaction) => {
        const branch = transaction.branch ?? null;
        const pointOfSale = transaction.pointOfSale ?? null;
        const customer = transaction.customer ?? null;
        const customerPerson = customer?.person ?? null;
        const user = transaction.user as (User & { person?: { firstName?: string | null; lastName?: string | null } | null }) | null;
        const userPerson = user?.person ?? null;

        const paymentMethod = transaction.paymentMethod ?? null;

        return {
            id: transaction.id,
            documentNumber: transaction.documentNumber,
            createdAt: transaction.createdAt instanceof Date
                ? transaction.createdAt.toISOString()
                : new Date(transaction.createdAt as any).toISOString(),
            status: transaction.status,
            paymentMethod,
            total: Number(transaction.total ?? 0),
            subtotal: Number(transaction.subtotal ?? 0),
            taxAmount: Number(transaction.taxAmount ?? 0),
            discountAmount: Number(transaction.discountAmount ?? 0),
            branchName: branch?.name ?? null,
            pointOfSaleName: pointOfSale?.name ?? null,
            cashSessionId: transaction.cashSessionId ?? null,
            customerName: buildPersonFullName(customerPerson ?? null),
            userId: user?.id ?? null,
            userName: user?.userName ?? null,
            userFullName: buildPersonFullName(userPerson ?? null),
            notes: transaction.notes ?? null,
        };
    });

    return JSON.parse(
        JSON.stringify({
            rows,
            total: response.total,
            page,
            pageSize,
        }),
    );
}

/**
 * Obtiene una transacción por ID con todas sus líneas
 */
export async function getTransactionById(id: string): Promise<(Transaction & { lines: TransactionLine[] }) | null> {
    const ds = await getDb();
    const transactionRepo = ds.getRepository(Transaction);
    const lineRepo = ds.getRepository(TransactionLine);
    
    const transaction = await transactionRepo.findOne({
        where: { id },
        relations: ['branch', 'pointOfSale', 'cashSession', 'customer', 'customer.person', 'supplier', 'supplier.person', 'user']
    });
    
    if (!transaction) return null;
    
    const lines = await lineRepo.find({
        where: { transactionId: id },
        relations: ['product', 'productVariant'],
        order: { lineNumber: 'ASC' }
    });
    
    return { ...transaction, lines } as any;
}

/**
 * Obtiene una transacción por número de documento
 */
export async function getTransactionByDocumentNumber(documentNumber: string): Promise<Transaction | null> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);
    
    return repo.findOne({
        where: { documentNumber },
        relations: ['branch', 'customer', 'customer.person']
    });
}

/**
 * Crea una nueva transacción
 * IMPORTANTE: Las transacciones son INMUTABLES después de creadas
 */
export async function createTransaction(data: CreateTransactionDTO): Promise<TransactionResult> {
    const ds = await getDb();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        const transactionRepo = queryRunner.manager.getRepository(Transaction);
        const lineRepo = queryRunner.manager.getRepository(TransactionLine);
        const variantRepo = queryRunner.manager.getRepository(ProductVariant);
        const cashSessionRepo = queryRunner.manager.getRepository(CashSession);
        const variantCache = new Map<string, ProductVariant>();
        const variantStockCache = new Map<string, number>();
        
        // Validaciones
        if (!data.lines || data.lines.length === 0) {
            throw new Error('La transacción debe tener al menos una línea');
        }

        const userRepo = queryRunner.manager.getRepository(User);
        const userExists = await userRepo.exists({ where: { id: data.userId, deletedAt: IsNull() } });

        if (!userExists) {
            throw new Error('El usuario asociado a la sesión ya no existe o fue desactivado. Cierra sesión e inicia nuevamente.');
        }
        
        // Verificar sesión de caja si es venta
        if (data.transactionType === TransactionType.SALE && data.cashSessionId) {
            const cashSession = await cashSessionRepo.findOne({
                where: { id: data.cashSessionId }
            });
            if (!cashSession) {
                throw new Error('Sesión de caja no encontrada');
            }
            if (cashSession.closedAt) {
                throw new Error('La sesión de caja está cerrada');
            }
        }
        
        // Calcular totales
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        
        for (const line of data.lines) {
            const lineQuantity = Number(line.quantity);
            const lineUnitPrice = Number(line.unitPrice);
            const lineSubtotal = lineQuantity * lineUnitPrice;
            const lineDiscount = Number(line.discountAmount ?? 0);
            const lineTax = Number(line.taxAmount ?? 0);
            
            subtotal += lineSubtotal;
            totalDiscount += lineDiscount;
            totalTax += lineTax;
        }
        
        const total = subtotal - totalDiscount + totalTax;
        
        // Generar número de documento si no se proporciona
        let documentNumber = data.documentNumber;
        if (!documentNumber) {
            const prefix = getDocumentPrefix(data.transactionType);
            const lastTransaction = await transactionRepo.findOne({
                where: { transactionType: data.transactionType },
                order: { createdAt: 'DESC' }
            });
            
            const lastNumber = lastTransaction?.documentNumber 
                ? parseInt(lastTransaction.documentNumber.replace(prefix, '')) || 0 
                : 0;
            documentNumber = `${prefix}${String(lastNumber + 1).padStart(8, '0')}`;
        }
        
        const normalizedMetadata = data.metadata
            ? JSON.parse(JSON.stringify(data.metadata))
            : undefined;

        // Crear transacción
        const transaction = transactionRepo.create({
            transactionType: data.transactionType,
            status: data.status ?? TransactionStatus.CONFIRMED,
            branchId: data.branchId,
            pointOfSaleId: data.pointOfSaleId,
            cashSessionId: data.cashSessionId,
            storageId: data.storageId,
            targetStorageId: data.targetStorageId,
            customerId: data.customerId,
            supplierId: data.supplierId,
            userId: data.userId,
            documentNumber,
            externalReference: data.externalReference,
            paymentMethod: data.paymentMethod ?? PaymentMethod.CASH,
            bankAccountKey: data.bankAccountKey ?? undefined,
            subtotal,
            discountAmount: totalDiscount,
            taxAmount: totalTax,
            total,
            notes: data.notes,
            relatedTransactionId: data.relatedTransactionId,
            metadata: normalizedMetadata,
        });
        
        await transactionRepo.save(transaction);
        
        // Crear líneas y actualizar inventario
        for (let i = 0; i < data.lines.length; i++) {
            const lineData = data.lines[i];
            const lineQuantity = Number(lineData.quantity);
            const lineUnitPrice = Number(lineData.unitPrice);
            const lineUnitCost = lineData.unitCost !== undefined && lineData.unitCost !== null
                ? Number(lineData.unitCost)
                : undefined;
            const lineDiscountAmount = lineData.discountAmount !== undefined && lineData.discountAmount !== null
                ? Number(lineData.discountAmount)
                : 0;
            const lineTaxAmount = lineData.taxAmount !== undefined && lineData.taxAmount !== null
                ? Number(lineData.taxAmount)
                : 0;
            const lineSubtotal = lineQuantity * lineUnitPrice;
            const lineTotal = lineSubtotal - lineDiscountAmount + lineTaxAmount;

            let unitId = lineData.unitId ?? null;
            let unitOfMeasure = lineData.unitOfMeasure ?? null;
            let unitConversionFactor = lineData.unitConversionFactor ?? null;
            let quantityInBase = lineData.quantityInBase ?? null;

            if ((!unitId || !unitOfMeasure || unitConversionFactor === null || unitConversionFactor === undefined) && lineData.productVariantId) {
                let variant = variantCache.get(lineData.productVariantId);
                if (!variant) {
                    const fetchedVariant = await variantRepo.findOne({ where: { id: lineData.productVariantId } });
                    if (fetchedVariant) {
                        variantCache.set(lineData.productVariantId, fetchedVariant);
                        variant = fetchedVariant;
                    }
                }

                if (variant?.unit) {
                    unitId = unitId ?? variant.unitId;
                    unitOfMeasure = unitOfMeasure ?? variant.unit.symbol;
                    unitConversionFactor = unitConversionFactor ?? Number(variant.unit.conversionFactor ?? 1);
                }
            }

            const effectiveConversion = unitConversionFactor !== null && unitConversionFactor !== undefined
                ? Number(unitConversionFactor)
                : unitId
                    ? 1
                    : null;

            if (quantityInBase === null || quantityInBase === undefined) {
                if (effectiveConversion !== null && effectiveConversion !== undefined) {
                    quantityInBase = Number((lineQuantity * effectiveConversion).toFixed(6));
                } else {
                    quantityInBase = Number(lineQuantity);
                }
            } else {
                quantityInBase = Number(quantityInBase);
            }

            const normalizedConversion = effectiveConversion !== null && effectiveConversion !== undefined
                ? Number(effectiveConversion)
                : null;

            if (
                data.transactionType === TransactionType.PURCHASE &&
                transaction.status === TransactionStatus.CONFIRMED &&
                lineData.productVariantId
            ) {
                const incomingQuantityBase = Number(quantityInBase ?? 0);

                if (incomingQuantityBase > 0) {
                    let variant = variantCache.get(lineData.productVariantId);
                    if (!variant) {
                        const fetchedVariant = await variantRepo.findOne({ where: { id: lineData.productVariantId } });
                        if (fetchedVariant) {
                            variantCache.set(lineData.productVariantId, fetchedVariant);
                            variant = fetchedVariant;
                        }
                    }

                    if (variant) {
                        let currentStock: number;
                        if (variantStockCache.has(variant.id)) {
                            currentStock = variantStockCache.get(variant.id)!;
                        } else {
                            currentStock = await getVariantTotalStock(queryRunner.manager, variant.id);
                            variantStockCache.set(variant.id, currentStock);
                        }

                        const currentPmp = Number(variant.pmp ?? 0);
                        const effectiveUnitCost = lineUnitCost !== undefined ? lineUnitCost : lineUnitPrice;
                        const denominator = currentStock + incomingQuantityBase;
                        const nextPmp = denominator > 0
                            ? ((currentStock * currentPmp) + (incomingQuantityBase * effectiveUnitCost)) / denominator
                            : effectiveUnitCost;
                        const normalizedPmp = Number(nextPmp.toFixed(2));

                        await variantRepo.update(variant.id, { pmp: normalizedPmp });

                        variant.pmp = normalizedPmp;
                        variantCache.set(variant.id, variant);
                        const updatedStock = currentStock + incomingQuantityBase;
                        variantStockCache.set(variant.id, updatedStock);
                    }
                }
            }
            
            const line = lineRepo.create({
                transactionId: transaction.id,
                productId: lineData.productId,
                productVariantId: lineData.productVariantId,
                lineNumber: i + 1,
                productName: lineData.productName,
                productSku: lineData.productSku,
                variantName: lineData.variantName,
                quantity: lineQuantity,
                quantityInBase: quantityInBase,
                unitOfMeasure: unitOfMeasure ?? undefined,
                unitId: unitId ?? undefined,
                unitConversionFactor: normalizedConversion ?? undefined,
                unitPrice: lineUnitPrice,
                unitCost: lineUnitCost,
                discountPercentage: Number(lineData.discountPercentage ?? 0),
                discountAmount: lineDiscountAmount,
                taxRate: Number(lineData.taxRate ?? 0),
                taxAmount: lineTaxAmount,
                subtotal: lineSubtotal,
                total: lineTotal,
                notes: lineData.notes
            });
            
            await lineRepo.save(line);
            
            // NOTA: El inventario se maneja mediante la tabla StockLevel
            // Las transacciones registran los movimientos pero el stock actual
            // se calcula desde StockLevel o se actualiza mediante un proceso separado
        }
        
        // NOTA: Los totales de la sesión de caja se calculan desde las transacciones relacionadas
        // No se actualizan campos denormalizados en CashSession
        
        await queryRunner.commitTransaction();
        
        // Recargar con relaciones
        const savedTransaction = await getTransactionById(transaction.id);
        
        revalidatePath('/admin/sales/transactions');
        revalidatePath('/admin/reports');
        
        return { success: true, transaction: savedTransaction as Transaction };
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating transaction:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al crear la transacción' 
        };
    } finally {
        await queryRunner.release();
    }
}

/**
 * Cancela una transacción creando una transacción de devolución/anulación
 * La transacción original NO se modifica (inmutabilidad)
 */
export async function cancelTransaction(
    transactionId: string, 
    userId: string,
    reason: string
): Promise<TransactionResult> {
    const ds = await getDb();
    const transactionRepo = ds.getRepository(Transaction);
    
    const original = await getTransactionById(transactionId);
    if (!original) {
        return { success: false, error: 'Transacción no encontrada' };
    }
    
    if (original.status === TransactionStatus.CANCELLED) {
        return { success: false, error: 'La transacción ya está cancelada' };
    }
    
    // Determinar tipo de cancelación
    let cancelType: TransactionType;
    switch (original.transactionType) {
        case TransactionType.SALE:
            cancelType = TransactionType.SALE_RETURN;
            break;
        case TransactionType.PURCHASE:
            cancelType = TransactionType.PURCHASE_RETURN;
            break;
        default:
            return { success: false, error: 'Este tipo de transacción no puede ser cancelada' };
    }
    
    // Crear transacción de cancelación con valores invertidos
    const cancelLines: TransactionLineDTO[] = original.lines.map(line => ({
        productId: line.productId,
        productVariantId: line.productVariantId,
        productName: `[DEVOLUCIÓN] ${line.productName}`,
        productSku: line.productSku,
        variantName: line.variantName,
        quantity: Number(line.quantity),
        unitId: line.unitId ?? undefined,
        unitOfMeasure: line.unitOfMeasure ?? undefined,
        unitConversionFactor: line.unitConversionFactor !== undefined && line.unitConversionFactor !== null
            ? Number(line.unitConversionFactor)
            : undefined,
        quantityInBase: line.quantityInBase !== undefined && line.quantityInBase !== null
            ? Number(line.quantityInBase)
            : undefined,
        unitPrice: Number(line.unitPrice),
        unitCost: line.unitCost !== undefined && line.unitCost !== null ? Number(line.unitCost) : undefined,
        discountPercentage: Number(line.discountPercentage ?? 0),
        discountAmount: Number(line.discountAmount ?? 0),
        taxRate: Number(line.taxRate ?? 0),
        taxAmount: Number(line.taxAmount ?? 0),
        notes: `Devolución de ${original.documentNumber}: ${reason}`
    }));
    
    const cancellationMetadata = {
        origin: 'PURCHASE_CANCELLATION',
        originalTransactionId: original.id,
        originalDocumentNumber: original.documentNumber,
        cancellationReason: reason,
    };

    const result = await createTransaction({
        transactionType: cancelType,
        branchId: original.branchId,
        pointOfSaleId: original.pointOfSaleId,
        cashSessionId: original.cashSessionId,
        storageId: original.storageId,
        customerId: original.customerId,
        supplierId: original.supplierId,
        userId,
        paymentMethod: original.paymentMethod,
        externalReference: original.documentNumber,
        notes: `Devolución de ${original.documentNumber}: ${reason}`,
        lines: cancelLines,
        relatedTransactionId: original.id,
        metadata: cancellationMetadata,
    });
    
    if (result.success && result.transaction) {
        const existingMetadata = original.metadata
            ? JSON.parse(JSON.stringify(original.metadata))
            : {};

        const updatedMetadata = {
            ...existingMetadata,
            cancellation: {
                transactionId: result.transaction.id,
                documentNumber: result.transaction.documentNumber,
                reason,
                cancelledAt: new Date().toISOString(),
            },
        };

        await transactionRepo.update(transactionId, {
            status: TransactionStatus.CANCELLED,
            metadata: updatedMetadata as any,
        });
    }
    
    return result;
}

/**
 * Obtiene el resumen de ventas de un período
 */
export async function getSalesSummary(
    branchId?: string,
    dateFrom?: Date,
    dateTo?: Date
): Promise<{
    totalSales: number;
    totalTransactions: number;
    averageTicket: number;
    byPaymentMethod: Record<string, number>;
}> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);
    
    const queryBuilder = repo.createQueryBuilder('transaction')
        .where('transaction.transactionType = :type', { type: TransactionType.SALE })
        .andWhere('transaction.status = :status', { status: TransactionStatus.CONFIRMED });
    
    if (branchId) {
        queryBuilder.andWhere('transaction.branchId = :branchId', { branchId });
    }
    
    if (dateFrom && dateTo) {
        queryBuilder.andWhere('transaction.createdAt BETWEEN :dateFrom AND :dateTo', {
            dateFrom,
            dateTo
        });
    }
    
    const transactions = await queryBuilder.getMany();
    
    const totalSales = transactions.reduce((sum: number, t: Transaction) => sum + Number(t.total), 0);
    const totalTransactions = transactions.length;
    const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    const byPaymentMethod: Record<string, number> = {};
    for (const t of transactions) {
        const method = t.paymentMethod || 'OTROS';
        byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(t.total);
    }
    
    return {
        totalSales: Math.round(totalSales * 100) / 100,
        totalTransactions,
        averageTicket: Math.round(averageTicket * 100) / 100,
        byPaymentMethod
    };
}

/**
 * Obtiene las líneas de una transacción
 */
export async function getTransactionLines(transactionId: string): Promise<TransactionLine[]> {
    const ds = await getDb();
    const repo = ds.getRepository(TransactionLine);
    
    return repo.find({
        where: { transactionId },
        relations: ['product', 'productVariant'],
        order: { lineNumber: 'ASC' }
    });
}

// ==================== HELPERS ====================

function getDocumentPrefix(type: TransactionType): string {
    switch (type) {
        case TransactionType.SALE:
            return 'VTA-';
        case TransactionType.PURCHASE:
            return 'REC-';
        case TransactionType.PURCHASE_ORDER:
            return 'OC-';
        case TransactionType.SALE_RETURN:
            return 'DVT-';
        case TransactionType.PURCHASE_RETURN:
            return 'DCP-';
        case TransactionType.ADJUSTMENT_IN:
            return 'AJE-';
        case TransactionType.ADJUSTMENT_OUT:
            return 'AJS-';
        case TransactionType.TRANSFER_IN:
            return 'TRE-';
        case TransactionType.TRANSFER_OUT:
            return 'TRS-';
        case TransactionType.PAYMENT_IN:
            return 'PIE-';
        case TransactionType.PAYMENT_OUT:
            return 'PIS-';
        case TransactionType.OPERATING_EXPENSE:
            return 'GOP-';
        case TransactionType.CASH_SESSION_WITHDRAWAL:
            return 'RCS-';
        default:
            return 'DOC-';
    }
}

function getStockChange(type: TransactionType, quantity: number): number {
    switch (type) {
        case TransactionType.SALE:
            return -quantity;           // Ventas reducen stock
        case TransactionType.PURCHASE:
            return quantity;            // Recepciones aumentan stock
        case TransactionType.PURCHASE_ORDER:
            return 0;                   // Órdenes de compra no mueven stock
        case TransactionType.SALE_RETURN:
            return quantity;            // Devoluciones de venta aumentan stock
        case TransactionType.PURCHASE_RETURN:
            return -quantity;           // Devoluciones de compra reducen stock
        case TransactionType.ADJUSTMENT_IN:
            return quantity;            // Ajustes de entrada aumentan stock
        case TransactionType.ADJUSTMENT_OUT:
            return -quantity;           // Ajustes de salida reducen stock
        case TransactionType.TRANSFER_IN:
            return quantity;            // Transferencias de entrada aumentan stock
        case TransactionType.TRANSFER_OUT:
            return -quantity;           // Transferencias de salida reducen stock
        default:
            return 0;
    }
}
