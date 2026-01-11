# Documentación Técnica: Gestión Fiscal

Este documento describe el modelo de gestión de impuestos, períodos fiscales, libros de compra/venta y declaraciones.

---

## 1. Entidades Principales

### 1.1 TaxAuthority (Autoridad Tributaria)

```
TaxAuthority
├── id: UUID
├── code: string (SII, SAT, SUNAT, etc.)
├── name: string
├── country: string
├── settings: JSON
│   ├── fiscal_year_start: string (MM-DD)
│   ├── declaration_frequency: enum (MONTHLY, QUARTERLY)
│   └── tax_types: string[]
└── is_active: boolean
```

### 1.2 Tax (Impuesto)

```
Tax
├── id: UUID
├── company_id: UUID (FK)
├── tax_authority_id: UUID (FK)
├── code: string (IVA, ISC, etc.)
├── name: string
├── rate: decimal (19, 10, etc.)
├── type: enum (SALES, PURCHASES, WITHHOLDING, SPECIFIC)
├── calculation_base: enum (NET_PRICE, GROSS_PRICE, CASCADING)
├── is_recoverable: boolean (true para IVA crédito)
├── is_active: boolean
└── metadata: JSON
    ├── account_code: string (cuenta contable)
    └── applies_to: string[] (categorías)
```

**Impuestos Típicos:**

| Código | Nombre | Tasa | Tipo | Recuperable |
|--------|--------|------|------|-------------|
| `IVA_19` | IVA | 19% | SALES/PURCHASES | Sí |
| `IMP_ALCOHOL` | Imp. Bebidas Alcohólicas | 27% | SPECIFIC | No |
| `IMP_TABACO` | Imp. Tabaco | 52.6% | SPECIFIC | No |
| `IMP_AZUCAR` | Imp. Bebidas Azucaradas | 18% | SPECIFIC | No |

### 1.3 ProductVariantTax (Impuestos por Producto)

```
ProductVariantTax
├── id: UUID
├── product_variant_id: UUID (FK)
├── tax_id: UUID (FK)
├── is_exempt: boolean
└── metadata: JSON
```

### 1.4 TaxPeriod (Período Fiscal)

```
TaxPeriod
├── id: UUID
├── company_id: UUID (FK)
├── tax_authority_id: UUID (FK)
├── period_type: enum (MONTHLY, QUARTERLY, YEARLY)
├── year: integer
├── month: integer (1-12, null si quarterly/yearly)
├── quarter: integer (1-4, null si monthly)
│
├── start_date: date
├── end_date: date
├── due_date: date (vencimiento declaración)
│
├── status: enum (OPEN, CLOSED, FILED, PAID)
│
├── sales_tax_total: decimal (débito fiscal)
├── purchase_tax_total: decimal (crédito fiscal)
├── tax_payable: decimal (débito - crédito)
├── previous_balance: decimal (saldo anterior)
├── final_tax: decimal (a pagar o a favor)
│
├── filed_at: timestamp
├── filed_by: UUID
├── payment_date: date
├── payment_reference: string
└── notes: string
```

**Estados del Período:**

```
OPEN → CLOSED → FILED → PAID
```

| Estado | Descripción | Acciones Permitidas |
|--------|-------------|---------------------|
| `OPEN` | Período activo, recibe transacciones | Agregar documentos |
| `CLOSED` | Cerrado para nuevos documentos | Generar declaración |
| `FILED` | Declaración presentada | Registrar pago |
| `PAID` | Impuesto pagado | Solo consulta |

---

## 2. Cálculo de Impuestos

### 2.1 En Ventas (Débito Fiscal)

```
Por cada SaleLine:

1. Obtener impuestos del producto:
   taxes = ProductVariantTax WHERE product_variant_id = line.product_variant_id

2. Por cada impuesto:
   IF tax.calculation_base = 'NET_PRICE':
       tax_amount = line.subtotal × (tax.rate / 100)
   
   IF tax.calculation_base = 'CASCADING':
       // Impuesto sobre impuesto (ej: IVA sobre precio con imp. específico)
       base = line.subtotal + previous_taxes
       tax_amount = base × (tax.rate / 100)

3. Registrar en transacción:
   TAX_LEDGER con amount = Σ tax_amounts
```

