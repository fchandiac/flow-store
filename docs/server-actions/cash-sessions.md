# Server Action: cashSessions.ts

## Ubicación
`app/actions/cashSessions.ts`

---

## Descripción

Server actions para la entidad **CashSession** (Sesión de Caja).

---

## Funciones

### getCashSessions

Obtiene sesiones de caja.

```typescript
'use server'

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

export async function getCashSessions(params: GetSessionsParams): Promise<SessionsResponse>
```

---

### getCashSessionById

Obtiene una sesión con su resumen.

```typescript
interface SessionWithSummary extends CashSession {
    summary: {
        openingBalance: number;
        totalSales: number;
        totalReturns: number;
        cashIn: number;
        cashOut: number;
        expectedBalance: number;
        transactionCount: number;
    };
}

export async function getCashSessionById(id: string): Promise<SessionWithSummary | null>
```

---

### openCashSession

Abre una nueva sesión de caja.

```typescript
interface OpenSessionDTO {
    pointOfSaleId: string;
    openingBalance: number;
    notes?: string;
}

interface SessionResult {
    success: boolean;
    session?: CashSession;
    error?: string;
}

export async function openCashSession(data: OpenSessionDTO): Promise<SessionResult>
```

**Uso:**
```tsx
const result = await openCashSession({
    pointOfSaleId: pos.id,
    openingBalance: 50000
});

if (result.success) {
    router.push(`/pointOfSale/${pos.id}`);
}
```

---

### closeCashSession

Cierra una sesión de caja.

```typescript
interface CloseSessionDTO {
    sessionId: string;
    countedBalance: number;  // Dinero contado físicamente
    notes?: string;
}

interface CloseResult {
    success: boolean;
    session?: CashSession;
    difference?: number;  // Diferencia entre esperado y contado
    error?: string;
}

export async function closeCashSession(data: CloseSessionDTO): Promise<CloseResult>
```

**Uso:**
```tsx
const result = await closeCashSession({
    sessionId: session.id,
    countedBalance: 125000,
    notes: 'Cierre normal'
});

if (result.difference !== 0) {
    // Hubo diferencia
    if (result.difference > 0) {
        toast.warning(`Sobrante de $${result.difference}`);
    } else {
        toast.error(`Faltante de $${Math.abs(result.difference)}`);
    }
}
```

---

### reconcileCashSession

Concilia una sesión cerrada (admin).

```typescript
interface ReconcileDTO {
    sessionId: string;
    adjustedBalance?: number;
    notes: string;
}

export async function reconcileCashSession(data: ReconcileDTO): Promise<SessionResult>
```

---

### getSessionTransactions

Obtiene las transacciones de una sesión.

```typescript
export async function getSessionTransactions(
    sessionId: string,
    type?: TransactionType
): Promise<Transaction[]>
```

---

### getActiveSession

Obtiene la sesión activa del usuario actual.

```typescript
export async function getActiveSession(): Promise<CashSession | null>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { Transaction, TransactionType } from '@/data/entities/Transaction';
import { getCurrentUser } from './auth.server';
import { revalidatePath } from 'next/cache';

export async function openCashSession(data: OpenSessionDTO): Promise<SessionResult> {
    const ds = await getDataSource();
    const user = await getCurrentUser();
    
    if (!user) {
        return { success: false, error: 'No autenticado' };
    }
    
    // Verificar que no haya sesión abierta en el POS
    const existingSession = await ds.getRepository(CashSession).findOne({
        where: {
            pointOfSaleId: data.pointOfSaleId,
            status: CashSessionStatus.OPEN
        }
    });
    
    if (existingSession) {
        return { success: false, error: 'Ya existe una sesión abierta' };
    }
    
    try {
        const session = ds.getRepository(CashSession).create({
            pointOfSaleId: data.pointOfSaleId,
            userId: user.id,
            openingBalance: data.openingBalance,
            status: CashSessionStatus.OPEN,
            openedAt: new Date(),
            notes: data.notes
        });
        
        await ds.getRepository(CashSession).save(session);
        
        revalidatePath('/pointOfSale');
        
        return { success: true, session };
        
    } catch (error) {
        console.error('Error opening session:', error);
        return { success: false, error: 'Error al abrir sesión' };
    }
}

export async function closeCashSession(data: CloseSessionDTO): Promise<CloseResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        const session = await queryRunner.manager.findOneOrFail(CashSession, {
            where: { id: data.sessionId, status: CashSessionStatus.OPEN }
        });
        
        // Calcular balance esperado
        const expectedBalance = await calculateSessionBalance(
            queryRunner.manager, 
            session.id
        );
        
        const difference = data.countedBalance - expectedBalance;
        
        // Actualizar sesión
        session.status = CashSessionStatus.CLOSED;
        session.closedAt = new Date();
        session.closingBalance = data.countedBalance;
        session.expectedBalance = expectedBalance;
        session.difference = difference;
        session.notes = data.notes;
        
        await queryRunner.manager.save(session);
        
        // Si hay diferencia, crear transacción de ajuste
        if (difference !== 0) {
            const adjustmentType = difference > 0 
                ? TransactionType.CASH_OVERAGE 
                : TransactionType.CASH_SHORTAGE;
            
            const adjustment = queryRunner.manager.create(Transaction, {
                type: adjustmentType,
                cashSessionId: session.id,
                amount: Math.abs(difference),
                notes: `Ajuste de cierre: ${difference > 0 ? 'sobrante' : 'faltante'}`
            });
            
            await queryRunner.manager.save(adjustment);
        }
        
        await queryRunner.commitTransaction();
        
        revalidatePath('/pointOfSale');
        revalidatePath('/admin/cash-sessions');
        
        return { success: true, session, difference };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error closing session:', error);
        return { success: false, error: 'Error al cerrar sesión' };
    } finally {
        await queryRunner.release();
    }
}

async function calculateSessionBalance(manager: any, sessionId: string): Promise<number> {
    const result = await manager.query(`
        SELECT 
            COALESCE(SUM(
                CASE 
                    WHEN type IN ('SALE', 'CASH_IN', 'CASH_OVERAGE') THEN amount
                    WHEN type IN ('SALE_RETURN', 'CASH_OUT', 'CASH_SHORTAGE') THEN -amount
                    ELSE 0
                END
            ), 0) as balance
        FROM transactions
        WHERE cashSessionId = ?
          AND paymentMethod = 'CASH'
    `, [sessionId]);
    
    const session = await manager.findOne(CashSession, { where: { id: sessionId }});
    
    return session.openingBalance + parseFloat(result[0].balance);
}
```
