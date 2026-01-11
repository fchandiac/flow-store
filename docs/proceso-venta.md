# Documentación Técnica: Proceso de Venta

Este documento describe el flujo completo de una venta, desde la creación del carrito hasta la emisión del documento fiscal y actualización de inventario.

---

## 1. Entidades Principales

### 1.1 Sale (Venta/Documento)

```
Sale
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK)
├── storage_id: UUID (FK) -- storage desde donde se descuenta stock
├── cash_session_id: UUID (FK, nullable)
├── customer_id: UUID (FK, nullable)
├── document_type: enum (INVOICE, TICKET, CREDIT_NOTE)
├── document_number: string
├── status: enum (DRAFT, COMPLETED, CANCELLED)
│
├── subtotal: decimal (suma de líneas sin impuestos)
├── discount_amount: decimal
├── tax_amount: decimal
├── total: decimal
│
├── payment_status: enum (PENDING, PARTIAL, PAID)
├── due_date: date (para crédito)
│
├── created_by: UUID
├── created_at: timestamp
├── completed_at: timestamp
└── metadata: JSON
    ├── promotion_ids: UUID[]
    ├── coupon_codes: string[]
    └── notes: string
```

### 1.2 SaleLine (Línea de Venta)

```
SaleLine
├── id: UUID
├── sale_id: UUID (FK)
├── product_variant_id: UUID (FK)
├── quantity: decimal
├── unit_price: decimal (precio unitario sin impuestos)
├── discount_percent: decimal
├── discount_amount: decimal
├── subtotal: decimal (quantity × unit_price - discount)
├── tax_amount: decimal
├── total: decimal
├── cost_at_sale: decimal (PPP al momento de venta)
└── metadata: JSON
    ├── price_list_id: UUID
    ├── promotion_id: UUID
    └── serial_numbers: string[]
```

### 1.3 SalePayment (Pago de Venta)

```
SalePayment
├── id: UUID
├── sale_id: UUID (FK)
├── payment_method: enum (CASH, DEBIT_CARD, CREDIT_CARD, TRANSFER, CREDIT)
├── amount: decimal
├── reference: string (N° transacción, N° transferencia)
├── cash_session_id: UUID (FK, si es efectivo)
├── created_at: timestamp
└── metadata: JSON
```

---

## 2. Flujo de Venta

### 2.1 Diagrama de Estados

```
DRAFT → COMPLETED → (CANCELLED)
                        ↓
                  CREDIT_NOTE
```

### 2.2 Proceso Paso a Paso

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESO DE VENTA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREAR CARRITO (Sale en DRAFT)                              │
│     └── Asignar branch_id, storage_id, cash_session_id         │
│                                                                 │
│  2. AGREGAR PRODUCTOS (SaleLines)                              │
│     ├── Validar stock disponible en storage                    │
│     ├── Resolver precio (lista de precios → promociones)       │
│     ├── Calcular impuestos por línea                           │
│     └── Reservar stock (reserved_quantity)                     │
│                                                                 │
│  3. APLICAR DESCUENTOS                                         │
│     ├── Descuentos manuales                                    │
│     ├── Promociones automáticas                                │
│     └── Cupones                                                │
│                                                                 │
│  4. CHECKOUT (Registrar Pagos)                                 │
│     ├── Validar monto total                                    │
│     └── Crear SalePayments                                     │
│                                                                 │
│  5. COMPLETAR VENTA                                            │
│     ├── Cambiar status → COMPLETED                             │
│     ├── Generar documento fiscal                               │
│     ├── Generar transacciones                                  │
│     └── Liberar reserva y descontar stock                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Transacciones Generadas

Al completar una venta, se generan múltiples transacciones:

### 3.1 Transacción de Venta (SALE)

```
Transaction (SALE)
├── company_id: sale.company_id
├── branch_id: sale.branch_id
├── storage_id: sale.storage_id
├── type: SALE
├── reference_id: sale.id
├── reference_type: "Sale"
├── amount: sale.total
├── user_id: sale.created_by
└── metadata: {
        document_number: "F-001-0001234",
        customer_id: "uuid",
        payment_methods: ["CASH", "DEBIT_CARD"]
    }
```

