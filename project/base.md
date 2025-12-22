# Documentación Técnica: Arquitectura Base del ERP

Este documento describe la arquitectura fundamental del sistema ERP, basada en un modelo de **transacciones inmutables** que garantiza trazabilidad completa y consistencia de datos.

---

## 1. Filosofía del Sistema

### 1.1 Principios Fundamentales

| Principio | Descripción |
|-----------|-------------|
| **Inmutabilidad** | Las transacciones nunca se modifican ni eliminan |
| **Trazabilidad** | Cada cambio de estado genera una nueva transacción vinculada |
| **Consistencia** | Los saldos se calculan como suma de transacciones |
| **Auditoría** | Historial completo de operaciones por diseño |

### 1.2 Patrón de Reversión

Cuando se necesita "anular" o "corregir" una operación:

```
Transacción Original (T1)
    │
    └── Transacción de Reversión (T2)
            ├── reverses_transaction_id = T1.id
            └── Montos/cantidades con signo opuesto
```

> ⚠️ **Nunca** se usa `UPDATE` o `DELETE` sobre transacciones existentes.

---

## 2. Tipos de Transacciones del Sistema

### 2.1 Catálogo Completo

| Código | Categoría | Descripción |
|--------|-----------|-------------|
| `SALE` | Ventas | Venta de productos |
| `SALE_RETURN` | Ventas | Devolución de venta |
| `PURCHASE` | Compras | Compra a proveedor |
| `PURCHASE_RETURN` | Compras | Devolución a proveedor |
| `STOCK_IN` | Inventario | Entrada de stock |
| `STOCK_OUT` | Inventario | Salida de stock |
| `STOCK_ADJUSTMENT` | Inventario | Ajuste de inventario |
| `STOCK_TRANSFER` | Inventario | Transferencia entre storages |
| `CASH_IN` | Caja | Entrada de efectivo |
| `CASH_OUT` | Caja | Salida de efectivo |
| `CASH_OVERAGE` | Caja | Sobrante de caja |
| `CASH_SHORTAGE` | Caja | Faltante de caja |
| `EXPENSE_ACCRUAL` | Gastos | Reconocimiento de gasto |
| `EXPENSE_PAYMENT` | Gastos | Pago de gasto |
| `TAX_LEDGER` | Fiscal | Registro de impuesto (débito) |
| `TAX_CREDIT` | Fiscal | Crédito fiscal (compras) |
| `TAX_PAYMENT` | Fiscal | Pago de impuesto |
| `BANK_DEPOSIT` | Tesorería | Depósito bancario |
| `BANK_WITHDRAWAL` | Tesorería | Retiro bancario |
| `REMITTANCE_SEND` | Tesorería | Envío de remesa |
| `REMITTANCE_RECEIVE` | Tesorería | Recepción de remesa |

---

## 3. Entidades Maestras

### 3.1 Company (Empresa)

```
Company
├── id: UUID
├── name: string
├── tax_id: string (RUT/RFC/RUC)
├── tax_authority_id: UUID
├── default_currency: string
├── fiscal_year_start: date
└── settings: JSON
```

### 3.2 Branch (Sucursal)

```
Branch
├── id: UUID
├── company_id: UUID (FK)
├── name: string
├── code: string
├── address: string
├── is_active: boolean
└── settings: JSON
```

### 3.3 PointOfSale (Punto de Venta)

```
PointOfSale
├── id: UUID
├── branch_id: UUID (FK)
├── name: string
├── code: string
├── is_active: boolean
└── settings: JSON
```

### 3.4 User (Usuario)

```
User
├── id: UUID
├── company_id: UUID (FK)
├── email: string
├── name: string
├── role: enum (ADMIN, MANAGER, SUPERVISOR, CASHIER)
├── branch_ids: UUID[] (sucursales asignadas)
├── is_active: boolean
└── settings: JSON
```

### 3.5 Customer (Cliente)

```
Customer
├── id: UUID
├── company_id: UUID (FK)
├── tax_id: string (RUT/RFC/RUC)
├── name: string
├── email: string
├── phone: string
├── address: string
├── credit_limit: decimal
├── payment_term_days: integer
├── is_active: boolean
└── metadata: JSON
```

### 3.6 Supplier (Proveedor)

```
Supplier
├── id: UUID
├── company_id: UUID (FK)
├── tax_id: string
├── name: string
├── contact_name: string
├── email: string
├── phone: string
├── address: string
├── payment_term_days: integer
├── is_active: boolean
└── metadata: JSON
```

