# Documentación Técnica: Proceso de Compras

Este documento describe el flujo completo de compras, desde la orden de compra hasta la recepción, facturación y actualización de inventario.

---

## 1. Entidades Principales

### 1.1 PurchaseOrder (Orden de Compra)

```
PurchaseOrder
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK, sucursal solicitante)
├── storage_id: UUID (FK, storage destino)
├── supplier_id: UUID (FK)
├── order_number: string
├── status: enum (DRAFT, SENT, PARTIAL, RECEIVED, CANCELLED)
│
├── subtotal: decimal
├── tax_amount: decimal
├── total: decimal
│
├── expected_date: date
├── notes: string
│
├── created_by: UUID
├── created_at: timestamp
├── approved_by: UUID
├── approved_at: timestamp
└── metadata: JSON
```

### 1.2 PurchaseOrderLine (Línea de OC)

```
PurchaseOrderLine
├── id: UUID
├── purchase_order_id: UUID (FK)
├── product_variant_id: UUID (FK)
├── quantity_ordered: decimal
├── quantity_received: decimal (actualizado con recepciones)
├── unit_cost: decimal (sin impuestos)
├── tax_amount: decimal
├── total: decimal
└── metadata: JSON
```

### 1.3 Reception (Recepción de Mercadería)

```
Reception
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK)
├── storage_id: UUID (FK)
├── purchase_order_id: UUID (FK, nullable)
├── supplier_id: UUID (FK)
├── reception_number: string
├── status: enum (DRAFT, COMPLETED, CANCELLED)
│
├── received_by: UUID
├── received_at: timestamp
├── supplier_document: string (guía despacho proveedor)
└── notes: string
```

### 1.4 ReceptionLine (Línea de Recepción)

```
ReceptionLine
├── id: UUID
├── reception_id: UUID (FK)
├── purchase_order_line_id: UUID (FK, nullable)
├── product_variant_id: UUID (FK)
├── quantity_expected: decimal (de la OC)
├── quantity_received: decimal (conteo real)
├── quantity_accepted: decimal (después de QC)
├── unit_cost: decimal
├── batch_number: string
├── expiry_date: date
└── notes: string (observaciones, rechazos)
```

### 1.5 PurchaseInvoice (Factura de Compra)

```
PurchaseInvoice
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK)
├── supplier_id: UUID (FK)
├── reception_id: UUID (FK, nullable)
├── purchase_order_id: UUID (FK, nullable)
│
├── invoice_number: string (N° factura proveedor)
├── invoice_date: date
├── due_date: date
├── status: enum (DRAFT, POSTED, PAID, CANCELLED)
│
├── subtotal: decimal
├── tax_amount: decimal
├── total: decimal
│
├── payment_status: enum (PENDING, PARTIAL, PAID)
└── metadata: JSON
```

---

## 2. Flujo de Compras

### 2.1 Diagrama de Estados OC

```
DRAFT → SENT → PARTIAL → RECEIVED
          ↓        ↓
      CANCELLED  CANCELLED
```

### 2.2 Proceso Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESO DE COMPRA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREAR ORDEN DE COMPRA (DRAFT)                              │
│     ├── Seleccionar proveedor                                  │
│     ├── Seleccionar storage destino                            │
│     ├── Agregar productos y cantidades                         │
│     └── Definir fecha esperada                                 │
│                                                                 │
│  2. APROBAR Y ENVIAR (SENT)                                    │
│     ├── Validar autorización según monto                       │
│     ├── Enviar al proveedor                                    │
│     └── Reservar presupuesto (opcional)                        │
│                                                                 │
│  3. RECEPCIÓN DE MERCADERÍA                                    │
│     ├── Crear Reception vinculada a OC                         │
│     ├── Registrar cantidades recibidas                         │
│     ├── Control de calidad (opcional)                          │
│     ├── Generar transacciones STOCK_IN                         │
│     └── Actualizar PPP                                         │
│                                                                 │
│  4. REGISTRO DE FACTURA                                        │
│     ├── Ingresar factura del proveedor                         │
│     ├── Validar contra recepción                               │
│     ├── Registrar crédito fiscal (TAX_CREDIT)                  │
│     └── Generar cuenta por pagar                               │
│                                                                 │
│  5. PAGO A PROVEEDOR                                           │
│     ├── Programar pago según vencimiento                       │
│     └── Registrar pago (EXPENSE_PAYMENT)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Recepción de Mercadería

### 3.1 Modos de Recepción

| Modo | Descripción | Uso |
|------|-------------|-----|
| **Con OC** | Recepción vinculada a orden de compra | Flujo normal |
| **Sin OC** | Recepción directa sin orden previa | Compras menores, emergencias |
| **Ciega** | Sin ver cantidades esperadas | Mayor control de conteo |

