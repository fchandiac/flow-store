# Stock Level (Vista Calculada)

## 1. Descripción

`StockLevel` no es una entidad persistida, sino una **vista calculada** que muestra el stock actual derivado de las transacciones. Esto es fundamental en el modelo inmutable.

> ⚠️ El stock NUNCA se almacena como un campo mutable. Se CALCULA a partir de la suma de transacciones.

---

## 2. Concepto

```
Stock Actual = Σ (Entradas) - Σ (Salidas)

Entradas:
  + PURCHASE (compras)
  + STOCK_IN (entradas manuales)
  + SALE_RETURN (devoluciones de venta)
  + STOCK_TRANSFER (transferencias entrantes)

Salidas:
  - SALE (ventas)
  - STOCK_OUT (salidas manuales)
  - PURCHASE_RETURN (devoluciones a proveedor)
  - STOCK_TRANSFER (transferencias salientes)
```

---

## 3. Vista SQL

```sql
CREATE VIEW stock_levels AS
SELECT 
    tl.productVariantId,
    t.storageId,
    SUM(
        CASE 
            WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
            WHEN t.type = 'STOCK_TRANSFER' AND t.destinationStorageId = t.storageId THEN tl.quantity
            WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
            WHEN t.type = 'STOCK_TRANSFER' AND t.sourceStorageId = t.storageId THEN -tl.quantity
            ELSE 0
        END
    ) as currentStock,
    MAX(t.createdAt) as lastMovement
FROM transactions t
JOIN transaction_lines tl ON t.id = tl.transactionId
WHERE t.deletedAt IS NULL
GROUP BY tl.productVariantId, t.storageId;
```

---

## 4. Interface TypeScript

```typescript
// No es una entidad, es un DTO/Interface
interface StockLevel {
    productVariantId: string;
    storageId: string;
    currentStock: number;
    lastMovement: Date;
    
    // Datos adicionales para UI
    productVariant?: ProductVariant;
    storage?: Storage;
    isLowStock?: boolean;  // currentStock < variant.minStock
}
```

---

## 5. Servicio de Consulta

```typescript
class StockService {
    // Stock de una variante en un storage
    async getStock(variantId: string, storageId: string): Promise<number> {
        const result = await this.dataSource.query(`
            SELECT COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('PURCHASE', 'STOCK_IN', 'SALE_RETURN') THEN tl.quantity
                    WHEN t.type IN ('SALE', 'STOCK_OUT', 'PURCHASE_RETURN') THEN -tl.quantity
                    ELSE 0
                END
            ), 0) as stock
            FROM transactions t
            JOIN transaction_lines tl ON t.id = tl.transactionId
            WHERE tl.productVariantId = ?
              AND t.storageId = ?
              AND t.deletedAt IS NULL
        `, [variantId, storageId]);
        
        return result[0]?.stock ?? 0;
    }

    // Stock total de una variante (todos los storages)
    async getTotalStock(variantId: string): Promise<number> {
        // Similar pero sin filtrar por storageId
    }

    // Productos con bajo stock
    async getLowStockItems(storageId?: string): Promise<StockLevel[]> {
        // Consulta que compara con minStock
    }
}
```

---

## 6. Caché de Stock (Opcional)

Para mejor rendimiento, se puede implementar una tabla de caché:

```typescript
@Entity("stock_cache")
export class StockCache {
    @PrimaryColumn({ type: "uuid" })
    productVariantId: string;

    @PrimaryColumn({ type: "uuid" })
    storageId: string;

    @Column({ type: "decimal", precision: 12, scale: 3 })
    currentStock: number;

    @Column({ type: "timestamp" })
    lastUpdated: Date;
}
```

> ⚠️ El caché debe actualizarse con cada Transaction insertada

---

## 7. Ventajas del Modelo Inmutable

1. **Auditoría Completa**: Cada movimiento queda registrado
2. **Sin Inconsistencias**: No hay "stock negativo" por transacciones perdidas
3. **Reconstrucción**: Se puede recalcular el stock en cualquier momento
4. **Historial**: Se puede ver el stock en cualquier fecha pasada