### 2.2 En Compras (Crédito Fiscal)

```
Por cada PurchaseInvoiceLine:

1. Obtener impuestos del producto

2. Por cada impuesto:
   IF tax.is_recoverable:
       → Registrar TAX_CREDIT (activo)
   ELSE:
       → Agregar al costo del producto (afecta PPP)

3. Transacción:
   TAX_CREDIT con amount = impuestos recuperables
```

### 2.3 Ejemplo de Cálculo Cascada

```
Producto: Vino (1 botella)
Precio Neto: $5,000

Impuestos:
1. Imp. Bebidas Alcohólicas: 27% sobre neto
   → $5,000 × 27% = $1,350

2. IVA: 19% sobre (neto + imp. específico)
   → ($5,000 + $1,350) × 19% = $1,206.50

Total impuestos: $2,556.50
Precio final: $7,556.50
```

---

## 3. Transacciones Fiscales

### 3.1 TAX_LEDGER (Débito Fiscal)

```
Transaction (TAX_LEDGER)
├── company_id: UUID
├── branch_id: UUID
├── type: TAX_LEDGER
├── reference_id: sale.id
├── reference_type: "Sale"
├── amount: total_impuestos_venta
└── metadata: {
        document_type: "INVOICE",
        document_number: "F-001-0001234",
        customer_tax_id: "12.345.678-9",
        customer_name: "Cliente ABC",
        net_amount: 100000,
        tax_breakdown: [
            { tax_code: "IVA_19", rate: 19, base: 100000, amount: 19000 }
        ],
        tax_period_id: "uuid"
    }
```

### 3.2 TAX_CREDIT (Crédito Fiscal)

```
Transaction (TAX_CREDIT)
├── company_id: UUID
├── branch_id: UUID
├── type: TAX_CREDIT
├── reference_id: purchase_invoice.id
├── reference_type: "PurchaseInvoice"
├── amount: total_impuestos_recuperables
└── metadata: {
        document_type: "INVOICE",
        document_number: "F-2024-5678",
        supplier_tax_id: "76.543.210-K",
        supplier_name: "Proveedor XYZ",
        net_amount: 500000,
        tax_breakdown: [
            { tax_code: "IVA_19", rate: 19, base: 500000, amount: 95000, recoverable: true }
        ],
        tax_period_id: "uuid"
    }
```

### 3.3 TAX_PAYMENT (Pago de Impuesto)

```
Transaction (TAX_PAYMENT)
├── type: TAX_PAYMENT
├── reference_id: tax_period.id
├── reference_type: "TaxPeriod"
├── amount: monto_pagado
└── metadata: {
        period: "2025-12",
        tax_type: "IVA",
        payment_method: "TRANSFER",
        bank_reference: "TRF-20260120-001"
    }
```

---

## 4. Libros de Compra y Venta

### 4.1 Libro de Ventas

```sql
SELECT 
    DATE(s.completed_at) as fecha,
    s.document_type as tipo_doc,
    s.document_number as numero,
    c.tax_id as rut_cliente,
    c.name as nombre_cliente,
    s.subtotal as neto,
    s.tax_amount as iva,
    s.total as total
FROM sales s
LEFT JOIN customers c ON c.id = s.customer_id
WHERE s.company_id = :company_id
  AND s.status = 'COMPLETED'
  AND DATE(s.completed_at) BETWEEN :start_date AND :end_date
  AND s.document_type IN ('INVOICE', 'TICKET', 'CREDIT_NOTE')
ORDER BY s.completed_at
```

### 4.2 Libro de Compras

