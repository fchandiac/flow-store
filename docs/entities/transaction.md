# Entidad: Transaction

> **⚠️ ENTIDAD CENTRAL DEL SISTEMA**
> 
> Transaction es la entidad más importante de FlowStore. Todo el sistema se basa en transacciones inmutables.

---

## 1. Descripción

La entidad `Transaction` representa cualquier operación que afecte saldos en el sistema: ventas, compras, movimientos de inventario, movimientos de caja, etc.

**Principio fundamental:** Las transacciones son **inmutables**. Una vez creadas, nunca se modifican ni eliminan.

---

## 2. Estructura

```typescript
@Entity("transactions")
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    // === CONTEXTO ===
    @Column({ type: "uuid" })
    companyId: string;

    @Column({ type: "uuid", nullable: true })
    branchId?: string;

    @Column({ type: "uuid", nullable: true })
    storageId?: string;

    @Column({ type: "uuid", nullable: true })
    cashSessionId?: string;

    // === TIPO ===
    @Column({ type: "enum", enum: TransactionType })
    type: TransactionType;

    // === REFERENCIA AL DOCUMENTO ORIGEN ===
    @Column({ type: "uuid", nullable: true })
    referenceId?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    referenceType?: string;  // "Sale", "Purchase", "CashSession", etc.

    // === REVERSIÓN ===
    @Column({ type: "uuid", nullable: true })
    reversesTransactionId?: string;

    // === VALORES ===
    @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
    amount: number;

    @Column({ type: "decimal", precision: 15, scale: 4, default: 0 })
    quantity: number;

    @Column({ type: "uuid", nullable: true })
    productVariantId?: string;

    @Column({ type: "uuid", nullable: true })
    personId?: string;  // Cliente o Proveedor

    // === AUDITORÍA ===
    @Column({ type: "uuid" })
    userId: string;

    @CreateDateColumn()
    createdAt: Date;

    // === METADATA ===
    @Column({ type: "json", nullable: true })
    metadata?: Record<string, any>;

    // === RELACIONES ===
    @ManyToOne(() => Company)
    company: Company;

    @ManyToOne(() => Branch, { nullable: true })
    branch?: Branch;

    @ManyToOne(() => Storage, { nullable: true })
    storage?: Storage;

    @ManyToOne(() => User)
    user: User;

    @ManyToOne(() => Transaction, { nullable: true })
    reversesTransaction?: Transaction;

    @ManyToOne(() => ProductVariant, { nullable: true })
    productVariant?: ProductVariant;

    @ManyToOne(() => Person, { nullable: true })
    person?: Person;
}
```

---

## 3. Tipos de Transacción

```typescript
enum TransactionType {
    // === VENTAS ===
    SALE = 'SALE',                      // Venta de productos
    SALE_RETURN = 'SALE_RETURN',        // Devolución de venta

    // === COMPRAS ===
    PURCHASE = 'PURCHASE',              // Compra a proveedor
    PURCHASE_RETURN = 'PURCHASE_RETURN', // Devolución a proveedor

    // === INVENTARIO ===
    STOCK_IN = 'STOCK_IN',              // Entrada de stock
    STOCK_OUT = 'STOCK_OUT',            // Salida de stock
    STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT', // Ajuste de inventario
    STOCK_TRANSFER = 'STOCK_TRANSFER',  // Transferencia entre storages

    // === CAJA ===
    CASH_IN = 'CASH_IN',                // Entrada de efectivo
    CASH_OUT = 'CASH_OUT',              // Salida de efectivo
    CASH_OVERAGE = 'CASH_OVERAGE',      // Sobrante de caja
    CASH_SHORTAGE = 'CASH_SHORTAGE',    // Faltante de caja

    // === GASTOS ===
    EXPENSE_ACCRUAL = 'EXPENSE_ACCRUAL', // Reconocimiento de gasto
    EXPENSE_PAYMENT = 'EXPENSE_PAYMENT', // Pago de gasto

    // === FISCAL ===
    TAX_LEDGER = 'TAX_LEDGER',          // Débito fiscal
    TAX_CREDIT = 'TAX_CREDIT',          // Crédito fiscal
    TAX_PAYMENT = 'TAX_PAYMENT',        // Pago de impuesto

    // === TESORERÍA ===
    BANK_DEPOSIT = 'BANK_DEPOSIT',      // Depósito bancario
    BANK_WITHDRAWAL = 'BANK_WITHDRAWAL', // Retiro bancario
    REMITTANCE_SEND = 'REMITTANCE_SEND', // Envío de remesa
    REMITTANCE_RECEIVE = 'REMITTANCE_RECEIVE', // Recepción de remesa
}
```

