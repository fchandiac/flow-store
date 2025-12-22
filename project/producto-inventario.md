# Documentación Técnica: Productos e Inventario

Este documento describe el modelo de datos y reglas de negocio para la gestión de productos, variantes, precios e inventario.

---

## 1. Modelo de Productos

### 1.1 Estructura Jerárquica

```
Category (Categoría)
└── Product (Producto Base)
    └── ProductVariant (Variante/SKU)
        ├── StockLevel (por Storage)
        ├── PriceListItem (por Lista de Precios)
        └── ProductVariantTax (Impuestos)
```

### 1.2 Category (Categoría)

```
Category
├── id: UUID
├── company_id: UUID (FK)
├── parent_id: UUID (FK, nullable) -- para subcategorías
├── name: string
├── code: string
├── description: string
├── is_active: boolean
└── sort_order: integer
```

### 1.3 Product (Producto Base)

```
Product
├── id: UUID
├── company_id: UUID (FK)
├── category_id: UUID (FK)
├── name: string
├── description: string
├── brand: string
├── is_active: boolean
├── track_inventory: boolean
├── allow_negative_stock: boolean
└── metadata: JSON
```

### 1.4 ProductVariant (Variante/SKU)

```
ProductVariant
├── id: UUID
├── product_id: UUID (FK)
├── sku: string (único por company)
├── barcode: string
├── name: string (ej: "500ml", "Rojo", "Talla M")
├── cost_price: decimal (PPP actual)
├── base_price: decimal (precio base sin impuestos)
├── unit_of_measure: string (UN, KG, LT, etc.)
├── weight: decimal
├── is_active: boolean
└── metadata: JSON (atributos adicionales)
```

---

## 2. Gestión de Stock por Storage

### 2.1 Storage (Almacén)

```
Storage
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK, nullable)
├── name: string
├── code: string
├── type: enum (IN_BRANCH, CENTRAL, EXTERNAL)
├── allows_sales: boolean
├── allows_receipts: boolean
├── is_active: boolean
└── address: string
```

**Tipos de Storage:**

| Tipo | branch_id | Descripción | Uso típico |
|------|-----------|-------------|------------|
| `IN_BRANCH` | Requerido | Bodega dentro de sucursal | Venta directa, trastienda |
| `CENTRAL` | NULL | Centro de distribución | Almacén central, CD |
| `EXTERNAL` | NULL | Almacén de terceros | Consignación, 3PL |

### 2.2 StockLevel (Nivel de Stock)

```
StockLevel
├── id: UUID
├── product_variant_id: UUID (FK)
├── storage_id: UUID (FK)
├── quantity: decimal
├── reserved_quantity: decimal
├── min_stock: decimal
├── max_stock: decimal
├── reorder_point: decimal
├── reorder_quantity: decimal
└── last_movement_at: timestamp
```

**Cálculos:**

| Métrica | Fórmula |
|---------|---------|
| Stock Disponible | `quantity - reserved_quantity` |
| Necesita Reposición | `quantity <= reorder_point` |
| Stock Crítico | `quantity <= min_stock` |

### 2.3 Consulta de Stock por Sucursal

Para obtener el stock consolidado de una sucursal (sumando todos sus storages):

```sql
SELECT 
    pv.id,
    pv.sku,
    pv.name,
    SUM(sl.quantity) as total_quantity,
    SUM(sl.reserved_quantity) as total_reserved
FROM product_variants pv
JOIN stock_levels sl ON sl.product_variant_id = pv.id
JOIN storages s ON s.id = sl.storage_id
WHERE s.branch_id = :branch_id
  AND s.type = 'IN_BRANCH'
GROUP BY pv.id, pv.sku, pv.name
```

---

## 3. Listas de Precios

### 3.1 PriceList (Lista de Precios)

```
PriceList
├── id: UUID
├── company_id: UUID (FK)
├── name: string
├── code: string
├── currency: string
├── is_default: boolean
├── is_active: boolean
├── valid_from: date
├── valid_to: date
├── priority: integer (mayor = más prioritario)
└── conditions: JSON (reglas de aplicación)
```

