'use server'

import { getDb } from '@/data/db';
import { Transaction, TransactionType, TransactionStatus, PaymentMethod } from '@/data/entities/Transaction';
import { TransactionLine } from '@/data/entities/TransactionLine';
import { CashSession } from '@/data/entities/CashSession';
import { revalidatePath } from 'next/cache';

// Types
interface GetTransactionsParams {
    search?: string;
    type?: TransactionType;
    status?: TransactionStatus;
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

interface TransactionLineDTO {
    productId: string;
    productVariantId?: string;
    productName: string;
    productSku: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    discountPercentage?: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    notes?: string;
}

interface CreateTransactionDTO {
    transactionType: TransactionType;
    branchId: string;
    pointOfSaleId?: string;
    cashSessionId?: string;
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
}

interface TransactionResult {
    success: boolean;
    transaction?: Transaction;
    error?: string;
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
        .leftJoinAndSelect('supplier.person', 'supplierPerson');
    
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
        const cashSessionRepo = queryRunner.manager.getRepository(CashSession);
        
        // Validaciones
        if (!data.lines || data.lines.length === 0) {
            throw new Error('La transacción debe tener al menos una línea');
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
            const lineSubtotal = line.quantity * line.unitPrice;
            const lineDiscount = line.discountAmount ?? 0;
            const lineTax = line.taxAmount ?? 0;
            
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
        
        // Crear transacción
        const transaction = transactionRepo.create({
            transactionType: data.transactionType,
            status: TransactionStatus.CONFIRMED,
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
            subtotal,
            discountAmount: totalDiscount,
            taxAmount: totalTax,
            total,
            notes: data.notes
        });
        
        await transactionRepo.save(transaction);
        
        // Crear líneas y actualizar inventario
        for (let i = 0; i < data.lines.length; i++) {
            const lineData = data.lines[i];
            const lineSubtotal = lineData.quantity * lineData.unitPrice;
            const lineTotal = lineSubtotal - (lineData.discountAmount ?? 0) + (lineData.taxAmount ?? 0);
            
            const line = lineRepo.create({
                transactionId: transaction.id,
                productId: lineData.productId,
                productVariantId: lineData.productVariantId,
                lineNumber: i + 1,
                productName: lineData.productName,
                productSku: lineData.productSku,
                variantName: lineData.variantName,
                quantity: lineData.quantity,
                unitPrice: lineData.unitPrice,
                unitCost: lineData.unitCost,
                discountPercentage: lineData.discountPercentage ?? 0,
                discountAmount: lineData.discountAmount ?? 0,
                taxRate: lineData.taxRate ?? 0,
                taxAmount: lineData.taxAmount ?? 0,
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
        quantity: line.quantity, // Positivo, el tipo de transacción determina el efecto
        unitPrice: line.unitPrice,
        unitCost: line.unitCost,
        discountPercentage: line.discountPercentage,
        discountAmount: line.discountAmount,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        notes: `Devolución de ${original.documentNumber}: ${reason}`
    }));
    
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
        lines: cancelLines
    });
    
    if (result.success) {
        // Marcar la original como cancelada
        await transactionRepo.update(transactionId, { 
            status: TransactionStatus.CANCELLED 
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
            return 'CMP-';
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
        default:
            return 'DOC-';
    }
}

function getStockChange(type: TransactionType, quantity: number): number {
    switch (type) {
        case TransactionType.SALE:
            return -quantity;           // Ventas reducen stock
        case TransactionType.PURCHASE:
            return quantity;            // Compras aumentan stock
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