---

## 4. Diagrama de Entidad

```
Transaction
├── id: UUID (PK)
│
├── ─── CONTEXTO ───
├── companyId: UUID (FK → Company)
├── branchId: UUID (FK → Branch, nullable)
├── storageId: UUID (FK → Storage, nullable)
├── cashSessionId: UUID (FK → CashSession, nullable)
│
├── ─── TIPO ───
├── type: enum(TransactionType)
│
├── ─── REFERENCIA ───
├── referenceId: UUID (nullable)
├── referenceType: varchar (nullable)
├── reversesTransactionId: UUID (FK → Transaction, nullable)
│
├── ─── VALORES ───
├── amount: decimal(15,2)
├── quantity: decimal(15,4)
├── productVariantId: UUID (FK → ProductVariant, nullable)
├── personId: UUID (FK → Person, nullable)
│
├── ─── AUDITORÍA ───
├── userId: UUID (FK → User)
├── createdAt: timestamp
│
└── metadata: JSON (nullable)
```

---

## 5. Reglas de Inmutabilidad

### 5.1 Lo que NUNCA se hace

```typescript
// ❌ PROHIBIDO: Modificar transacción existente
await transactionRepo.update(id, { amount: newAmount });

// ❌ PROHIBIDO: Eliminar transacción
await transactionRepo.delete(id);

// ❌ PROHIBIDO: Soft delete de transacción
await transactionRepo.softDelete(id);
```

### 5.2 Lo que SÍ se hace

```typescript
// ✅ CORRECTO: Crear transacción de reversión
const reversal = await transactionRepo.save({
    type: originalTransaction.type,
    amount: -originalTransaction.amount,  // Signo opuesto
    quantity: -originalTransaction.quantity,
    reversesTransactionId: originalTransaction.id,
    // ... demás campos
});
```

---

## 6. Patrones de Uso

### 6.1 Venta Completa

Una venta genera múltiples transacciones:

```typescript
// 1. Transacción de venta (monto total)
const saleTransaction = {
    type: TransactionType.SALE,
    referenceId: sale.id,
    referenceType: 'Sale',
    amount: sale.total,
    personId: sale.customerId,
    branchId: sale.branchId,
    cashSessionId: cashSession.id,
};

// 2. Transacciones de stock (una por producto)
for (const line of sale.lines) {
    const stockTransaction = {
        type: TransactionType.STOCK_OUT,
        referenceId: sale.id,
        referenceType: 'Sale',
        quantity: -line.quantity,  // Negativo = salida
        productVariantId: line.productVariantId,
        storageId: sale.storageId,
    };
}

// 3. Transacción de caja (si pago en efectivo)
if (payment.method === 'CASH') {
    const cashTransaction = {
        type: TransactionType.CASH_IN,
        referenceId: sale.id,
        referenceType: 'Sale',
        amount: payment.amount,
        cashSessionId: cashSession.id,
    };
}
```

### 6.2 Anulación de Venta

```typescript
// Crear transacciones de reversión para cada transacción original
const originalTransactions = await transactionRepo.find({
    where: { referenceId: sale.id, referenceType: 'Sale' }
});

for (const original of originalTransactions) {
    await transactionRepo.save({
        type: original.type === TransactionType.SALE 
            ? TransactionType.SALE_RETURN 
            : original.type,
        amount: -original.amount,
        quantity: -original.quantity,
        reversesTransactionId: original.id,
        referenceId: sale.id,
        referenceType: 'SaleReturn',
        // ... copiar contexto
    });
}
```

### 6.3 Transferencia de Stock

