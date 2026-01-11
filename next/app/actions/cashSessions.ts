'use server'

import { getDb } from '@/data/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { Transaction, TransactionType } from '@/data/entities/Transaction';
import { revalidatePath } from 'next/cache';

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
        .leftJoinAndSelect('session.closedBy', 'closedBy');
    
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
            case TransactionType.PAYMENT_OUT:
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