### 3.2 Transacciones de Stock (STOCK_OUT)

Por cada línea de venta:

```
Transaction (STOCK_OUT)
├── company_id: sale.company_id
├── branch_id: sale.branch_id
├── storage_id: sale.storage_id
├── type: STOCK_OUT
├── product_variant_id: line.product_variant_id
├── quantity: -line.quantity
├── unit_cost: line.cost_at_sale
├── total_cost: line.quantity × line.cost_at_sale
├── reference_id: sale.id
├── reference_type: "Sale"
└── metadata: {
        sale_line_id: "uuid",
        document_number: "F-001-0001234"
    }
```

### 3.3 Transacción de Efectivo (CASH_IN)

Si hay pago en efectivo:

```
Transaction (CASH_IN)
├── company_id: sale.company_id
├── branch_id: sale.branch_id
├── type: CASH_IN
├── reference_id: sale.id
├── reference_type: "Sale"
├── amount: payment.amount (efectivo recibido)
├── user_id: sale.created_by
└── metadata: {
        cash_session_id: "uuid",
        document_number: "F-001-0001234",
        concept: "SALE"
    }
```

### 3.4 Transacción Fiscal (TAX_LEDGER)

```
Transaction (TAX_LEDGER)
├── company_id: sale.company_id
├── branch_id: sale.branch_id
├── type: TAX_LEDGER
├── reference_id: sale.id
├── reference_type: "Sale"
├── amount: sale.tax_amount (IVA débito)
└── metadata: {
        document_type: "INVOICE",
        document_number: "F-001-0001234",
        tax_type: "IVA",
        tax_rate: 19,
        net_amount: sale.subtotal
    }
```

---

## 4. Cálculo de Impuestos

### 4.1 Por Línea de Venta

```
Para cada SaleLine:

1. Obtener impuestos del producto:
   ProductVariantTax[] = taxes del producto

2. Calcular base imponible:
   base = subtotal (después de descuentos)

3. Calcular cada impuesto:
   Por cada tax en ProductVariantTax:
       tax_amount += base × (tax.rate / 100)

4. Total línea:
   total = subtotal + tax_amount
```

### 4.2 Resumen de Documento

```
Sale.subtotal = Σ SaleLine.subtotal
Sale.discount_amount = Σ SaleLine.discount_amount
Sale.tax_amount = Σ SaleLine.tax_amount
Sale.total = Sale.subtotal + Sale.tax_amount
```

---

## 5. Métodos de Pago

### 5.1 Tipos Soportados

| Método | Afecta Caja | Requiere Referencia | Instantáneo |
|--------|-------------|--------------------:|-------------|
| `CASH` | ✅ Sí | No | ✅ Sí |
| `DEBIT_CARD` | ❌ No | Sí (N° transacción) | ✅ Sí |
| `CREDIT_CARD` | ❌ No | Sí (N° transacción) | ✅ Sí |
| `TRANSFER` | ❌ No | Sí (N° referencia) | ✅ Sí |
| `CREDIT` | ❌ No | No | ❌ No (genera CxC) |

### 5.2 Venta a Crédito

Cuando `payment_method = CREDIT`:

```
Sale
├── payment_status: PENDING
├── due_date: fecha_vencimiento
└── customer_id: REQUERIDO

Se genera cuenta por cobrar:
- Saldo inicial = sale.total
- Se paga con transacciones CASH_IN posteriores
```

### 5.3 Pago Mixto

Una venta puede tener múltiples pagos:

```
Sale (total = $100,000)
├── SalePayment (CASH, $50,000)
├── SalePayment (DEBIT_CARD, $30,000)
└── SalePayment (CREDIT, $20,000)

payment_status = PARTIAL (hasta que se pague el crédito)
```

---

## 6. Anulación y Devoluciones

### 6.1 Anulación de Venta (mismo día)

Si la venta no ha cerrado período fiscal:

```
1. Cambiar Sale.status → CANCELLED

2. Generar transacciones de reversión:
   - SALE (reverses_transaction_id = original)
   - STOCK_OUT reversiones (devuelven stock)
   - CASH_IN reversión (si hubo efectivo)
   - TAX_LEDGER reversión

3. Si hubo pagos con tarjeta → proceso manual de reversión
```