### 3.2 Proceso de Recepción

```
1. Crear Reception
   ├── Vincular a PurchaseOrder (si existe)
   └── Asignar storage destino

2. Por cada producto:
   ├── Registrar quantity_received (conteo físico)
   ├── Comparar con quantity_expected
   ├── Registrar batch_number y expiry_date
   └── Notas de calidad/rechazos

3. Completar Recepción:
   ├── Generar transacciones STOCK_IN
   ├── Actualizar PurchaseOrderLine.quantity_received
   ├── Actualizar estado OC (PARTIAL o RECEIVED)
   └── Calcular nuevo PPP
```

### 3.3 Transacciones de Recepción

Por cada línea aceptada:

```
Transaction (STOCK_IN)
├── company_id: reception.company_id
├── branch_id: reception.branch_id
├── storage_id: reception.storage_id
├── type: STOCK_IN
├── product_variant_id: line.product_variant_id
├── quantity: +line.quantity_accepted
├── unit_cost: line.unit_cost
├── total_cost: quantity × unit_cost
├── reference_id: reception.id
├── reference_type: "Reception"
└── metadata: {
        reception_line_id: "uuid",
        purchase_order_id: "uuid",
        batch_number: "LOT-2025-001",
        expiry_date: "2026-06-30",
        supplier_document: "GD-12345"
    }
```

---

## 4. Actualización de PPP

### 4.1 Fórmula

```
Nuevo PPP = (Stock Actual × PPP Actual + Cantidad Recibida × Costo Compra)
            / (Stock Actual + Cantidad Recibida)
```

### 4.2 Ejemplo

```
Estado inicial:
- Stock: 100 unidades
- PPP: $1,000

Recepción:
- Cantidad: 50 unidades
- Costo: $1,200

Cálculo:
Nuevo PPP = (100 × $1,000 + 50 × $1,200) / (100 + 50)
Nuevo PPP = ($100,000 + $60,000) / 150
Nuevo PPP = $1,066.67

Estado final:
- Stock: 150 unidades
- PPP: $1,066.67
```

### 4.3 Registro en Transacción

```
Transaction (STOCK_IN)
└── metadata: {
        previous_ppp: 1000,
        new_ppp: 1066.67,
        previous_stock: 100,
        new_stock: 150
    }
```

---

## 5. Facturación de Compra

### 5.1 Registro de Factura

```
PurchaseInvoice
├── Vincular a Reception (validar montos)
├── invoice_number: número del proveedor
├── invoice_date: fecha emisión
├── due_date: fecha vencimiento
└── Desglose de impuestos
```

### 5.2 Validación Factura vs Recepción

| Validación | Acción |
|------------|--------|
| Montos coinciden | Procesar normalmente |
| Factura > Recepción | Alerta, requiere aprobación |
| Factura < Recepción | Alerta, verificar |
| Productos diferentes | Bloquear, revisar |

### 5.3 Transacción de Crédito Fiscal

```
Transaction (TAX_CREDIT)
├── company_id: invoice.company_id
├── branch_id: invoice.branch_id
├── type: TAX_CREDIT
├── reference_id: invoice.id
├── reference_type: "PurchaseInvoice"
├── amount: invoice.tax_amount (IVA crédito)
└── metadata: {
        invoice_number: "F-12345",
        supplier_tax_id: "76.123.456-7",
        supplier_name: "Proveedor ABC",
        tax_type: "IVA",
        tax_rate: 19,
        net_amount: invoice.subtotal,
        is_recoverable: true
    }
```

---

## 6. Gestión de Proveedores

### 6.1 Supplier (Proveedor)

```
Supplier
├── id: UUID
├── company_id: UUID
├── tax_id: string (RUT)
├── name: string
├── trade_name: string
├── contact_name: string
├── email: string
├── phone: string
├── address: string
├── payment_term_days: integer (plazo pago)
├── credit_limit: decimal
├── is_active: boolean
└── metadata: JSON
    ├── bank_account: string
    ├── bank_name: string
    └── categories: string[]
```

### 6.2 Evaluación de Proveedor

```
SupplierMetrics (calculado)
├── total_orders: integer
├── orders_on_time: integer
├── delivery_rate: decimal (%)
├── quality_score: decimal
├── average_lead_time: integer (días)
└── total_purchased: decimal
```

---

## 7. Cuenta por Pagar

### 7.1 Generación Automática

Al registrar factura con `payment_status = PENDING`:

```
Se crea cuenta por pagar implícita:
- Monto: invoice.total
- Vencimiento: invoice.due_date
- Proveedor: invoice.supplier_id
```

