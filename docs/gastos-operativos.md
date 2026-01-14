# Documentación Técnica: Gastos Operativos (OPEX)

Este documento describe el modelo de gestión de gastos operativos, centros de costo, presupuestos y el flujo de aprobación.

---

> ℹ️ **Nota de implementación:** En la capa de datos (`app/data/entities`) este dominio se materializa con las entidades `CostCenter`, `ExpenseCategory`, `Budget` y `OperationalExpense`. El documento mantiene la nomenclatura histórica (`Expense`), pero la tabla persistente para el gasto operativo se llama `operational_expenses`.

## 1. Entidades Principales

### 1.1 CostCenter (Centro de Costos)

```
CostCenter
├── id: UUID
├── company_id: UUID (FK)
├── parent_id: UUID (FK, nullable) -- para jerarquía
├── branch_id: UUID (FK, nullable) -- NULL = corporativo
├── code: string
├── name: string
├── description: string
├── is_active: boolean
└── metadata: JSON
```

**Jerarquía de Centros de Costo:**

```
Corporativo (parent_id = NULL, branch_id = NULL)
├── Administración
│   ├── RRHH
│   ├── Contabilidad
│   └── Legal
├── Operaciones
│   ├── Logística
│   └── Mantenimiento
└── Por Sucursal (branch_id = X)
    ├── Ventas
    ├── Limpieza
    └── Servicios
```

### 1.2 ExpenseCategory (Categoría de Gasto)

```
ExpenseCategory
├── id: UUID
├── company_id: UUID (FK)
├── code: string
├── name: string
├── description: string
├── requires_approval: boolean
├── approval_threshold: decimal
├── default_cost_center_id: UUID (FK, nullable)
├── is_active: boolean
└── metadata: JSON
```

**Categorías Típicas:**

| Código | Nombre | Ejemplos |
|--------|--------|----------|
| `UTIL` | Servicios Básicos | Luz, agua, gas, internet |
| `RENT` | Arriendos | Alquiler local, bodega |
| `MAINT` | Mantenimiento | Reparaciones, limpieza |
| `SUPPLY` | Suministros | Papelería, aseo |
| `TRANS` | Transporte | Combustible, fletes |
| `PROF` | Servicios Profesionales | Contadores, abogados |
| `BANK` | Gastos Bancarios | Comisiones, intereses |
| `TAX` | Impuestos | Patentes, contribuciones |
| `OTHER` | Otros | Gastos varios |

### 1.3 Expense (Gasto)

```
Expense
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK)
├── cost_center_id: UUID (FK)
├── category_id: UUID (FK)
│
├── expense_number: string
├── description: string
├── date: date
│
├── subtotal: decimal
├── tax_amount: decimal
├── total: decimal
│
├── supplier_id: UUID (FK, nullable)
├── invoice_number: string
├── invoice_date: date
│
├── status: enum (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PAID, CANCELLED)
├── payment_method: enum (CASH, TRANSFER, CHECK, CREDIT_CARD)
├── payment_source: enum (TREASURY, CASH_SESSION)
│
├── created_by: UUID
├── approved_by: UUID
├── approved_at: timestamp
├── paid_at: timestamp
│
└── metadata: JSON
    ├── attachments: string[] (URLs de comprobantes)
    ├── rejection_reason: string
    └── cash_session_id: UUID (si se paga desde caja)
```

### 1.4 Budget (Presupuesto)

```
Budget
├── id: UUID
├── company_id: UUID (FK)
├── branch_id: UUID (FK, nullable)
├── cost_center_id: UUID (FK)
├── category_id: UUID (FK, nullable) -- NULL = todo el centro
│
├── period_type: enum (MONTHLY, QUARTERLY, YEARLY)
├── period_start: date
├── period_end: date
│
├── budgeted_amount: decimal
├── spent_amount: decimal (actualizado automáticamente)
├── remaining_amount: decimal (calculado)
│
├── alert_threshold: decimal (% para alertar)
├── is_active: boolean
└── notes: string
```

---

## 2. Flujo de Gastos

### 2.1 Estados del Gasto

```
DRAFT → PENDING_APPROVAL → APPROVED → PAID
              ↓                ↓
          REJECTED         CANCELLED
```

### 2.2 Proceso de Registro

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE GASTOS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. REGISTRO (DRAFT)                                           │
│     ├── Seleccionar categoría                                  │
│     ├── Asignar centro de costos                               │
│     ├── Ingresar montos                                        │
│     └── Adjuntar comprobantes                                  │
│                                                                 │
│  2. ENVIAR A APROBACIÓN (PENDING_APPROVAL)                     │
│     ├── Validar contra presupuesto                             │
│     ├── Determinar aprobador según monto                       │
│     └── Notificar al aprobador                                 │
│                                                                 │
│  3. APROBACIÓN (APPROVED/REJECTED)                             │
│     ├── Revisar justificación y comprobantes                   │
│     ├── Aprobar o rechazar con motivo                          │
│     └── Si rechazado, vuelve a DRAFT                           │
│                                                                 │
│  4. PAGO (PAID)                                                │
│     ├── Seleccionar origen: Tesorería o Caja                   │
│     ├── Generar transacciones                                  │
│     └── Actualizar presupuesto                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Transacciones de Gasto