### 6.2 Nota de Crédito (post-cierre)

```
CreditNote (Sale con document_type = CREDIT_NOTE)
├── original_sale_id: UUID (venta original)
├── reason: string
├── lines: productos devueltos
└── Genera transacciones inversas
```

### 6.3 Devolución Parcial

```
Venta Original: 5 productos
Devolución: 2 productos

CreditNote
├── Solo incluye los 2 productos devueltos
├── SALE_RETURN: +2 unidades al stock del storage
└── Puede generar reembolso o nota de crédito
```

---

## 7. Reglas de Negocio

### 7.1 Validaciones al Agregar Producto

| Validación | Comportamiento |
|------------|----------------|
| Stock disponible | Bloquea si no hay stock (configurable) |
| Producto activo | Solo productos con `is_active = true` |
| Precio válido | Debe existir precio en alguna lista |
| Cantidad válida | Mayor a 0, respeta unidad de medida |

### 7.2 Validaciones al Completar

| Validación | Comportamiento |
|------------|----------------|
| Monto pagado | Σ pagos >= total (excepto crédito) |
| Sesión de caja | Requerida para pagos en efectivo |
| Cliente | Requerido para crédito y factura |
| Stock final | Re-validar disponibilidad |

### 7.3 Numeración de Documentos

```
document_number = {prefijo}-{serie}-{correlativo}

Ejemplo: F-001-00001234

- Prefijo: Tipo documento (F=Factura, B=Boleta, NC=Nota Crédito)
- Serie: Por punto de venta
- Correlativo: Secuencial por serie
```

---

## 8. Integración con Sesión de Caja

### 8.1 Ventas en Sesión

```
CashSession (OPEN)
├── Sales[] (ventas del turno)
├── Σ CASH_IN por ventas
├── Σ CASH_OUT por vueltos/gastos
└── Saldo teórico calculado
```

### 8.2 Cálculo de Vuelto

```
Si pago efectivo > total:
    vuelto = pago_efectivo - total
    
    SalePayment registra monto_recibido en metadata:
    {
        amount: total,  // lo que se registra
        received: pago_efectivo,
        change: vuelto
    }
```

---

## 9. Queries Útiles

### 9.1 Ventas del Día por Sucursal

```sql
SELECT 
    b.name as branch_name,
    COUNT(*) as total_sales,
    SUM(s.subtotal) as subtotal,
    SUM(s.discount_amount) as discounts,
    SUM(s.tax_amount) as taxes,
    SUM(s.total) as total
FROM sales s
JOIN branches b ON b.id = s.branch_id
WHERE s.company_id = :company_id
  AND s.status = 'COMPLETED'
  AND DATE(s.completed_at) = CURRENT_DATE
GROUP BY b.id, b.name
```

### 9.2 Ventas por Método de Pago

```sql
SELECT 
    sp.payment_method,
    COUNT(DISTINCT s.id) as sales_count,
    SUM(sp.amount) as total_amount
FROM sale_payments sp
JOIN sales s ON s.id = sp.sale_id
WHERE s.company_id = :company_id
  AND s.status = 'COMPLETED'
  AND DATE(s.completed_at) = CURRENT_DATE
GROUP BY sp.payment_method
```

### 9.3 Productos Más Vendidos

```sql
SELECT 
    pv.sku,
    pv.name,
    SUM(sl.quantity) as total_quantity,
    SUM(sl.total) as total_revenue,
    SUM(sl.quantity * sl.cost_at_sale) as total_cost,
    SUM(sl.total) - SUM(sl.quantity * sl.cost_at_sale) as gross_profit
FROM sale_lines sl
JOIN product_variants pv ON pv.id = sl.product_variant_id
JOIN sales s ON s.id = sl.sale_id
WHERE s.company_id = :company_id
  AND s.status = 'COMPLETED'
  AND s.completed_at >= :start_date
  AND s.completed_at <= :end_date
GROUP BY pv.id, pv.sku, pv.name
ORDER BY total_quantity DESC
LIMIT 20
```

---

📌 **Cada venta genera múltiples transacciones inmutables que mantienen la consistencia del sistema.**
