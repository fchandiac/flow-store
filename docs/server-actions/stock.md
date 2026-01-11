# Server Action: stock.ts

## Ubicación
`app/actions/stock.ts`

---

## Descripción

Server actions para consultas de **Stock** (calculado desde Transaction).

> ⚠️ El stock NO es una entidad, se calcula desde las transacciones.

---

## Funciones

### getStockLevel

Obtiene el stock de una variante en un almacén.

```typescript
'use server'

export async function getStockLevel(
    productVariantId: string,
    storageId: string
): Promise<number>
```

**Uso:**
```tsx
const stock = await getStockLevel(variant.id, storage.id);
if (stock < quantity) {
    toast.error('Stock insuficiente');
}
```

---

### getStockByStorage

Obtiene todo el stock de un almacén.

```typescript
interface StockItem {
    productVariantId: string;
    sku: string;
    variantName: string;
    productName: string;
    categoryName?: string;
    quantity: number;
    minStock: number;
    isLowStock: boolean;
    lastMovement?: Date;
}

interface GetStockParams {
    storageId: string;
    categoryId?: string;
    search?: string;
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
}

interface StockResponse {
    data: StockItem[];
    total: number;
}

export async function getStockByStorage(params: GetStockParams): Promise<StockResponse>
```

---

### getStockByVariant

Obtiene el stock de una variante en todos los almacenes.

```typescript
interface VariantStockInfo {
    storageId: string;
    storageName: string;
    storageType: StorageType;
    branchName?: string;
    quantity: number;
}

export async function getStockByVariant(productVariantId: string): Promise<VariantStockInfo[]>
```

---

### getTotalStock

Obtiene el stock total de una variante (todos los almacenes).

```typescript
export async function getTotalStock(productVariantId: string): Promise<number>
```

---

### getStockMovements

Obtiene historial de movimientos de stock.

```typescript
interface StockMovement {
    transactionId: string;
    transactionType: TransactionType;
    date: Date;
    quantity: number;  // Positivo = entrada, negativo = salida
    balance: number;   // Saldo después del movimiento
    notes?: string;
}

interface GetMovementsParams {
    productVariantId: string;
    storageId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

export async function getStockMovements(params: GetMovementsParams): Promise<StockMovement[]>
```

---

### getLowStockAlerts

Obtiene alertas de bajo stock.

```typescript
interface LowStockAlert {
    productVariant: ProductVariant;
    product: Product;
    storage: Storage;
    currentStock: number;
    minStock: number;
    deficit: number;
}

export async function getLowStockAlerts(storageId?: string): Promise<LowStockAlert[]>
```

---

### getStockValuation

Obtiene valuación del inventario.

```typescript
interface StockValuation {
    storageId: string;
    storageName: string;
    totalItems: number;
    totalUnits: number;
    totalCostValue: number;
    totalSaleValue: number;
}

export async function getStockValuation(storageId?: string): Promise<StockValuation[]>
```

---

### checkStockAvailability

Verifica disponibilidad de stock para una venta.

```typescript
interface StockCheck {
    productVariantId: string;
    quantity: number;
}

interface AvailabilityResult {
    available: boolean;
    items: {
        productVariantId: string;
        requested: number;
        available: number;
        shortage: number;
    }[];
}

export async function checkStockAvailability(
    storageId: string,
    items: StockCheck[]
): Promise<AvailabilityResult>
```

**Uso:**
```tsx
// Antes de crear venta
const check = await checkStockAvailability(storage.id, [
    { productVariantId: 'uuid-1', quantity: 10 },
    { productVariantId: 'uuid-2', quantity: 5 }
]);

if (!check.available) {
    const shortages = check.items.filter(i => i.shortage > 0);
    toast.error(`Stock insuficiente para ${shortages.length} productos`);
}
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';

export async function getStockLevel(
    productVariantId: string,
    storageId: string
): Promise<number> {
    const ds = await getDataSource();
    
    const result = await ds.query(`
        SELECT COALESCE(SUM(
            CASE 
                WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
                WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
                WHEN t.type = 'STOCK_TRANSFER' AND t.destinationStorageId = ? THEN tl.quantity
                WHEN t.type = 'STOCK_TRANSFER' AND t.sourceStorageId = ? THEN -tl.quantity
                ELSE 0
            END
        ), 0) as stock
        FROM transactions t
        JOIN transaction_lines tl ON t.id = tl.transactionId
        WHERE tl.productVariantId = ?
          AND (t.storageId = ? OR t.destinationStorageId = ? OR t.sourceStorageId = ?)
          AND t.deletedAt IS NULL
    `, [storageId, storageId, productVariantId, storageId, storageId, storageId]);
    
    return parseFloat(result[0]?.stock ?? 0);
}

export async function getStockByStorage(params: GetStockParams): Promise<StockResponse> {
    const ds = await getDataSource();
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    
    let whereClause = 'WHERE pv.isActive = true AND p.trackInventory = true';
    const queryParams: any[] = [params.storageId, params.storageId, params.storageId, params.storageId];
    
    if (params.categoryId) {
        whereClause += ' AND p.categoryId = ?';
        queryParams.push(params.categoryId);
    }
    
    if (params.search) {
        whereClause += ' AND (pv.sku LIKE ? OR pv.name LIKE ? OR p.name LIKE ?)';
        queryParams.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
    }
    
    let havingClause = '';
    if (params.lowStockOnly) {
        havingClause = 'HAVING quantity < pv.minStock';
    }
    
    const countQuery = `
        SELECT COUNT(DISTINCT pv.id) as total
        FROM product_variants pv
        JOIN products p ON p.id = pv.productId
        ${whereClause}
    `;
    
    const dataQuery = `
        SELECT 
            pv.id as productVariantId,
            pv.sku,
            pv.name as variantName,
            pv.minStock,
            p.name as productName,
            c.name as categoryName,
            COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
                    WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
                    ELSE 0
                END
            ), 0) as quantity,
            MAX(t.createdAt) as lastMovement
        FROM product_variants pv
        JOIN products p ON p.id = pv.productId
        LEFT JOIN categories c ON c.id = p.categoryId
        LEFT JOIN transaction_lines tl ON tl.productVariantId = pv.id
        LEFT JOIN transactions t ON t.id = tl.transactionId 
            AND (t.storageId = ? OR t.destinationStorageId = ? OR t.sourceStorageId = ?)
            AND t.deletedAt IS NULL
        ${whereClause}
        GROUP BY pv.id
        ${havingClause}
        ORDER BY p.name, pv.name
        LIMIT ? OFFSET ?
    `;
    
    const [countResult, data] = await Promise.all([
        ds.query(countQuery, queryParams.slice(4)),
        ds.query(dataQuery, [...queryParams, limit, (page - 1) * limit])
    ]);
    
    return {
        data: data.map((item: any) => ({
            ...item,
            isLowStock: item.quantity < item.minStock
        })),
        total: countResult[0]?.total ?? 0
    };
}

export async function checkStockAvailability(
    storageId: string,
    items: StockCheck[]
): Promise<AvailabilityResult> {
    const results: AvailabilityResult['items'] = [];
    let allAvailable = true;
    
    for (const item of items) {
        const stock = await getStockLevel(item.productVariantId, storageId);
        const shortage = Math.max(0, item.quantity - stock);
        
        if (shortage > 0) {
            allAvailable = false;
        }
        
        results.push({
            productVariantId: item.productVariantId,
            requested: item.quantity,
            available: stock,
            shortage
        });
    }
    
    return { available: allAvailable, items: results };
}
```
