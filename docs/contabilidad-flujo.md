# Flujo Contable Completo

Este documento describe el circuito contable actual de FlowStore considerando las transacciones definidas en el dominio, las entidades involucradas y la forma en que se generan los asientos de doble entrada.

---

## 1. Objetivo general

1. Registrar cada evento de negocio como una `Transaction` inmutable.
2. Guardar el detalle operacional en `TransactionLine` cuando aplica (productos, impuestos, cantidades).
3. Resolver las cuentas contables afectadas mediante `AccountingRule`.
4. Generar asientos de doble entrada en memoria con el motor `AccountingEngine` para poblar reportes, balances y libros.
5. Agrupar los movimientos por `AccountingPeriod` para bloquear modificaciones retroactivas cuando corresponda.

---

## 2. Entidades clave

| Entidad | Rol en el flujo |
|---------|-----------------|
| `Transaction` | Registro maestro. Contiene tipo de transaccion, totales, referencias de sucursal, centro de costo, usuario, categoria de gasto, metodo de pago y metadatos (incluye payroll para remuneraciones). |
| `TransactionLine` | Detalle de productos o impuestos por linea. Se usa para reglas contables con alcance `TRANSACTION_LINE` (por ejemplo IVA linea a linea). |
| `AccountingAccount` | Plan de cuentas base (semilla chilena SII). Cada cuenta lleva `code`, `name`, `type` y relacion padre/hijo. |
| `AccountingRule` | Mapea tipo de transaccion (y opcionalmente metodo de pago, impuesto o categoria de gasto) a cuentas Debe/Haber. Pueden operar a nivel de transaccion completa o linea. |
| `AccountingPeriod` | Define ventanas de fechas que agrupan transacciones. Estados: `OPEN`, `CLOSED`, `LOCKED`. No se permiten traslapes. |
| `AccountingEngine` | Servicio que aplica reglas sobre transacciones confirmadas para producir `LedgerPosting` (asientos en memoria) y totales por cuenta. |
| `ExpenseCategory` y `CostCenter` | Contexto adicional para transacciones de gasto operativo o pago. Se usan para filtrar reglas y reportes. |
| `Tax` | Define IVA u otros impuestos para lineas. Las reglas pueden diferenciar por `taxId`. |

---

## 3. Ciclo contable paso a paso

1. **Evento operacional**: una UI o accion de servidor crea la transaccion (`Transaction`). Ejemplos actuales: gasto operativo (`createOperatingExpense`), seeds de ventas/compras, scripts de sincronizacion.
2. **Persistencia inmutable**: la transaccion se guarda con estado `CONFIRMED`. Correcciones se registran con una nueva transaccion ligada por `relatedTransactionId` (ej: notas de credito) cuando se implemente.
3. **Lineas opcionales**: si la operacion tiene productos o impuestos, se crean `TransactionLine` con snapshot de SKU, precio, impuesto y totales.
4. **Resolucion de reglas**: el motor carga todas las `AccountingRule` activas de la empresa y las separa por alcance (`TRANSACTION` vs `TRANSACTION_LINE`).
5. **Aplicacion de reglas**:
   - Se filtran transacciones confirmadas por los tipos presentes en reglas.
   - Para cada transaccion se evalua si cumple condiciones (metodo de pago, categoria, impuesto, metadata).
   - Se calcula el monto base: subtotal para ventas y devoluciones, total para el resto. Las devoluciones invierten el signo.
   - Por cada regla se generan dos `LedgerPosting`: uno al Debe y otro al Haber, manteniendo doble entrada.
   - Las reglas de linea suman impuestos o subtotales segun coincidencia `taxId` en `TransactionLine`.
6. **Construccion de libro mayor**: el motor acumula saldos por cuenta (`balanceByAccount`) y expone los postings para reportes (`getLedgerPreview`, `getAccountingHierarchy`).
7. **Períodos contables**: la UI de periodos permite abrir ventanas sin traslapes. Al crear un periodo (`createAccountingPeriod`) se valida que las fechas no se superpongan. El cierre/bloqueo se implementara sobre `AccountingPeriod.status`.