### 3.1 Pago desde Tesorería

```
Transaction (EXPENSE_ACCRUAL)
├── company_id: expense.company_id
├── branch_id: expense.branch_id
├── type: EXPENSE_ACCRUAL
├── reference_id: expense.id
├── reference_type: "Expense"
├── amount: expense.total
└── metadata: {
        cost_center_id: "uuid",
        category_id: "uuid",
        description: "Pago servicios luz",
        invoice_number: "F-123456"
    }

Transaction (EXPENSE_PAYMENT)
├── type: EXPENSE_PAYMENT
├── reference_id: expense.id
├── amount: expense.total
└── metadata: {
        payment_method: "TRANSFER",
        bank_account_id: "uuid",
        reference_number: "TRF-789"
    }
```

### 3.2 Pago desde Caja

```
Transaction (EXPENSE_ACCRUAL)
├── type: EXPENSE_ACCRUAL
├── amount: expense.total
└── metadata: {
        cost_center_id: "uuid",
        category_id: "uuid"
    }

Transaction (CASH_OUT)
├── type: CASH_OUT
├── amount: expense.total
└── metadata: {
        cash_session_id: "uuid",
        concept: "EXPENSE",
        expense_id: "uuid",
        recipient_name: "Proveedor ABC",
        voucher_number: "REC-001"
    }
```

### 3.3 Crédito Fiscal (si aplica)

Si el gasto tiene IVA recuperable:

```
Transaction (TAX_CREDIT)
├── type: TAX_CREDIT
├── reference_id: expense.id
├── reference_type: "Expense"
├── amount: expense.tax_amount
└── metadata: {
        invoice_number: "F-123456",
        supplier_tax_id: "76.123.456-7",
        tax_type: "IVA",
        tax_rate: 19,
        is_recoverable: true
    }
```

---

## 4. Workflow de Aprobación

### 4.1 Niveles de Aprobación

| Monto | Aprobador |
|-------|-----------|
| $0 - $100,000 | Supervisor de Sucursal |
| $100,001 - $500,000 | Gerente de Área |
| $500,001 - $1,000,000 | Gerente General |
| > $1,000,000 | Directorio |

### 4.2 ApprovalRule (Regla de Aprobación)

```
ApprovalRule
├── id: UUID
├── company_id: UUID
├── name: string
├── category_id: UUID (FK, nullable)
├── min_amount: decimal
├── max_amount: decimal
├── approver_role: enum (SUPERVISOR, MANAGER, DIRECTOR)
├── approver_user_id: UUID (FK, nullable) -- usuario específico
├── requires_second_approval: boolean
├── is_active: boolean
└── priority: integer
```

### 4.3 ApprovalLog (Historial de Aprobación)

```
ApprovalLog
├── id: UUID
├── expense_id: UUID (FK)
├── action: enum (SUBMITTED, APPROVED, REJECTED, ESCALATED)
├── user_id: UUID
├── comments: string
├── created_at: timestamp
└── metadata: JSON
```

---

## 5. Gestión de Presupuestos

### 5.1 Control Presupuestario

```
Al registrar gasto:

1. Buscar presupuesto aplicable:
   - cost_center_id + category_id + período actual
   - Si no existe, buscar solo cost_center_id + período

2. Validar disponibilidad:
   - Si spent + nuevo_gasto > budgeted → ALERTA
   - Si spent + nuevo_gasto > budgeted × (1 + tolerance) → BLOQUEO

3. Actualizar presupuesto:
   - Al aprobar: spent_amount += expense.total
```

### 5.2 Alertas de Presupuesto

| % Consumido | Nivel | Acción |
|-------------|-------|--------|
| < 70% | Normal | Sin alerta |
| 70% - 90% | Advertencia | Notificar responsable |
| 90% - 100% | Crítico | Notificar gerencia |
| > 100% | Sobrepasado | Bloquear + requiere autorización especial |

### 5.3 Consulta de Ejecución

```sql
SELECT 
    cc.name as cost_center,
    ec.name as category,
    b.budgeted_amount,
    b.spent_amount,
    b.budgeted_amount - b.spent_amount as remaining,
    ROUND(b.spent_amount / b.budgeted_amount * 100, 2) as execution_percent
FROM budgets b
JOIN cost_centers cc ON cc.id = b.cost_center_id
LEFT JOIN expense_categories ec ON ec.id = b.category_id
WHERE b.company_id = :company_id
  AND b.period_start <= CURRENT_DATE
  AND b.period_end >= CURRENT_DATE
  AND b.is_active = true
ORDER BY execution_percent DESC
```

---

## 6. Gastos Recurrentes