### 3.2 PriceListItem (Precio por Producto)

```
PriceListItem
├── id: UUID
├── price_list_id: UUID (FK)
├── product_variant_id: UUID (FK)
├── price: decimal (sin impuestos)
├── min_quantity: decimal (para precios escalonados)
└── is_active: boolean
```

### 3.3 Resolución de Precio

El sistema busca el precio aplicable en orden de prioridad:

1. **Promoción activa** (si aplica)
2. **Lista de precios del cliente** (si tiene asignada)
3. **Lista de precios de la sucursal** (si tiene)
4. **Lista de precios por defecto** (is_default = true)
5. **Precio base del producto** (ProductVariant.base_price)

```
Precio Final = Precio Resuelto + Impuestos Calculados
```

---

## 4. Movimientos de Inventario

### 4.1 Tipos de Movimiento

| Tipo | Efecto Stock | Origen |
|------|--------------|--------|
| `STOCK_IN` | + cantidad | Recepción manual, ajuste positivo |
| `STOCK_OUT` | - cantidad | Salida manual, ajuste negativo |
| `STOCK_ADJUSTMENT` | +/- cantidad | Conteo físico, corrección |
| `STOCK_TRANSFER` | - origen, + destino | Transferencia entre storages |
| `PURCHASE` | + cantidad | Recepción de compra |
| `SALE` | - cantidad | Venta |
| `SALE_RETURN` | + cantidad | Devolución de cliente |
| `PURCHASE_RETURN` | - cantidad | Devolución a proveedor |

### 4.2 Transacción de Movimiento

```
Transaction (type = STOCK_*)
├── id: UUID
├── company_id: UUID
├── storage_id: UUID (storage origen)
├── type: TransactionType
├── product_variant_id: UUID
├── quantity: decimal (+ o -)
├── unit_cost: decimal
├── total_cost: decimal
├── reference_id: UUID (documento origen)
├── reference_type: string
├── reverses_transaction_id: UUID (si es reversión)
├── user_id: UUID
├── created_at: timestamp
└── metadata: JSON
    ├── destination_storage_id: UUID (para transfers)
    ├── reason: string
    └── batch_number: string
```

### 4.3 Transferencia entre Storages

Una transferencia genera DOS transacciones:

```
STOCK_TRANSFER (Salida del origen)
├── storage_id: UUID (origen)
├── quantity: -50
└── metadata: { destination_storage_id: "dest-uuid" }

STOCK_TRANSFER (Entrada al destino)
├── storage_id: UUID (destino)
├── quantity: +50
└── metadata: { source_storage_id: "origin-uuid" }
```

---

## 5. Costeo (PPP - Precio Promedio Ponderado)

### 5.1 Fórmula PPP

```
Nuevo PPP = (Stock Actual × PPP Actual + Cantidad Entrada × Costo Entrada) 
            / (Stock Actual + Cantidad Entrada)
```

### 5.2 Actualización de PPP

El PPP se actualiza **solo en entradas**:

| Evento | Actualiza PPP |
|--------|---------------|
| Recepción de compra | ✅ Sí |
| Devolución de venta | ✅ Sí (al costo original) |
| Venta | ❌ No |
| Ajuste positivo | ⚙️ Configurable |
| Transferencia | ❌ No (mantiene costo) |

### 5.3 Registro de Costo en Transacción

```
Transaction (PURCHASE)
├── quantity: 100
├── unit_cost: $1,200
├── total_cost: $120,000
└── metadata: {
        previous_ppp: $1,150,
        new_ppp: $1,180,
        previous_stock: 50
    }
```

---

## 6. Conteo de Inventario

### 6.1 InventoryCount (Conteo)

```
InventoryCount
├── id: UUID
├── company_id: UUID
├── storage_id: UUID
├── status: enum (DRAFT, IN_PROGRESS, COMPLETED, CANCELLED)
├── count_date: date
├── created_by: UUID
├── completed_by: UUID
├── completed_at: timestamp
└── notes: string
```

