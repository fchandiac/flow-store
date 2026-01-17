'use server'

import { getDb } from '@/data/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { Transaction, TransactionType, PaymentMethod } from '@/data/entities/Transaction';
import { User } from '@/data/entities/User';
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from './auth.server';

// Types
interface GetSessionsParams {
    pointOfSaleId?: string;
    branchId?: string;
    status?: CashSessionStatus;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

interface SessionsResponse {
    data: CashSession[];
    total: number;
}

interface SessionSummary {
    openingBalance: number;
    totalSales: number;
    totalReturns: number;
    cashIn: number;
    cashOut: number;
    expectedBalance: number;
    transactionCount: number;
}

interface SessionWithSummary extends CashSession {
    summary: SessionSummary;
}

interface OpenSessionDTO {
    pointOfSaleId: string;
    userId: string;
    openingAmount: number;
    notes?: string;
}

interface CloseSessionDTO {
    sessionId: string;
    userId: string;
    closingAmount: number;
    notes?: string;
}

interface SessionResult {
    success: boolean;
    session?: CashSession;
    error?: string;
}

interface CloseResult extends SessionResult {
    difference?: number;
}

export interface CashSessionListFilters {
    status?: CashSessionStatus;
    pointOfSaleId?: string;
    branchId?: string;
}

export interface CashSessionListItem {
    id: string;
    status: CashSessionStatus;
    pointOfSaleId: string | null;
    pointOfSaleName: string | null;
    branchId: string | null;
    branchName: string | null;
    openedAt: string;
    closedAt: string | null;
    openingAmount: number;
    closingAmount: number | null;
    expectedAmount: number | null;
    difference: number | null;
    openedById: string | null;
    openedByUserName: string | null;
    openedByFullName: string | null;
    closedById: string | null;
    closedByUserName: string | null;
    closedByFullName: string | null;
    notes: string | null;
}

export interface CashSessionListResult {
    rows: CashSessionListItem[];
    total: number;
}

export interface CashSessionMovementItem {
    id: string;
    transactionType: TransactionType;
    transactionTypeLabel: string;
    direction: 'IN' | 'OUT' | 'NEUTRAL';
    documentNumber: string;
    createdAt: string;
    total: number;
    paymentMethod: PaymentMethod | null;
    paymentMethodLabel: string | null;
    userId: string | null;
    userUserName: string | null;
    userFullName: string | null;
    notes: string | null;
    reason: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface CashSessionMovementsResult {
    movements: CashSessionMovementItem[];
}

const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
        return null;
    }
    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
};

const buildFullName = (person?: { firstName?: string | null; lastName?: string | null } | null): string | null => {
    if (!person) {
        return null;
    }
    const firstName = person.firstName?.trim() ?? '';
    const lastName = person.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName.length > 0 ? fullName : null;
};

/**
 * Obtiene sesiones de caja con filtros
 */
export async function getCashSessions(params: GetSessionsParams): Promise<SessionsResponse> {
    const ds = await getDb();
    const repo = ds.getRepository(CashSession);
    
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    
    const queryBuilder = repo.createQueryBuilder('session')
        .leftJoinAndSelect('session.pointOfSale', 'pos')
        .leftJoinAndSelect('pos.branch', 'branch')
        .leftJoinAndSelect('session.openedBy', 'openedBy')
        .leftJoinAndSelect('openedBy.person', 'openedByPerson')
        .leftJoinAndSelect('session.closedBy', 'closedBy')
        .leftJoinAndSelect('closedBy.person', 'closedByPerson');
    
    if (params.pointOfSaleId) {
        queryBuilder.andWhere('session.pointOfSaleId = :posId', { posId: params.pointOfSaleId });
    }
    
    if (params.branchId) {
        queryBuilder.andWhere('pos.branchId = :branchId', { branchId: params.branchId });
    }
    
    if (params.status) {
        queryBuilder.andWhere('session.status = :status', { status: params.status });
    }
    
    if (params.dateFrom) {
        queryBuilder.andWhere('session.openedAt >= :dateFrom', { dateFrom: params.dateFrom });
    }
    
    if (params.dateTo) {
        queryBuilder.andWhere('session.openedAt <= :dateTo', { dateTo: params.dateTo });
    }
    
    queryBuilder
        .orderBy('session.openedAt', 'DESC')
        .skip(skip)
        .take(limit);
    
    const [data, total] = await queryBuilder.getManyAndCount();
    
    return { data, total };
}