---

## 4. Tipos de transaccion soportados

La enum `TransactionType` define los eventos posibles. Los siguientes estan activos o planificados con reglas:

| Tipo | Modulo/Origen habitual | Descripcion operativa | Regla contable actual (Debe -> Haber) |
|------|------------------------|------------------------|----------------------------------------|
| `SALE` | Futuro modulo de ventas / seeds | Venta confirmada a cliente. | `Caja General` o `Instituciones Financieras` (segun metodo) -> `Ventas de Mercaderias`. IVA se lleva a `IVA Debito Fiscal`. |
| `SALE_RETURN` | Notas de credito | Devuelve mercaderia al cliente. Invierte montos de `SALE`. | `Ventas de Mercaderias` -> `Caja/Bancos`. Ita reversion. |
| `PURCHASE` | Recepcion de compra, seeds | Compra a proveedor. | `Existencias (Inventario)` -> `Instituciones Financieras`. IVA credito a `IVA Credito Fiscal`. |
| `PURCHASE_RETURN` | Devolucion a proveedor | Reversa parcial de compra. | Reglas espejo de `PURCHASE` (pendiente de semilla). |
| `OPERATING_EXPENSE` | UI de gastos operativos / RRHH | Pago directo de gastos administrativos o remuneraciones. | `Gastos Generales` (o cuenta segun regla futura) -> `Caja General` / `Instituciones Financieras` segun metodo. |
| `PAYMENT_OUT` | Pagos programados (ej: proveedores, honorarios) | Salida de caja/banco asociada a categoria de gasto. | Misma logica de `OPERATING_EXPENSE`, diferenciada por `expenseCategory`. |
| `PAYMENT_IN` | Cobros de clientes | Entrada de caja/banco (a implementar). | Regla pendiente: `Caja/Bancos` -> cuenta puente o `Clientes`. |
| `TRANSFER_OUT` / `TRANSFER_IN` | Traslados de bodega | Mueven stock entre almacenes. | Aun sin reglas contables porque no cambia patrimonio (solo control logistico). |
| `ADJUSTMENT_IN` / `ADJUSTMENT_OUT` | Ajustes de inventario | Regulariza diferencias fisicas. | Pendiente: se definira contra `Gastos por merma` o `Inventario`. |
| `PURCHASE_ORDER` | Orden de compra | Documento no contable (planificacion). | No genera asiento. |

> Nota: Aunque algunas reglas espejo aun no se cargan en la semilla, el flujo esta preparado para incorporarlas creando `AccountingRule` con los codigos del plan de cuentas.

---

## 5. Reglas contables actuales (semilla FlowStore)

Estas reglas se cargan en `seed-flowstore.ts`.

### 5.1 Ventas

| Evento | Metodo pago | Debe | Haber |
|--------|-------------|------|-------|
| Venta de contado (`SALE`) | `CASH` | `1.1.01 Caja General` | `4.1.01 Ventas de Mercaderias` |
| Venta via tarjeta (`SALE`) | `CREDIT_CARD` / `DEBIT_CARD` / `TRANSFER` | `1.1.02 Instituciones Financieras (Bancos)` | `4.1.01 Ventas de Mercaderias` |
| IVA venta (`SALE` line rule) | N/A | `1.1.01 Caja General` | `2.1.02 IVA Debito Fiscal (19%)` |

### 5.2 Compras

| Evento | Metodo pago | Debe | Haber |
|--------|-------------|------|-------|
| Compra (`PURCHASE`) | `TRANSFER` | `1.1.04 Existencias (Inventario)` | `1.1.02 Instituciones Financieras (Bancos)` |
| IVA compra (`PURCHASE` line rule) | N/A | `1.1.05 IVA Credito Fiscal (19%)` | `1.1.04 Existencias (Inventario)` |

### 5.3 Gastos y pagos