### 6.2 InventoryCountLine (Líneas de Conteo)

```
InventoryCountLine
├── id: UUID
├── inventory_count_id: UUID (FK)
├── product_variant_id: UUID (FK)
├── system_quantity: decimal (cantidad según sistema)
├── counted_quantity: decimal (cantidad física)
├── difference: decimal (calculado)
├── unit_cost: decimal (PPP al momento)
├── adjustment_transaction_id: UUID (FK, después de aplicar)
└── notes: string
```

### 6.3 Aplicación del Conteo

Al completar el conteo, se generan transacciones de ajuste:

```
Por cada línea donde difference ≠ 0:

STOCK_ADJUSTMENT
├── storage_id: storage del conteo
├── product_variant_id: producto
├── quantity: difference (+ o -)
├── reference_id: inventory_count_id
├── reference_type: "InventoryCount"
└── metadata: {
        system_quantity: 100,
        counted_quantity: 98,
        count_id: "uuid"
    }
```

---

## 7. Reglas de Negocio

### 7.1 Validaciones de Stock

| Regla | Configuración | Comportamiento |
|-------|---------------|----------------|
| Stock Negativo | `allow_negative_stock` | Si false, bloquea venta sin stock |
| Stock Reservado | Automático | No permite vender stock reservado |
| Stock Mínimo | `min_stock` | Alerta cuando `quantity <= min_stock` |

### 7.2 Validaciones de Producto

| Validación | Descripción |
|------------|-------------|
| SKU único | Por company_id |
| Barcode único | Por company_id (si tiene) |
| Precio base | Debe ser >= 0 |
| Al menos 1 variante | Producto debe tener mínimo 1 variante |

### 7.3 Soft Delete

Los productos/variantes no se eliminan, solo se desactivan:

```sql
UPDATE product_variants 
SET is_active = false, 
    updated_at = NOW(),
    updated_by = :user_id
WHERE id = :variant_id
```

---

## 8. Consultas Comunes

### 8.1 Stock Disponible por Storage

```sql
SELECT 
    pv.id,
    pv.sku,
    pv.name,
    s.id as storage_id,
    s.name as storage_name,
    sl.quantity,
    sl.reserved_quantity,
    (sl.quantity - sl.reserved_quantity) as available,
    sl.min_stock,
    CASE 
        WHEN sl.quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN sl.quantity <= sl.min_stock THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END as status
FROM product_variants pv
JOIN stock_levels sl ON sl.product_variant_id = pv.id
JOIN storages s ON s.id = sl.storage_id
WHERE pv.company_id = :company_id
  AND pv.is_active = true
ORDER BY pv.sku
```

### 8.2 Productos con Stock Crítico

```sql
SELECT 
    pv.sku,
    pv.name,
    s.name as storage_name,
    sl.quantity,
    sl.min_stock,
    sl.reorder_point,
    sl.reorder_quantity
FROM stock_levels sl
JOIN product_variants pv ON pv.id = sl.product_variant_id
JOIN storages s ON s.id = sl.storage_id
WHERE sl.quantity <= sl.min_stock
  AND pv.is_active = true
  AND s.is_active = true
ORDER BY sl.quantity ASC
```

### 8.3 Kardex de Producto por Storage

```sql
SELECT 
    t.created_at,
    t.type,
    t.quantity,
    t.unit_cost,
    t.reference_type,
    t.reference_id,
    SUM(t.quantity) OVER (ORDER BY t.created_at) as running_balance
FROM transactions t
WHERE t.product_variant_id = :variant_id
  AND t.storage_id = :storage_id
  AND t.type IN ('STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTMENT', 
                 'STOCK_TRANSFER', 'PURCHASE', 'SALE', 
                 'SALE_RETURN', 'PURCHASE_RETURN')
ORDER BY t.created_at DESC
```

---

📌 **El stock se gestiona por Storage, no directamente por Branch. Una sucursal puede tener múltiples storages (bodega principal, trastienda, etc.).**
