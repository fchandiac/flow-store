# Catálogo de Entidades (`data/entities`)

Resumen de las entidades TypeORM definidas en `app/data/entities`, su tabla física y relaciones más relevantes.

## 1. Panorama General

| Entidad | Tabla | Relaciones de salida | Relacionada por |
|---------|-------|----------------------|-----------------|
| Attribute | attributes | — | ProductVariant.attributeValues (JSON)
| Audit | audits | `user` (N:1 User) | —
| Branch | branches | `company` (N:1 Company) | Storage, PointOfSale, Transaction
| CostCenter | cost_centers | `company`, `parent`, `branch` | Budget, OperationalExpense, Employee |
| ExpenseCategory | expense_categories | `company`, `defaultCostCenter` | OperationalExpense |
| CashSession | cash_sessions | `pointOfSale` (N:1 POS), `openedBy`/`closedBy` (N:1 User) | Transaction
| Category | categories | `parent` (N:1 Category) | Product
| Company | companies | — | Branch, Tax
| Customer | customers | `person` (N:1 Person) | Transaction
| Budget | budgets | `company`, `costCenter`, `createdBy` | Expense (accrual), Reporting |
| AccountingAccount | accounting_accounts | `company`, `parent` | AccountingRule, Reporting |
| AccountingRule | accounting_rules | `company`, `debitAccount`, `creditAccount`, `expenseCategory`, `tax` | Transaction postings |
| AccountingPeriod | accounting_periods | `company`, `closedBy` | Period close validations |
| Permission | permissions | `user` (N:1 User) | —
| Person | persons | — | Customer, Supplier, User
| PointOfSale | points_of_sale | `branch` (N:1 Branch) | CashSession, Transaction
| PriceList | price_lists | — | PriceListItem
| PriceListItem | price_list_items | `priceList` (N:1 PriceList), `product`, `productVariant` | —
| Product | products | `category` (N:1 Category), `baseUnit` (N:1 Unit) | ProductVariant, PriceListItem, TransactionLine
| ProductVariant | product_variants | `product` (N:1 Product), `unit` (N:1 Unit) | PriceListItem, TransactionLine
| Storage | storages | `branch` (N:1 Branch) | Transaction (por `storageId`/`targetStorageId`)
| Supplier | suppliers | `person` (N:1 Person) | Transaction
| OperationalExpense | operational_expenses | `company`, `branch`, `costCenter`, `category`, `supplier`, `employee`, `createdBy`, `approvedBy` | Budget, Cash flow, Approvals |
| TreasuryAccount | treasury_accounts | `company`, `branch` | CashSession, Payments |
| Tax | taxes | — | TransactionLine, Product.taxIds, ProductVariant.taxIds
| Transaction | transactions | `branch`, `pointOfSale`, `cashSession`, `customer`, `supplier`, `user`, `relatedTransaction` (todas N:1) | TransactionLine
| TransactionLine | transaction_lines | `transaction`, `product`, `productVariant`, `unit`, `tax` (todas N:1) | —
| Unit | units | `baseUnit` (N:1 Unit) | Product, ProductVariant, TransactionLine
| Employee | employees | `company`, `person`, `branch`, `costCenter`, `manager` | CashSession (operativa), Access control |
| User | users | `person` (N:1 Person) | Transaction, CashSession, Permission, Audit

> Nota: varios archivos almacenan IDs extras (ej. `storageId` en Transaction) sin definir la relación ORM inversa; aun así forman parte del modelo lógico.

## 2. Estructura Organizacional

### Company (`companies`)
- Raíz de la jerarquía corporativa.
- Referenciada por `Branch.companyId` y `Tax.companyId`.
- Configura moneda por defecto y parámetros contables.

### Branch (`branches`)
- Sucursal física o unidad de negocio.
- Relación N:1 con `Company`.
- Referenciada por `Storage`, `PointOfSale` y `Transaction` (ubicación de la operación).

### CostCenter (`cost_centers`)
- Estructura jerárquica para imputar gastos y asignar responsables.
- Relación N:1 con `Company`; autorelación por `parentId` para la jerarquía.
- Puede vincularse a una `Branch` para costeo por sucursal.
- Referenciado por `Budget`, `Employee` y flujos de gasto operativo.

### Storage (`storages`)
- Bodega o almacén asociado opcionalmente a una sucursal.
- Relación N:1 con `Branch`.
- `Transaction` utiliza `storageId` y `targetStorageId` para movimientos de inventario.