### 3.7 Storage (Almacén/Bodega)

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
└── address: string (para EXTERNAL)
```

**Tipos de Storage:**

| Tipo | Descripción | branch_id | Ejemplos |
|------|-------------|-----------|----------|
| `IN_BRANCH` | Bodega dentro de sucursal | Requerido | Bodega tienda, Trastienda |
| `CENTRAL` | Centro de distribución | NULL | Bodega central, CD regional |
| `EXTERNAL` | Almacén externo/tercero | NULL | Proveedor consignación, 3PL |

### 3.8 StockLevel (Nivel de Stock)

```
StockLevel
├── id: UUID
├── product_variant_id: UUID (FK)
├── storage_id: UUID (FK)
├── quantity: decimal
├── reserved_quantity: decimal
├── min_stock: decimal
├── max_stock: decimal
└── last_updated: timestamp
```

> **Nota:** El stock se gestiona por `storage_id`, no directamente por `branch_id`. Una sucursal puede tener múltiples storages.

---

## 4. Estructura de Transacción Base

### 4.1 Campos Comunes

```
Transaction
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK, nullable)
├── storage_id: UUID (FK, nullable)
├── type: TransactionType
├── reference_id: UUID (documento origen)
├── reference_type: string (Sale, Purchase, etc.)
├── reverses_transaction_id: UUID (FK, nullable)
├── amount: decimal
├── quantity: decimal (para inventario)
├── user_id: UUID (FK)
├── created_at: timestamp
└── metadata: JSON
```

### 4.2 Reglas de Integridad

| Regla | Descripción |
|-------|-------------|
| **No UPDATE** | Campos de transacción son inmutables post-creación |
| **No DELETE** | Las transacciones permanecen para siempre |
| **Reversión** | Para anular, crear transacción inversa |
| **Referencia** | Siempre vincular al documento origen |

---

## 5. Cálculo de Saldos

### 5.1 Saldo de Inventario por Storage

```sql
SELECT 
    pv.id as product_variant_id,
    s.id as storage_id,
    SUM(
        CASE 
            WHEN t.type IN ('STOCK_IN', 'PURCHASE') THEN t.quantity
            WHEN t.type IN ('STOCK_OUT', 'SALE') THEN -t.quantity
            WHEN t.type = 'STOCK_ADJUSTMENT' THEN t.quantity
            WHEN t.type = 'STOCK_TRANSFER' THEN 
                CASE 
                    WHEN t.storage_id = s.id THEN -t.quantity  -- origen
                    WHEN t.metadata->>'destination_storage_id' = s.id THEN t.quantity  -- destino
                END
            ELSE 0
        END
    ) as stock_actual
FROM product_variants pv
CROSS JOIN storages s
LEFT JOIN transactions t ON t.product_variant_id = pv.id 
    AND (t.storage_id = s.id OR t.metadata->>'destination_storage_id' = s.id::text)
WHERE s.company_id = :company_id
GROUP BY pv.id, s.id
```

### 5.2 Saldo de Caja

```sql
SELECT 
    cs.id as cash_session_id,
    SUM(
        CASE 
            WHEN t.type = 'CASH_IN' THEN t.amount
            WHEN t.type = 'CASH_OUT' THEN -t.amount
            ELSE 0
        END
    ) as saldo_efectivo
FROM cash_sessions cs
LEFT JOIN transactions t ON t.reference_id = cs.id
WHERE cs.id = :session_id
GROUP BY cs.id
```

### 5.3 Cuenta por Cobrar de Cliente

```sql
SELECT 
    c.id as customer_id,
    SUM(
        CASE 
            WHEN t.type = 'SALE' THEN t.amount
            WHEN t.type = 'SALE_RETURN' THEN -t.amount
            WHEN t.type = 'CASH_IN' AND t.metadata->>'concept' = 'PAYMENT' THEN -t.amount
            ELSE 0
        END
    ) as saldo_pendiente
FROM customers c
LEFT JOIN transactions t ON t.metadata->>'customer_id' = c.id::text
WHERE c.id = :customer_id
GROUP BY c.id
```

---

## 6. Auditoría y Trazabilidad

### 6.1 Campos de Auditoría

Todas las entidades incluyen:

```
├── created_at: timestamp
├── created_by: UUID (user_id)
├── updated_at: timestamp
└── updated_by: UUID (user_id)
```

### 6.2 Log de Cambios

Para entidades maestras (no transacciones), se mantiene un log:

```
AuditLog
├── id: UUID
├── entity_type: string
├── entity_id: UUID
├── action: enum (CREATE, UPDATE, DELETE)
├── old_values: JSON
├── new_values: JSON
├── user_id: UUID
├── ip_address: string
└── created_at: timestamp
```

---

## 7. Configuración Multi-Tenant

### 7.1 Aislamiento por Company

Todas las consultas incluyen filtro por `company_id`:

```sql
-- Ejemplo: obtener productos
SELECT * FROM products 
WHERE company_id = :current_company_id
```

### 7.2 Permisos por Branch

Los usuarios tienen acceso limitado a sus sucursales asignadas:

```sql
-- Ejemplo: ventas del usuario
SELECT * FROM sales 
WHERE company_id = :company_id
AND branch_id IN (:user_branch_ids)
```

---

## 8. Jerarquía Completa del Sistema

```
Company
├── Branch (Sucursal)
│   ├── Storage (IN_BRANCH)
│   │   └── StockLevel
│   ├── PointOfSale (Terminal)
│   │   └── CashSession (Turno)
│   └── Users (asignados)
├── Storage (CENTRAL)
│   └── StockLevel
├── Storage (EXTERNAL)
│   └── StockLevel
├── Products
│   └── ProductVariants
│       └── StockLevel (por storage)
├── Customers
├── Suppliers
└── Transactions (inmutables)
```

---

📌 **Este documento es la base para todos los módulos del ERP. Cada módulo extiende estos conceptos manteniendo la filosofía de inmutabilidad.**