export async function listCashSessions(params?: { filters?: CashSessionListFilters }): Promise<CashSessionListResult> {
    const filters = params?.filters ?? {};

    const response = await getCashSessions({
        status: filters.status,
        pointOfSaleId: filters.pointOfSaleId,
        branchId: filters.branchId,
    });

    const rows: CashSessionListItem[] = response.data.map((session) => {
        const pointOfSale = session.pointOfSale ?? null;
        const branch = pointOfSale?.branch ?? null;
        const openedBy = session.openedBy as (typeof session.openedBy & { person?: { firstName?: string | null; lastName?: string | null } | null }) | null;
        const closedBy = session.closedBy as (typeof session.closedBy & { person?: { firstName?: string | null; lastName?: string | null } | null }) | null;

        const openingAmount = toNumber(session.openingAmount) ?? 0;
        const closingAmount = toNumber(session.closingAmount);
        const expectedAmount = toNumber(session.expectedAmount);

        let difference = toNumber(session.difference);
        if (difference === null && closingAmount !== null && expectedAmount !== null) {
            difference = Number(closingAmount - expectedAmount);
        }

        return {
            id: session.id,
            status: session.status,
            pointOfSaleId: session.pointOfSaleId ?? pointOfSale?.id ?? null,
            pointOfSaleName: pointOfSale?.name ?? null,
            branchId: pointOfSale?.branchId ?? branch?.id ?? null,
            branchName: branch?.name ?? null,
            openedAt: session.openedAt instanceof Date ? session.openedAt.toISOString() : new Date(session.openedAt).toISOString(),
            closedAt: session.closedAt ? (session.closedAt instanceof Date ? session.closedAt.toISOString() : new Date(session.closedAt).toISOString()) : null,
            openingAmount,
            closingAmount,
            expectedAmount,
            difference,
            openedById: openedBy?.id ?? null,
            openedByUserName: openedBy?.userName ?? null,
            openedByFullName: buildFullName(openedBy?.person ?? null),
            closedById: closedBy?.id ?? null,
            closedByUserName: closedBy?.userName ?? null,
            closedByFullName: buildFullName(closedBy?.person ?? null),
            notes: session.notes ?? null,
        };
    });

    return JSON.parse(JSON.stringify({ rows, total: response.total }));
}

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    [TransactionType.SALE]: 'Venta',
    [TransactionType.PURCHASE]: 'Compra',
    [TransactionType.PURCHASE_ORDER]: 'Orden de compra',
    [TransactionType.SALE_RETURN]: 'Devolución de venta',
    [TransactionType.PURCHASE_RETURN]: 'Devolución de compra',
    [TransactionType.TRANSFER_OUT]: 'Transferencia salida',
    [TransactionType.TRANSFER_IN]: 'Transferencia entrada',
    [TransactionType.ADJUSTMENT_IN]: 'Ajuste positivo',
    [TransactionType.ADJUSTMENT_OUT]: 'Ajuste negativo',
    [TransactionType.PAYMENT_IN]: 'Pago recibido',
    [TransactionType.PAYMENT_OUT]: 'Pago emitido',
    [TransactionType.CASH_DEPOSIT]: 'Depósito en efectivo',
    [TransactionType.OPERATING_EXPENSE]: 'Gasto operativo',
    [TransactionType.CASH_SESSION_OPENING]: 'Apertura de caja',
    [TransactionType.CASH_SESSION_WITHDRAWAL]: 'Retiro de caja',
    [TransactionType.CASH_SESSION_DEPOSIT]: 'Ingreso de caja',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CREDIT_CARD]: 'Tarjeta de crédito',
    [PaymentMethod.DEBIT_CARD]: 'Tarjeta de débito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.CREDIT]: 'Crédito',
    [PaymentMethod.MIXED]: 'Pago mixto',
};

const IN_FLOW_TYPES: Set<TransactionType> = new Set([
    TransactionType.SALE,
    TransactionType.PAYMENT_IN,
    TransactionType.CASH_SESSION_DEPOSIT,
    TransactionType.CASH_DEPOSIT,
    TransactionType.ADJUSTMENT_IN,
    TransactionType.TRANSFER_IN,
]);

const OUT_FLOW_TYPES: Set<TransactionType> = new Set([
    TransactionType.SALE_RETURN,
    TransactionType.PAYMENT_OUT,
    TransactionType.OPERATING_EXPENSE,
    TransactionType.CASH_SESSION_WITHDRAWAL,
    TransactionType.ADJUSTMENT_OUT,
    TransactionType.TRANSFER_OUT,
]);