### PointOfSale (`points_of_sale`)
- Terminal o caja dentro de una sucursal.
- Relación N:1 con `Branch`.
- Fuente de `CashSession` y vínculo opcional en `Transaction`.

## 3. Personas y Seguridad

### Person (`persons`)
- Datos maestros de individuos o empresas.
- Referenciada por `Customer`, `Supplier` y opcionalmente `User`.

### Customer (`customers`)
- Cliente vinculado a una `Person`.
- Relación N:1 con `Person`.
- Referenciado por `Transaction` para ventas y créditos.

### Supplier (`suppliers`)
- Proveedor vinculado a una `Person`.
- Relación N:1 con `Person`.
- Referenciado por `Transaction` para compras y gastos.

### Employee (`employees`)
- Representa al trabajador interno enlazado a `Person`.
- Relación N:1 con `Company`, `Person`, `Branch` y `CostCenter`.
- Controla tipo de contratación, estado laboral y jerarquía (`reportsToId`).
- Base para integraciones con `CashSession`, permisos y nómina.

### User (`users`)
- Usuario de aplicación asociado opcionalmente a una `Person`.
- Referenciado por `Transaction` (usuario emisor), `CashSession` (aperturas/cierres) y `Permission`.

### Permission (`permissions`)
- Permiso granular ligado a un `User`.
- Restringe capacidades funcionales; usa enum `Ability`.

### Audit (`audits`)
- Registro histórico de acciones.
- Relación N:1 con `User` (actor) cuando existe.

## 4. Catálogo e Inventario

### Category (`categories`)
- Árbol jerárquico para clasificar productos.
- Relación N:1 consigo misma mediante `parent`.
- Referenciada por `Product`.

### Attribute (`attributes`)
- Define atributos configurables (color, talla, etc.).
- No tiene relaciones ORM directas; `ProductVariant.attributeValues` guarda referencias por ID.

### Unit (`units`)
- Unidad de medida con autorelación (`baseUnit`).
- Referenciada por `Product.baseUnitId`, `ProductVariant.unitId` y `TransactionLine.unitId`.

### Product (`products`)
- Maestro del catálogo.
- Relación N:1 con `Category` y `Unit` (unidad base).
- Referenciado por `ProductVariant`, `PriceListItem` y `TransactionLine`.

### ProductVariant (`product_variants`)
- SKU concreto con precios, impuestos y stock.
- Relación N:1 con `Product` y `Unit` (eager).
- Referenciada por `PriceListItem` y `TransactionLine`.

### Storage & Inventory Context
- Aunque `StockLevel` es calculado, las transacciones usan `storageId` para afectar inventario.

## 5. Precios e Impuestos

### PriceList (`price_lists`)
- Lista de precios con prioridades y vigencia.
- Referenciada por `PriceListItem`.

### PriceListItem (`price_list_items`)
- Precio particular por lista, producto y variante.
- Relaciones N:1 con `PriceList`, `Product` y `ProductVariant`.
- Guarda impuestos adicionales (`taxIds`).

### Tax (`taxes`)
- Impuesto por compañía.
- Referenciado por `TransactionLine.taxId` y arrays `taxIds` en `Product`/`ProductVariant`.

## 6. Finanzas Operativas

### Budget (`budgets`)
- Controla montos aprobados por `CostCenter` y período.
- Relación N:1 con `Company`, `CostCenter` y `User` (`createdBy`).
- Campos `budgetedAmount`/`spentAmount` usan CLP enteros para facilitar reporting.
- Versiona presupuestos mediante `status` y `version`.

### ExpenseCategory (`expense_categories`)
- Catálogo de tipos de gasto operativo por compañía.
- Relación N:1 con `Company`; puede sugerir un `CostCenter` por defecto.
- Define reglas de aprobación (`requiresApproval`, `approvalThreshold`).
- Usado por `OperationalExpense` para clasificación y reporting.

### OperationalExpense (`operational_expenses`)
- Registro maestro del gasto operativo (OPEX) previo a su contabilización.
- Relación N:1 con `Company`, `CostCenter`, `ExpenseCategory`; enlaces opcionales a `Branch`, `Supplier`, `Employee`.
- Controla flujo de aprobación vía `status`, `approvedBy` y `approvedAt`.
- `metadata` almacena datos complementarios (monto estimado, comprobantes, notas).

### TreasuryAccount (`treasury_accounts`)
- Catálogo de cuentas de tesorería corporativa.
- Relación N:1 con `Company` y opcional con `Branch` para distinguir cuentas locales.
- Usa los enums `TreasuryAccountType`, `BankName` y `AccountTypeName` para estandarizar cartera de bancos.
- `metadata` permite notas adicionales; integra con flujos de caja y pagos.