```sql
SELECT 
    pi.invoice_date as fecha,
    'INVOICE' as tipo_doc,
    pi.invoice_number as numero,
    s.tax_id as rut_proveedor,
    s.name as nombre_proveedor,
    pi.subtotal as neto,
    pi.tax_amount as iva,
    pi.total as total,
    CASE WHEN EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.reference_id = pi.id 
        AND t.type = 'TAX_CREDIT'
    ) THEN 'RECUPERABLE' ELSE 'NO RECUPERABLE' END as tipo_iva
FROM purchase_invoices pi
JOIN suppliers s ON s.id = pi.supplier_id
WHERE pi.company_id = :company_id
  AND pi.status = 'POSTED'
  AND pi.invoice_date BETWEEN :start_date AND :end_date
ORDER BY pi.invoice_date
```

---

## 5. Declaración de Impuestos

### 5.1 Proceso de Declaración

```
┌─────────────────────────────────────────────────────────────────┐
│              PROCESO DE DECLARACIÓN                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CIERRE DE PERÍODO                                          │
│     ├── Verificar todos los documentos ingresados              │
│     ├── Validar consistencia de datos                          │
│     └── Cambiar status → CLOSED                                │
│                                                                 │
│  2. CÁLCULO DE IMPUESTOS                                       │
│     ├── Sumar TAX_LEDGER del período (débito)                  │
│     ├── Sumar TAX_CREDIT del período (crédito)                 │
│     ├── Aplicar saldo anterior (si existe)                     │
│     └── Determinar monto a pagar/favor                         │
│                                                                 │
│  3. GENERACIÓN DE DECLARACIÓN                                  │
│     ├── Generar archivo/formulario                             │
│     ├── Adjuntar libros de compra/venta                        │
│     └── Cambiar status → FILED                                 │
│                                                                 │
│  4. PAGO                                                       │
│     ├── Registrar pago (si corresponde)                        │
│     ├── Generar TAX_PAYMENT                                    │
│     └── Cambiar status → PAID                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Cálculo de Declaración

```
TaxPeriod (Diciembre 2025):

Débito Fiscal (TAX_LEDGER):
├── Facturas emitidas:    $38,500,000 neto → IVA $7,315,000
├── Boletas emitidas:      $6,200,000 neto → IVA $1,178,000
├── NC emitidas:            -$450,000 neto → IVA   -$85,500
└── TOTAL DÉBITO:                              $8,407,500

Crédito Fiscal (TAX_CREDIT):
├── Facturas recibidas:   $10,850,000 neto → IVA $2,061,500
├── NC recibidas:           -$280,000 neto → IVA   -$53,200
└── TOTAL CRÉDITO:                             $2,008,300

Determinación:
├── Débito Fiscal:          $8,407,500
├── Crédito Fiscal:        -$2,008,300
├── Remanente anterior:            $0
└── IVA A PAGAR:            $6,399,200
```

---

## 6. Impuestos Específicos

### 6.1 Configuración por Producto

```
ProductVariant: "Cerveza Kunstmann 500ml"
├── ProductVariantTax: IVA_19 (recuperable en compra)
└── ProductVariantTax: IMP_ALCOHOL_27 (no recuperable)

Al comprar:
- IVA → TAX_CREDIT (activo, recuperable)
- Imp. Alcohol → Se suma al costo (afecta PPP)

Al vender:
- IVA → TAX_LEDGER (débito fiscal)
- Imp. Alcohol → TAX_LEDGER (débito fiscal, no compensable)
```

### 6.2 Reporte de Impuestos Específicos

```sql
SELECT 
    t.code as impuesto,
    t.name,
    t.rate,
    SUM(CASE WHEN tr.type = 'TAX_LEDGER' THEN tr.amount ELSE 0 END) as debito,
    SUM(CASE WHEN tr.type = 'TAX_CREDIT' AND t.is_recoverable THEN tr.amount ELSE 0 END) as credito,
    SUM(CASE WHEN tr.type = 'TAX_LEDGER' THEN tr.amount ELSE 0 END) -
    SUM(CASE WHEN tr.type = 'TAX_CREDIT' AND t.is_recoverable THEN tr.amount ELSE 0 END) as neto