```typescript
// Una transferencia genera DOS transacciones
const transfer = {
    fromStorageId: 'storage-a',
    toStorageId: 'storage-b',
    productVariantId: 'product-1',
    quantity: 100,
};

// Salida del storage origen
await transactionRepo.save({
    type: TransactionType.STOCK_TRANSFER,
    storageId: transfer.fromStorageId,
    quantity: -transfer.quantity,
    productVariantId: transfer.productVariantId,
    metadata: { 
        direction: 'OUT',
        destinationStorageId: transfer.toStorageId 
    },
});

// Entrada al storage destino
await transactionRepo.save({
    type: TransactionType.STOCK_TRANSFER,
    storageId: transfer.toStorageId,
    quantity: transfer.quantity,
    productVariantId: transfer.productVariantId,
    metadata: { 
        direction: 'IN',
        originStorageId: transfer.fromStorageId 
    },
});
```

---

## 7. Cálculo de Saldos

### 7.1 Stock por Storage

```sql
SELECT 
    product_variant_id,
    storage_id,
    SUM(quantity) as stock_actual
FROM transactions
WHERE storage_id = :storage_id
  AND product_variant_id IS NOT NULL
GROUP BY product_variant_id, storage_id;
```

### 7.2 Saldo de Caja

```sql
SELECT 
    cash_session_id,
    SUM(CASE 
        WHEN type IN ('CASH_IN', 'CASH_OVERAGE') THEN amount
        WHEN type IN ('CASH_OUT', 'CASH_SHORTAGE') THEN -amount
        ELSE 0
    END) as saldo_efectivo
FROM transactions
WHERE cash_session_id = :session_id
GROUP BY cash_session_id;
```

### 7.3 Cuenta por Cobrar de Cliente

```sql
SELECT 
    person_id,
    SUM(CASE 
        WHEN type = 'SALE' THEN amount
        WHEN type = 'SALE_RETURN' THEN -amount
        WHEN type = 'CASH_IN' AND metadata->>'concept' = 'PAYMENT' THEN -amount
        ELSE 0
    END) as saldo_pendiente
FROM transactions
WHERE person_id = :customer_id
GROUP BY person_id;
```

---

## 8. Metadata Común

El campo `metadata` almacena información adicional según el tipo:

```typescript
// SALE
metadata: {
    documentNumber: "F-001-0001234",
    paymentMethods: ["CASH", "CARD"],
    customerId: "uuid",
}

// STOCK_TRANSFER
metadata: {
    direction: "OUT" | "IN",
    originStorageId: "uuid",
    destinationStorageId: "uuid",
    transferNumber: "TRF-001",
}

// EXPENSE_ACCRUAL
metadata: {
    costCenterId: "uuid",
    category: "UTILITIES",
    description: "Pago luz oficina",
    voucherNumber: "12345",
}

// BANK_DEPOSIT
metadata: {
    bankAccountId: "uuid",
    depositSlip: "DEP-001",
}
```

---

## 9. Índices Recomendados

| Columna(s) | Tipo | Propósito |
|------------|------|-----------|
| `companyId` | INDEX | Filtro por empresa |
| `branchId` | INDEX | Filtro por sucursal |
| `storageId` | INDEX | Cálculo de stock |
| `cashSessionId` | INDEX | Saldo de caja |
| `type` | INDEX | Filtro por tipo |
| `referenceId, referenceType` | INDEX COMPUESTO | Buscar transacciones de un documento |
| `productVariantId, storageId` | INDEX COMPUESTO | Stock por producto/storage |
| `createdAt` | INDEX | Ordenamiento cronológico |
| `personId` | INDEX | Cuenta corriente |

---

## 10. Validaciones

```typescript
// Antes de crear transacción
function validateTransaction(tx: Partial<Transaction>): void {
    // Tipo requerido
    if (!tx.type) throw new Error('Type is required');
    
    // Company requerida
    if (!tx.companyId) throw new Error('CompanyId is required');
    
    // User requerido
    if (!tx.userId) throw new Error('UserId is required');
    
    // Cantidad requerida para tipos de inventario
    if (isInventoryType(tx.type) && tx.quantity === undefined) {
        throw new Error('Quantity required for inventory transactions');
    }
    
    // Storage requerido para inventario
    if (isInventoryType(tx.type) && !tx.storageId) {
        throw new Error('StorageId required for inventory transactions');
    }
    
    // CashSession requerido para caja
    if (isCashType(tx.type) && !tx.cashSessionId) {
        throw new Error('CashSessionId required for cash transactions');
    }
}
```

---

📌 **Transaction es INMUTABLE. Todo el sistema depende de esta regla.**
