# Mapa de Entidades: Gastos Operativos (OPEX)

Este documento resume las entidades involucradas en la gestion de gastos operativos y sus relaciones clave.

## 1. Entidades maestras

### CostCenter
- Identifica unidades de gasto por compania, rama y jerarquia (parent_id).
- Relaciona con `Company`, `Branch` y otros `CostCenter` (autorelacion).
- Aporta contexto para `Expense`, `Budget` y `RecurringExpense`.

### ExpenseCategory
- Clasifica los gastos y define si requieren aprobacion.
- Relaciona con `Company` y opcionalmente con un `CostCenter` por defecto.
- Determina cuentas contables (metadata) y participa en `Budget`, `Expense`, `ApprovalRule` y `RecurringExpense`.

### Supplier
- Referenciado por `Expense` y `RecurringExpense` cuando el gasto proviene de un proveedor.

### Company y Branch
- `Company` es la raiz de todos los registros.
- `Branch` delimita alcance geografico/operativo para `CostCenter`, `Expense`, `Budget` y `RecurringExpense`.

## 2. Entidades operativas

### Expense
- Registro principal del gasto.
- Relaciona con `Company`, `Branch`, `CostCenter`, `ExpenseCategory` y opcionalmente `Supplier`.
- Almacena montos, impuestos, origen de pago (`payment_source`) y referencia de caja (`cash_session_id`).
- Se vincula con `ApprovalLog`, `Transaction` y actualiza `Budget` al aprobarse.

### ApprovalRule
- Define quien aprueba segun tramo de monto o categoria.
- Relaciona con `Company`, `ExpenseCategory`, roles de aprobador y opcionalmente un `User` especifico.

### ApprovalLog
- Historial de cambios de estado del gasto.
- Relaciona con `Expense` (FK) y `User` (quien realizo la accion).

### Budget
- Define limites de gasto por cost center (y opcionalmente categoria) para un periodo.
- Relaciona con `Company`, `Branch`, `CostCenter` y `ExpenseCategory`.
- Actualiza sus montos al aprobar gastos asociados.

### RecurringExpense
- Plantilla para generar gastos recurrentes.
- Relaciona con `Company`, `Branch`, `CostCenter`, `ExpenseCategory` y opcionalmente `Supplier`.
- El job diario genera `Expense` nuevos y actualiza `next_due_date`.

## 3. Entidades de soporte

### Transaction
- Registra impactos financieros: accrual, pago, caja, credito fiscal.
- Relaciona con `Expense` via `reference_id` y `metadata` (cost_center, categoria, comprobantes).
- Usa `cash_session_id` cuando el origen es caja en lugar de tesoreria.

### CashSession
- Referencia la caja abierta desde la cual se realizan pagos (`Expense.metadata.cash_session_id`).

### User
- Participa como creador, aprobador y registrador en `Expense`, `ApprovalLog` y `ApprovalRule`.

## 4. Resumen de relaciones

| Origen | Relacion | Destino | Cardinalidad | Notas |
|--------|----------|---------|--------------|-------|
| Company | tiene | CostCenter | 1:N | Cada cost center pertenece a una compania |
| Company | tiene | ExpenseCategory | 1:N | Categorias configuradas por compania |
| Company | tiene | Budget | 1:N | Presupuestos por periodo |
| Company | tiene | RecurringExpense | 1:N | Plantillas recurrentes |
| Company | tiene | ApprovalRule | 1:N | Politicas de aprobacion |
| Branch | agrupa | CostCenter | 1:N | Cost centers por sucursal o corporativo |
| Branch | agrupa | Expense y Budget | 1:N | Gasto y presupuesto por sucursal |
| CostCenter | se relaciona con | CostCenter | 1:N | Jerarquia via `parent_id` |
| CostCenter | recibe | Expense | 1:N | Cada gasto apunta a un cost center |
| CostCenter | limita | Budget | 1:N | Presupuesto por centro |
| ExpenseCategory | clasifica | Expense | 1:N | Categoriza cada gasto |
| ExpenseCategory | agrupa | Budget | 1:N | Presupuesto por categoria (opcional) |
| ExpenseCategory | determina | ApprovalRule | 1:N | Tramos por categoria |
| Expense | genera | Transaction | 1:N | Accrual, pago, caja, credito |
| Expense | registra | ApprovalLog | 1:N | Historial de decisiones |
| Expense | usa | Supplier | N:1 | Gasto puede vincular proveedor |
| Expense | impacta | Budget | N:1 | Actualiza spent al aprobar |
| Expense | puede usar | CashSession | N:1 | Cuando pago proviene de caja |
| Expense | puede originarse en | RecurringExpense | N:1 | Plantilla recurrente |
| RecurringExpense | crea | Expense | 1:N | Job genera gastos | 
| ApprovalRule | usa | User | N:1 | Aprobar por usuario especifico |
| ApprovalLog | registra | User | N:1 | Quien realizo la accion |
| Transaction | referencia | Expense | N:1 | `reference_type = Expense` |

## 5. Flujo resumido

1. Se configura la estructura base (`CostCenter`, `ExpenseCategory`, `Budget`, `ApprovalRule`).
2. Un usuario registra un `Expense` asignando categoria y centro de costos.
3. El sistema valida presupuesto y envia a aprobacion segun reglas.
4. Las acciones se guardan en `ApprovalLog` y actualizan el estado del gasto.
5. Al aprobarse, se crean `Transaction` de accrual y, al pagar, de pago o caja.
6. Si aplica IVA recuperable, se agrega una `Transaction` de tipo `TAX_CREDIT`.
7. `Budget.spent_amount` se incrementa y `Expense` puede quedar pagado desde tesoreria o caja activa.
8. Jobs de `RecurringExpense` generan nuevos gastos conforme al calendario definido.

## 6. Consideraciones de integracion

- Las cuentas contables viven en `ExpenseCategory.metadata` y se consumen al generar `Transaction`.
- `Expense.metadata.attachments` mantiene enlaces a comprobantes digitales.
- `Expense.metadata.cash_session_id` conecta con flujos de caja y conciliacion.
- Validaciones de negocio (actividad, presupuesto, roles) se aplican antes de cambiar estados.