| Evento | Metodo pago | Debe | Haber |
|--------|-------------|------|-------|
| Gasto operativo (`OPERATING_EXPENSE`) | `CASH` | `5.2.03 Gastos Generales` | `1.1.01 Caja General` |
| Gasto operativo (`OPERATING_EXPENSE`) | `TRANSFER` / `DEBIT_CARD` / `CREDIT_CARD` | `5.2.03 Gastos Generales` | `1.1.02 Instituciones Financieras (Bancos)` |
| Pago programado (`PAYMENT_OUT`) | `CASH` | `5.x Categoria ligada` (por ahora `Gastos Generales`) | `1.1.01 Caja General` |
| Pago programado (`PAYMENT_OUT`) | Transferencias / tarjetas | `5.x Categoria ligada` | `1.1.02 Instituciones Financieras (Bancos)` |

> En `PAYMENT_OUT` la categoria de gasto (`ExpenseCategory`) se usa para seleccionar reglas especificas. Actualmente todas apuntan a `Gastos Generales`, pero el modelo permite asignar otras cuentas Debe segun el catalogo.

---

## 6. Periodos contables y bloqueo

1. **Creacion**: `CreateAccountingPeriodDialog` valida que `startDate` y `endDate` no se solapen con periodos existentes. Sugiere el mes siguiente al ultimo periodo cerrado.
2. **Estados**:
   - `OPEN`: acepta nuevas transacciones (estado inicial).
   - `CLOSED`: transacciones congeladas; se prepara el resumen.
   - `LOCKED`: bloqueo duro posterior a auditoria; la regla `getStatusInfo` en UI muestra badges.
3. **Relacion con asientos**: los postings generan fecha a partir de `Transaction.createdAt`. Para reconteos por periodo se filtra por rango de fechas. Cuando un periodo se bloquea se espera impedir nuevas transacciones en ese rango (logica pendiente de enforcement).

---

## 7. Metadata y casos particulares

- **Remuneraciones**: `createOperatingExpense` adjunta `metadata.payroll` con tipo (`salary` o `advance`), colaborador asociado y salario base. Esto permite distinguir cargas en el libro contable o generar anexos de RRHH.
- **Cost centers**: tanto `Transaction.costCenterId` como la informacion en metadata ayudan a segmentar resultados por area (por ejemplo `OPS-MALL`).
- **Notas y referencias externas**: campos `notes` y `externalReference` se trasladan al detalle del asiento para trazabilidad.
- **Usuarios**: `Transaction.userId` apunta al usuario que registró la operacion. Se usa en reportes y auditoria.

---

## 8. Tareas pendientes y extensiones

1. **Reglas espejo**: agregar reglas para `SALE_RETURN`, `PURCHASE_RETURN`, ajustes de inventario y cobros (`PAYMENT_IN`).
2. **Persistencia de asientos**: actualmente el libro mayor se calcula on-demand. Si se requiere historico firmado se puede persistir `LedgerPosting` en tabla dedicada.
3. **Bloqueo por periodo**: añadir validaciones al crear transacciones para rechazar fechas en periodos `LOCKED`.
4. **Mapeo de categorias a cuentas especificas**: extender `AccountingRule` para que cada `ExpenseCategory` debite la cuenta 5.x adecuada (sueldos, honorarios, marketing, etc.).
5. **Integracion con libros fiscales**: cruzar los postings de IVA con los libros de compra/venta descritos en `docs/gestion-fiscal.md` para generar declaraciones.

---

## 9. Resumen ejecutivo

- El plan de cuentas base chileno se instala via seed y garantiza codigos estandar 1.x a 5.x.
- Todas las transacciones se registran como entidades inmutables y se resuelven en asientos mediante reglas configurables.
- El motor contable opera en memoria, produciendo doble entrada consistente y saldos agregados.
- La UI de periodos contables evita solapamientos y prepara el terreno para cierres mensuales y bloqueo de ajustes.
- La extensibilidad se centra en agregar nuevas reglas y transacciones sin modificar el nucleo del flujo.