FROM transactions tr
JOIN taxes t ON t.code = tr.metadata->>'tax_code'
WHERE tr.company_id = :company_id
  AND tr.type IN ('TAX_LEDGER', 'TAX_CREDIT')
  AND tr.created_at BETWEEN :start_date AND :end_date
GROUP BY t.id, t.code, t.name, t.rate
ORDER BY t.code
```

---

## 7. Reglas de Negocio

### 7.1 Validaciones de Documentos

| Regla | Descripción |
|-------|-------------|
| RUT válido | Cliente/Proveedor debe tener RUT válido para facturas |
| Fecha coherente | Documento no puede ser de período futuro |
| Numeración | Correlativo sin saltos |
| Período abierto | Solo agregar a períodos en estado OPEN |

### 7.2 Validaciones de Período

| Regla | Descripción |
|-------|-------------|
| Cierre secuencial | No cerrar período si anterior está OPEN |
| Sin documentos pendientes | Alertar facturas no ingresadas |
| Cuadratura | Débito - Crédito debe cuadrar con cálculo |

### 7.3 Tratamiento de Diferencias

```
Si hay diferencia entre declarado y calculado:

1. Si diferencia < umbral (ej: $1,000):
   → Ajuste automático como "Diferencia de redondeo"

2. Si diferencia >= umbral:
   → Requiere revisión manual
   → No permite cerrar período
```

---

## 8. Queries Útiles

### 8.1 Resumen Mensual de IVA

```sql
SELECT 
    DATE_TRUNC('month', tr.created_at) as mes,
    SUM(CASE WHEN tr.type = 'TAX_LEDGER' THEN tr.amount ELSE 0 END) as debito_fiscal,
    SUM(CASE WHEN tr.type = 'TAX_CREDIT' THEN tr.amount ELSE 0 END) as credito_fiscal,
    SUM(CASE WHEN tr.type = 'TAX_LEDGER' THEN tr.amount ELSE 0 END) -
    SUM(CASE WHEN tr.type = 'TAX_CREDIT' THEN tr.amount ELSE 0 END) as iva_neto
FROM transactions tr
WHERE tr.company_id = :company_id
  AND tr.type IN ('TAX_LEDGER', 'TAX_CREDIT')
  AND tr.metadata->>'tax_code' = 'IVA_19'
  AND tr.created_at >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', tr.created_at)
ORDER BY mes
```

### 8.2 Estado de Períodos

```sql
SELECT 
    tp.year,
    tp.month,
    tp.status,
    tp.sales_tax_total as debito,
    tp.purchase_tax_total as credito,
    tp.tax_payable as a_pagar,
    tp.due_date as vencimiento,
    CASE 
        WHEN tp.status = 'OPEN' AND tp.due_date < CURRENT_DATE THEN 'ATRASADO'
        WHEN tp.status IN ('OPEN', 'CLOSED') AND tp.due_date <= CURRENT_DATE + 5 THEN 'PRÓXIMO'
        ELSE 'OK'
    END as alerta
FROM tax_periods tp
WHERE tp.company_id = :company_id
ORDER BY tp.year DESC, tp.month DESC
```

---

## 9. Integración con Autoridad Tributaria

### 9.1 Facturación Electrónica (DTE)

```
Company.settings.dte: {
    enabled: true,
    provider: "FACTURACION_ELECTRONICA_CL",
    credentials: {
        rut: "76.123.456-7",
        api_key: "encrypted_key",
        environment: "PRODUCTION"
    },
    auto_send: true,
    caf_alert_threshold: 100  // alertar cuando queden 100 folios
}
```

### 9.2 Flujo DTE

```
1. Venta completada
2. Generar XML según formato SII
3. Firmar electrónicamente
4. Enviar a SII
5. Recibir respuesta (aceptado/rechazado)
6. Actualizar Sale con track_id y estado DTE
7. Disponibilizar PDF para cliente
```

---

📌 **La gestión fiscal es crítica para el cumplimiento tributario. Los períodos deben cerrarse y declararse dentro de los plazos legales para evitar multas e intereses.**