### 7.2 Registro de Pago

```
Transaction (EXPENSE_PAYMENT)
├── company_id: invoice.company_id
├── type: EXPENSE_PAYMENT
├── reference_id: invoice.id
├── reference_type: "PurchaseInvoice"
├── amount: monto_pagado
└── metadata: {
        payment_method: "TRANSFER",
        bank_account: "cuenta_origen",
        reference_number: "TRF-123456",
        supplier_id: "uuid"
    }
```

---

## 8. Recepciones Parciales

### 8.1 Escenario

```
OC: 100 unidades de Producto A

Recepción 1: 60 unidades → OC.status = PARTIAL
Recepción 2: 40 unidades → OC.status = RECEIVED
```

### 8.2 Tracking

```
PurchaseOrderLine
├── quantity_ordered: 100
├── quantity_received: 60 (después de Recepción 1)
├── quantity_pending: 40 (calculado)
└── receptions: [Reception1.id]

Después de Recepción 2:
├── quantity_received: 100
├── quantity_pending: 0
└── receptions: [Reception1.id, Reception2.id]
```

---

## 9. Devolución a Proveedor

### 9.1 PurchaseReturn (Devolución)

```
PurchaseReturn
├── id: UUID
├── company_id: UUID
├── branch_id: UUID
├── storage_id: UUID
├── supplier_id: UUID
├── reception_id: UUID (recepción original)
├── reason: string
├── status: enum (DRAFT, SENT, ACCEPTED, REJECTED)
│
├── subtotal: decimal
├── tax_amount: decimal
├── total: decimal
└── lines: PurchaseReturnLine[]
```

### 9.2 Transacciones de Devolución

```
Transaction (PURCHASE_RETURN / STOCK_OUT)
├── type: PURCHASE_RETURN
├── storage_id: storage origen
├── product_variant_id: producto
├── quantity: -cantidad_devuelta
├── reference_id: purchase_return.id
└── reverses_transaction_id: stock_in_original.id
```

---

## 10. Reglas de Negocio

### 10.1 Validaciones OC

| Regla | Descripción |
|-------|-------------|
| Proveedor activo | Solo proveedores con `is_active = true` |
| Productos activos | Solo productos activos |
| Aprobación | Montos > umbral requieren aprobación |
| Duplicados | Alertar OC similares recientes |

### 10.2 Validaciones Recepción

| Regla | Descripción |
|-------|-------------|
| OC válida | OC en estado SENT o PARTIAL |
| Cantidad máxima | No exceder cantidad pendiente |
| Storage válido | Storage activo y permite recepciones |

### 10.3 Validaciones Factura

| Regla | Descripción |
|-------|-------------|
| Número único | Por proveedor |
| Fecha válida | No futura |
| Monto razonable | Variación < 5% vs recepción |

---

## 11. Queries Útiles

### 11.1 OC Pendientes de Recepción

```sql
SELECT 
    po.order_number,
    s.name as supplier_name,
    po.expected_date,
    po.total,
    po.status,
    DATEDIFF(CURRENT_DATE, po.expected_date) as days_overdue
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
WHERE po.company_id = :company_id
  AND po.status IN ('SENT', 'PARTIAL')
ORDER BY po.expected_date ASC
```

### 11.2 Compras por Proveedor

```sql
SELECT 
    s.name as supplier_name,
    COUNT(pi.id) as invoice_count,
    SUM(pi.subtotal) as total_net,
    SUM(pi.tax_amount) as total_tax,
    SUM(pi.total) as total_gross
FROM purchase_invoices pi
JOIN suppliers s ON s.id = pi.supplier_id
WHERE pi.company_id = :company_id
  AND pi.invoice_date >= :start_date
  AND pi.invoice_date <= :end_date
  AND pi.status = 'POSTED'
GROUP BY s.id, s.name
ORDER BY total_gross DESC
```

### 11.3 Cuentas por Pagar Vencidas

```sql
SELECT 
    s.name as supplier_name,
    pi.invoice_number,
    pi.invoice_date,
    pi.due_date,
    pi.total,
    DATEDIFF(CURRENT_DATE, pi.due_date) as days_overdue
FROM purchase_invoices pi
JOIN suppliers s ON s.id = pi.supplier_id
WHERE pi.company_id = :company_id
  AND pi.payment_status IN ('PENDING', 'PARTIAL')
  AND pi.due_date < CURRENT_DATE
ORDER BY pi.due_date ASC
```

---

📌 **El proceso de compras mantiene trazabilidad completa desde la OC hasta el pago, con actualización automática de costos (PPP).**