### 6.1 RecurringExpense (Gasto Recurrente)

```
RecurringExpense
├── id: UUID
├── company_id: UUID
├── branch_id: UUID
├── cost_center_id: UUID
├── category_id: UUID
├── supplier_id: UUID (nullable)
│
├── description: string
├── estimated_amount: decimal
├── frequency: enum (MONTHLY, QUARTERLY, YEARLY)
├── day_of_month: integer (1-28)
│
├── auto_approve: boolean (si monto está en rango)
├── is_active: boolean
├── next_due_date: date
└── last_generated_at: timestamp
```

### 6.2 Generación Automática

```
Job diario:

1. Buscar RecurringExpense donde next_due_date = TODAY

2. Por cada uno:
   - Crear Expense en estado DRAFT o PENDING_APPROVAL
   - Si auto_approve y monto <= límite → APPROVED
   - Actualizar next_due_date según frequency

3. Notificar responsables
```

---

## 7. Reportes de Gastos

### 7.1 Gastos por Centro de Costos

```sql
SELECT 
    cc.code,
    cc.name as cost_center,
    ec.name as category,
    COUNT(*) as expense_count,
    SUM(e.subtotal) as total_net,
    SUM(e.tax_amount) as total_tax,
    SUM(e.total) as total_gross
FROM expenses e
JOIN cost_centers cc ON cc.id = e.cost_center_id
JOIN expense_categories ec ON ec.id = e.category_id
WHERE e.company_id = :company_id
  AND e.status = 'PAID'
  AND e.date >= :start_date
  AND e.date <= :end_date
GROUP BY cc.id, cc.code, cc.name, ec.id, ec.name
ORDER BY cc.code, total_gross DESC
```

### 7.2 Comparativo vs Presupuesto

```sql
SELECT 
    cc.name as cost_center,
    b.budgeted_amount,
    COALESCE(SUM(e.total), 0) as actual_amount,
    b.budgeted_amount - COALESCE(SUM(e.total), 0) as variance,
    ROUND(COALESCE(SUM(e.total), 0) / b.budgeted_amount * 100, 2) as execution_pct
FROM budgets b
JOIN cost_centers cc ON cc.id = b.cost_center_id
LEFT JOIN expenses e ON e.cost_center_id = b.cost_center_id
    AND e.status = 'PAID'
    AND e.date BETWEEN b.period_start AND b.period_end
WHERE b.company_id = :company_id
  AND b.period_type = 'MONTHLY'
  AND b.period_start = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY cc.id, cc.name, b.budgeted_amount
ORDER BY variance ASC
```

### 7.3 Gastos Pendientes de Aprobación

```sql
SELECT 
    e.expense_number,
    e.description,
    e.total,
    ec.name as category,
    u.name as created_by,
    e.created_at,
    DATEDIFF(CURRENT_DATE, e.created_at) as days_pending
FROM expenses e
JOIN expense_categories ec ON ec.id = e.category_id
JOIN users u ON u.id = e.created_by
WHERE e.company_id = :company_id
  AND e.status = 'PENDING_APPROVAL'
ORDER BY e.created_at ASC
```

---

## 8. Reglas de Negocio

### 8.1 Validaciones al Crear

| Regla | Descripción |
|-------|-------------|
| Centro de costos activo | Solo centros activos |
| Categoría activa | Solo categorías activas |
| Monto positivo | total > 0 |
| Fecha válida | No futura (máx. hoy) |
| Presupuesto disponible | Advertir si excede |

### 8.2 Validaciones al Aprobar

| Regla | Descripción |
|-------|-------------|
| Tiene aprobador | Usuario con rol adecuado |
| Comprobante adjunto | Según política |
| Dentro de presupuesto | O autorización especial |
| No auto-aprobación | Creador ≠ Aprobador |

### 8.3 Validaciones al Pagar

| Regla | Descripción |
|-------|-------------|
| Estado aprobado | Solo gastos APPROVED |
| Fondos disponibles | Verificar saldo cuenta/caja |
| Sesión activa | Si pago desde caja |

---

## 9. Integración Contable

### 9.1 Cuentas Contables por Categoría

```
ExpenseCategory.metadata: {
    expense_account: "6.1.01.001",  // Cuenta de gasto
    tax_account: "1.1.08.001",      // IVA crédito
    payable_account: "2.1.01.001"   // Cuenta por pagar
}
```

### 9.2 Asiento Contable

Al registrar gasto:

```
DEBE:
  6.1.01.001 Gasto (subtotal)
  1.1.08.001 IVA Crédito (tax_amount) -- si recuperable

HABER:
  2.1.01.001 Cuenta por Pagar (total)

Al pagar:

DEBE:
  2.1.01.001 Cuenta por Pagar (total)

HABER:
  1.1.01.001 Banco/Caja (total)
```

---

📌 **Los gastos operativos afectan directamente el P&L y deben estar correctamente clasificados por centro de costos para análisis de rentabilidad.**