export async function getCashSessionMovements(sessionId: string): Promise<CashSessionMovementsResult> {
    const ds = await getDb();
    const repo = ds.getRepository(Transaction);

    const transactions = await repo
        .createQueryBuilder('tx')
        .leftJoinAndSelect('tx.user', 'user')
        .leftJoinAndSelect('user.person', 'userPerson')
        .where('tx.cashSessionId = :sessionId', { sessionId })
        .orderBy('tx.createdAt', 'DESC')
        .getMany();

    const movements: CashSessionMovementItem[] = transactions.map((tx) => {
        const total = Number(tx.total) || 0;
        const direction = IN_FLOW_TYPES.has(tx.transactionType)
            ? 'IN'
            : OUT_FLOW_TYPES.has(tx.transactionType)
                ? 'OUT'
                : 'NEUTRAL';

        const createdAt = tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString();

        const metadata = (tx.metadata ?? null) as Record<string, unknown> | null;
        const reason = (() => {
            if (!metadata) {
                return null;
            }
            const depositReason = typeof metadata['depositReason'] === 'string' ? metadata['depositReason'] : null;
            if (depositReason) {
                return depositReason;
            }
            const withdrawalReason = typeof metadata['withdrawalReason'] === 'string' ? metadata['withdrawalReason'] : null;
            if (withdrawalReason) {
                return withdrawalReason;
            }
            const description = typeof metadata['description'] === 'string' ? metadata['description'] : null;
            return description;
        })();

        return {
            id: tx.id,
            transactionType: tx.transactionType,
            transactionTypeLabel: TRANSACTION_TYPE_LABELS[tx.transactionType] ?? tx.transactionType,
            direction,
            documentNumber: tx.documentNumber,
            createdAt,
            total,
            paymentMethod: tx.paymentMethod ?? null,
            paymentMethodLabel: tx.paymentMethod ? PAYMENT_METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod : null,
            userId: tx.userId ?? null,
            userUserName: tx.user?.userName ?? null,
            userFullName: buildFullName((tx.user as (typeof tx.user & { person?: { firstName?: string | null; lastName?: string | null } | null }) | undefined)?.person ?? null),
            notes: tx.notes ?? null,
            reason,
            metadata,
        };
    });

    return JSON.parse(JSON.stringify({ movements }));
}

/**
 * Obtiene una sesión por ID con resumen
 */
export async function getCashSessionById(id: string): Promise<SessionWithSummary | null> {
    const ds = await getDb();
    const sessionRepo = ds.getRepository(CashSession);
    const transactionRepo = ds.getRepository(Transaction);
    
    const session = await sessionRepo.findOne({
        where: { id },
        relations: ['pointOfSale', 'pointOfSale.branch', 'openedBy', 'closedBy']
    });
    
    if (!session) return null;
    
    // Calcular resumen
    const transactions = await transactionRepo.find({
        where: { cashSessionId: id }
    });
    
    const summary: SessionSummary = {
        openingBalance: Number(session.openingAmount) || 0,
        totalSales: 0,
        totalReturns: 0,
        cashIn: 0,
        cashOut: 0,
        expectedBalance: Number(session.openingAmount) || 0,
        transactionCount: transactions.length
    };
    
    for (const tx of transactions) {
        const total = Number(tx.total) || 0;
        
        switch (tx.transactionType) {
            case TransactionType.SALE:
                summary.totalSales += total;
                summary.cashIn += total;
                break;
            case TransactionType.SALE_RETURN:
                summary.totalReturns += total;
                summary.cashOut += total;
                break;
            case TransactionType.PAYMENT_IN:
                summary.cashIn += total;
                break;
            case TransactionType.CASH_SESSION_DEPOSIT:
                summary.cashIn += total;
                break;
            case TransactionType.PAYMENT_OUT:
                summary.cashOut += total;
                break;
            case TransactionType.OPERATING_EXPENSE:
                summary.cashOut += total;
                break;
            case TransactionType.CASH_SESSION_WITHDRAWAL:
                summary.cashOut += total;
                break;
        }
    }
    
    summary.expectedBalance = summary.openingBalance + summary.cashIn - summary.cashOut;
    
    return { ...session, summary };
}

/**
 * Obtiene la sesión activa de un punto de venta
 */
export async function getActiveSession(pointOfSaleId: string): Promise<CashSession | null> {
    const ds = await getDb();
    const repo = ds.getRepository(CashSession);
    
    return repo.findOne({
        where: { 
            pointOfSaleId, 
            status: CashSessionStatus.OPEN 
        },
        relations: ['openedBy']
    });
}

/**
 * Abre una nueva sesión de caja
 */
