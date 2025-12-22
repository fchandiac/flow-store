# Server Action: transactions.ts

## Ubicación
`app/actions/transactions.ts`

---

## Descripción

Server actions para la entidad **Transaction** - la entidad central e inmutable del sistema.

> ⚠️ **IMPORTANTE**: Las transacciones son INMUTABLES. No se pueden modificar ni eliminar, solo crear nuevas transacciones de reversión.

---

## Funciones

### getTransactions

Obtiene lista de transacciones con filtros.

```typescript
'use server'

interface GetTransactionsParams {
    branchId?: string;
    storageId?: string;
    cashSessionId?: string;
    type?: TransactionType | TransactionType[];
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
    page: number;
    totalPages: number;
}

export async function getTransactions(
    params: GetTransactionsParams
): Promise<TransactionsResponse>
```

**Uso:**
```tsx
const { data, total } = await getTransactions({
    branchId: currentBranch.id,
    type: TransactionType.SALE,
    dateFrom: startOfDay,
    dateTo: endOfDay,
    page: 1,
    limit: 50
});
```

---

### getTransactionById

Obtiene una transacción con sus líneas de detalle.

```typescript
export async function getTransactionById(
    id: string
): Promise<Transaction | null>
```

**Uso:**
```tsx
const transaction = await getTransactionById(transactionId);
// transaction.lines contiene las líneas de detalle
```

---

### createSale

Crea una transacción de venta.

```typescript
interface CreateSaleDTO {
    branchId: string;
    cashSessionId: string;
    customerId?: string;
    lines: {
        productVariantId: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        taxId?: string;
    }[];
    paymentMethod: PaymentMethod;
    notes?: string;
}

interface SaleResult {
    success: boolean;
    transaction?: Transaction;
    error?: string;
}

export async function createSale(data: CreateSaleDTO): Promise<SaleResult>
```

**Uso:**
```tsx
const result = await createSale({
    branchId: branch.id,
    cashSessionId: session.id,
    lines: [
        { productVariantId: 'uuid', quantity: 5, unitPrice: 100 }
    ],
    paymentMethod: PaymentMethod.CASH
});

if (result.success) {
    // Mostrar ticket
    printTicket(result.transaction);
}
```

---

### createPurchase

Crea una transacción de compra.

```typescript
interface CreatePurchaseDTO {
    branchId: string;
    storageId: string;
    supplierId: string;
    lines: {
        productVariantId: string;
        quantity: number;
        unitCost: number;
        taxId?: string;
    }[];
    invoiceNumber?: string;
    notes?: string;
}

export async function createPurchase(data: CreatePurchaseDTO): Promise<PurchaseResult>
```

---

### createStockMovement

Crea movimientos de inventario (entrada, salida, ajuste).

```typescript
interface CreateStockMovementDTO {
    type: TransactionType.STOCK_IN | TransactionType.STOCK_OUT | TransactionType.STOCK_ADJUSTMENT;
    storageId: string;
    lines: {
        productVariantId: string;
        quantity: number;
    }[];
    reason: string;
    notes?: string;
}

export async function createStockMovement(data: CreateStockMovementDTO): Promise<StockResult>
```

---

### createCashMovement

Crea movimientos de efectivo.

```typescript
interface CreateCashMovementDTO {
    type: TransactionType.CASH_IN | TransactionType.CASH_OUT;
    cashSessionId: string;
    amount: number;
    reason: string;
    notes?: string;
}

export async function createCashMovement(data: CreateCashMovementDTO): Promise<CashResult>
```

---

### reverseSale

Crea una transacción de reversión (devolución).

```typescript
interface ReverseSaleDTO {
    originalTransactionId: string;
    cashSessionId: string;
    lines?: {
        productVariantId: string;
        quantity: number;  // Cantidad a devolver
    }[];  // Si no se especifica, devuelve todo
    reason: string;
}

export async function reverseSale(data: ReverseSaleDTO): Promise<ReverseResult>
```

**Uso:**
```tsx
// Devolución total
const result = await reverseSale({
    originalTransactionId: sale.id,
    cashSessionId: session.id,
    reason: 'Cliente insatisfecho'
});

// Devolución parcial
const result = await reverseSale({
    originalTransactionId: sale.id,
    cashSessionId: session.id,
    lines: [
        { productVariantId: 'uuid', quantity: 2 }  // Solo 2 unidades
    ],
    reason: 'Producto defectuoso'
});
```

---

### getTransactionSummary

Obtiene resumen de transacciones para reportes.

```typescript
interface SummaryParams {
    branchId?: string;
    dateFrom: Date;
    dateTo: Date;
    groupBy: 'day' | 'week' | 'month';
}

interface TransactionSummary {
    period: string;
    totalSales: number;
    totalPurchases: number;
    totalReturns: number;
    netSales: number;
    transactionCount: number;
}

export async function getTransactionSummary(
    params: SummaryParams
): Promise<TransactionSummary[]>
```

---

## Implementación Interna

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Transaction, TransactionLine } from '@/data/entities';
import { TransactionType } from '@/data/entities/enums';
import { revalidatePath } from 'next/cache';

export async function createSale(data: CreateSaleDTO): Promise<SaleResult> {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Calcular totales
        const { subtotal, taxTotal, total } = calculateTotals(data.lines);
        
        // Crear transacción principal
        const transaction = queryRunner.manager.create(Transaction, {
            type: TransactionType.SALE,
            branchId: data.branchId,
            cashSessionId: data.cashSessionId,
            customerId: data.customerId,
            amount: total,
            taxAmount: taxTotal,
            paymentMethod: data.paymentMethod,
            notes: data.notes
        });
        
        await queryRunner.manager.save(transaction);
        
        // Crear líneas de detalle
        for (const line of data.lines) {
            const txnLine = queryRunner.manager.create(TransactionLine, {
                transactionId: transaction.id,
                productVariantId: line.productVariantId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discount: line.discount ?? 0,
                taxId: line.taxId,
                total: calculateLineTotal(line)
            });
            await queryRunner.manager.save(txnLine);
        }
        
        await queryRunner.commitTransaction();
        
        revalidatePath('/admin/transactions');
        revalidatePath('/pointOfSale');
        
        return { success: true, transaction };
        
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error creating sale:', error);
        return { success: false, error: 'Failed to create sale' };
    } finally {
        await queryRunner.release();
    }
}
```