### AccountingAccount (`accounting_accounts`)
- Plan de cuentas contable jerárquico por compañía.
- Relación N:1 con `Company` y autorelación `parentId` para agrupar subcuentas.
- El enum `AccountType` clasifica la cuenta (activo, pasivo, patrimonio, ingreso, gasto).
- Clave única por compañía y código (`code`).

### AccountingRule (`accounting_rules`)
- Motor de reglas que define cómo mapear transacciones y líneas a cuentas contables.
- Relación N:1 con `Company`, `AccountingAccount` (debe/haber) y asociaciones opcionales a `ExpenseCategory` y `Tax`.
- Filtra por `RuleScope`, `transactionType`, `paymentMethod` u otros campos para aplicar la regla adecuada.
- `priority` permite ordenar la evaluación; `isActive` habilita/deshabilita reglas sin eliminarlas.

### AccountingPeriod (`accounting_periods`)
- Controla la apertura y cierre de períodos contables.
- Relación N:1 con `Company`; opcional con `User` que realiza el cierre (`closedBy`).
- Enum `AccountingPeriodStatus` define estados `OPEN`, `CLOSED`, `LOCKED`.
- Almacena fechas de inicio/fin y timestamp de cierre para auditoría.

## 7. Punto de Venta y Caja

### CashSession (`cash_sessions`)
- Apertura/cierre de caja.
- Relaciones N:1 con `PointOfSale`, `User` (abrió/cerró).
- Referenciada por `Transaction.cashSessionId`.

## 8. Transacciones

### Transaction (`transactions`)
- Entidad central e inmutable.
- Relaciones N:1 con `Branch`, `PointOfSale`, `CashSession`, `Customer`, `Supplier`, `User` y consigo misma (`relatedTransaction`).
- Campos auxiliares: `storageId`, `targetStorageId`, `metadata`, `paymentMethod`, `amountPaid`.

### TransactionLine (`transaction_lines`)
- Detalle inmutable de cada transacción.
- Relaciones N:1 con `Transaction`, `Product`, `ProductVariant`, `Unit` y `Tax`.
- Conserva snapshot de precios, cantidades y descuentos.

## 9. Enumeraciones Compartidas

- `unit-dimension.enum.ts`: dimensiones físicas para `Unit.dimension`.
- `Transaction.ts`: enum `TransactionType`, `TransactionStatus`, `PaymentMethod`.
- `CashSession.ts`: enum `CashSessionStatus`.
- `CostCenter.ts`: enum `CostCenterType`.
- `Budget.ts`: enums `BudgetCurrency`, `BudgetStatus`.
- `OperationalExpense.ts`: enum `OperationalExpenseStatus`.
- `TreasuryAccount.ts`: enum `TreasuryAccountType`.
- `AccountingAccount.ts`: enum `AccountType`.
- `AccountingRule.ts`: enum `RuleScope`.
- `AccountingPeriod.ts`: enum `AccountingPeriodStatus`.
- `Supplier.ts`: enum `SupplierType`.
- `Person.ts`: enums `PersonType`, `DocumentType`, `AccountTypeName`, `BankName`.
- `Employee.ts`: enums `EmploymentType`, `EmployeeStatus`.
- `PriceList.ts`: enum `PriceListType`.
- `Audit.ts`: enum `AuditActionType` (importado desde `audit.types`).
- `Permission.ts`: enum `Ability` con mapa completo de permisos.

## 10. Mapa Conceptual Simplificado

```
Company ──< {Branch, CostCenter, TreasuryAccount, AccountingAccount, AccountingPeriod}
              │          │             │                │
              │          ├──< ExpenseCategory           └──< AccountingRule
              │          ├──< Budget                         │
              │          └──< OperationalExpense             └──< {AccountingAccount, ExpenseCategory, Tax}
                                      │
                                      └──< {ExpenseCategory, Supplier, Employee}
              └──< {Storage, PointOfSale}
                               │
                               └──< CashSession ──< Transaction >── TransactionLine
                                                           │            │
Person ──< {Customer, Supplier, User, Employee}             │            └──< {Product, ProductVariant, Unit, Tax}
                                                           │
PriceList ──< PriceListItem >── {Product, ProductVariant}
Product ──< ProductVariant
Category ──< Product
Unit ──< Unit (base/derivada)
```

Este documento puede servir como punto de partida para analizar flujos de datos o diseñar nuevos procesos alrededor de las entidades existentes.