export async function openCashSession(data: OpenSessionDTO): Promise<SessionResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(CashSession);
        
        // Verificar que no haya sesión abierta
        const existingOpen = await repo.findOne({
            where: { 
                pointOfSaleId: data.pointOfSaleId, 
                status: CashSessionStatus.OPEN 
            }
        });
        
        if (existingOpen) {
            return { success: false, error: 'Ya existe una sesión abierta en este punto de venta' };
        }
        
        const session = repo.create({
            pointOfSaleId: data.pointOfSaleId,
            openedById: data.userId,
            status: CashSessionStatus.OPEN,
            openingAmount: data.openingAmount,
            openedAt: new Date(),
            notes: data.notes
        });
        
        await repo.save(session);
        revalidatePath('/pos');
        
        return { success: true, session };
    } catch (error) {
        console.error('Error opening cash session:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al abrir la sesión de caja' 
        };
    }
}

/**
 * Cierra una sesión de caja
 */
export async function closeCashSession(data: CloseSessionDTO): Promise<CloseResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(CashSession);
        
        const sessionWithSummary = await getCashSessionById(data.sessionId);
        
        if (!sessionWithSummary) {
            return { success: false, error: 'Sesión no encontrada' };
        }
        
        if (sessionWithSummary.status !== CashSessionStatus.OPEN) {
            return { success: false, error: 'La sesión ya está cerrada' };
        }
        
        const expectedAmount = sessionWithSummary.summary.expectedBalance;
        const difference = data.closingAmount - expectedAmount;
        
        // Actualizar sesión
        sessionWithSummary.status = CashSessionStatus.CLOSED;
        sessionWithSummary.closedById = data.userId;
        sessionWithSummary.closingAmount = data.closingAmount;
        sessionWithSummary.expectedAmount = expectedAmount;
        sessionWithSummary.difference = difference;
        sessionWithSummary.closedAt = new Date();
        if (data.notes) {
            sessionWithSummary.notes = (sessionWithSummary.notes || '') + '\n' + data.notes;
        }
        
        await repo.save(sessionWithSummary);
        revalidatePath('/pos');
        revalidatePath('/admin/sales/cash-sessions');
        
        return { 
            success: true, 
            session: sessionWithSummary,
            difference 
        };
    } catch (error) {
        console.error('Error closing cash session:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al cerrar la sesión de caja' 
        };
    }
}

export async function closeCashSessionFromAdmin(sessionId: string): Promise<CloseResult> {
    const session = await getCurrentSession();

    if (!session?.id) {
        return { success: false, error: 'Sesión de usuario no encontrada' };
    }

    const ds = await getDb();
    const userRepo = ds.getRepository(User);

    let user = await userRepo.findOne({ where: { id: session.id } });

    if (!user && session.userName) {
        user = await userRepo.findOne({ where: { userName: session.userName } });
    }

    if (!user) {
        return {
            success: false,
            error: 'No se encontró el usuario en la base de datos. Por favor cierra sesión e inicia nuevamente.',
        };
    }

    const sessionWithSummary = await getCashSessionById(sessionId);

    if (!sessionWithSummary) {
        return { success: false, error: 'Sesión no encontrada' };
    }

    if (sessionWithSummary.status !== CashSessionStatus.OPEN) {
        return { success: false, error: 'La sesión ya se encuentra cerrada' };
    }

    const expectedAmount = sessionWithSummary.summary.expectedBalance ?? 0;

    return closeCashSession({
        sessionId,
        userId: user.id,
        closingAmount: expectedAmount,
        notes: 'Cierre registrado desde panel de administración',
    });
}

/**
 * Concilia una sesión cerrada (admin)
 */
export async function reconcileCashSession(data: {
    sessionId: string;
    adjustedBalance?: number;
    notes: string;
}): Promise<SessionResult> {
    try {
        const ds = await getDb();
        const repo = ds.getRepository(CashSession);
        
        const session = await repo.findOne({ where: { id: data.sessionId } });
        
        if (!session) {
            return { success: false, error: 'Sesión no encontrada' };
        }
        
        if (session.status !== CashSessionStatus.CLOSED) {
            return { success: false, error: 'Solo se pueden conciliar sesiones cerradas' };
        }
        
        session.status = CashSessionStatus.RECONCILED;
        if (data.adjustedBalance !== undefined) {
            session.closingAmount = data.adjustedBalance;
            session.difference = data.adjustedBalance - (Number(session.expectedAmount) || 0);
        }
        session.notes = (session.notes || '') + '\n[CONCILIACIÓN] ' + data.notes;
        
        await repo.save(session);
        revalidatePath('/admin/cash-sessions');
        
        return { success: true, session };
    } catch (error) {
        console.error('Error reconciling cash session:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error al conciliar la sesión' 
        };
    }
}
