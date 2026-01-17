# Flujo Contable por Tipo de Transacción

Este documento resume cómo cada `Transaction` confirmada en FlowStore genera asientos de doble entrada a partir de las `AccountingRule` definidas en la semilla (`data/seed/seed-flowstore.ts`). La intención es que, según el tipo de movimiento, pueda identificarse rápidamente qué cuenta se debita y cuál se acredita.

---

## Cuentas involucradas en las reglas vigentes

| Código | Nombre | Tipo | Uso dentro del flujo |
|--------|--------|------|----------------------|
| 1.1.01 | Caja General | Activo | Caja física y arqueos de sucursales. |
| 1.1.02 | Instituciones Financieras (Bancos) | Activo | Cuentas bancarias corrientes. |
| 1.1.03 | Clientes (Cuentas por Cobrar) | Activo | Reservada para futuros flujos de crédito. |
| 1.1.04 | Existencias (Inventario) | Activo | Valor de stock disponible. |
| 1.1.05 | IVA Crédito Fiscal (19%) | Activo | IVA recuperable proveniente de compras. |
| 2.1.01 | Proveedores (Cuentas por Pagar) | Pasivo | Deudas con proveedores. |
| 2.1.02 | IVA Débito Fiscal (19%) | Pasivo | IVA por ventas. |
| 4.1.01 | Ventas de Mercaderías | Ingreso | Reconocimiento de ingresos por ventas. |
| 4.2.02 | Ganancia por Ajustes de Inventario | Ingreso | Resultado de ajustes positivos. |
| 5.1.02 | Pérdida por Ajustes de Inventario | Gasto | Resultado de ajustes negativos. |
| 5.2.03 | Gastos Generales | Gasto | Gastos operativos directos. |

---

## Reglas contables activas por tipo de transacción

Las reglas se evalúan únicamente sobre transacciones con estado `CONFIRMED`. Para cada regla se detalla el monto base utilizado.

### 1. Ventas (`SALE`)

| Condición | Monto base | Debe | Haber |
|-----------|------------|------|-------|
| Método de pago `CASH` | Subtotal (sin IVA) | 1.1.01 Caja General | 4.1.01 Ventas de Mercaderías |
| Método de pago `CREDIT_CARD` | Subtotal | 1.1.02 Instituciones Financieras | 4.1.01 Ventas de Mercaderías |
| Método de pago `DEBIT_CARD` | Subtotal | 1.1.02 Instituciones Financieras | 4.1.01 Ventas de Mercaderías |
| Método de pago `TRANSFER` | Subtotal | 1.1.02 Instituciones Financieras | 4.1.01 Ventas de Mercaderías |
| Línea con impuesto `IVA-19` | Monto de impuesto por línea | 1.1.01 Caja General | 2.1.02 IVA Débito Fiscal |

> Las líneas convierten al Debe/Haber según el tipo de impuesto configurado. Si se agrega otro impuesto bastará con crear la regla equivalente.

### 2. Compras (`PURCHASE`)

| Condición | Monto base | Debe | Haber |
|-----------|------------|------|-------|
| Regla de transacción | Total (incluye IVA) | 1.1.04 Existencias (Inventario) | 2.1.01 Proveedores |
| Línea con impuesto `IVA-19` | Monto de impuesto por línea | 1.1.05 IVA Crédito Fiscal | 2.1.01 Proveedores |

> El crédito a `Proveedores` acumula el total adeudado. Los pagos posteriores se contabilizan con `PAYMENT_OUT`.

### 3. Ajustes de inventario (`ADJUSTMENT_IN` / `ADJUSTMENT_OUT`)

| Tipo | Monto base | Debe | Haber |
|------|------------|------|-------|
| `ADJUSTMENT_IN` | Costo unitario valorizado (PMP o costo base) × cantidad | 1.1.04 Existencias (Inventario) | 4.2.02 Ganancia por Ajustes de Inventario |
| `ADJUSTMENT_OUT` | Costo unitario valorizado × cantidad | 5.1.02 Pérdida por Ajustes de Inventario | 1.1.04 Existencias (Inventario) |

> La acción `adjustVariantStockLevel` consolida un costo para cada ajuste usando el PMP disponible; si no existe, se usa el costo base de la variante.

### 4. Gastos operativos (`OPERATING_EXPENSE`)

| Método de pago | Monto base | Debe | Haber |
|----------------|------------|------|-------|
| `CASH` | Total | 5.2.03 Gastos Generales | 1.1.01 Caja General |
| `TRANSFER` | Total | 5.2.03 Gastos Generales | 1.1.02 Instituciones Financieras |
| `DEBIT_CARD` | Total | 5.2.03 Gastos Generales | 1.1.02 Instituciones Financieras |
| `CREDIT_CARD` | Total | 5.2.03 Gastos Generales | 1.1.02 Instituciones Financieras |

> La categoría de gasto (`ExpenseCategory`) todavía no direcciona a cuentas específicas; todas cargan a Gastos Generales.

### 5. Pagos a proveedores (`PAYMENT_OUT`)

| Método de pago | Monto base | Debe | Haber |
|----------------|------------|------|-------|
| `CASH` | Total | 2.1.01 Proveedores | 1.1.01 Caja General |
| `TRANSFER` | Total | 2.1.01 Proveedores | 1.1.02 Instituciones Financieras |

> Los pagos rebajan la cuenta por pagar generada en compras u obligaciones manuales. Puede ampliarse con reglas específicas por categoría si se requiere control adicional.

### 6. Depósitos de caja (`CASH_DEPOSIT`)

| Condición | Monto base | Debe | Haber |
|-----------|------------|------|-------|
| Regla de transacción | Total | 1.1.02 Instituciones Financieras | 1.1.01 Caja General |

> Se utiliza cuando se traslada efectivo físico al banco.

---

## Tipos de transacción sin asiento automático

Los siguientes tipos existen en el dominio pero aún no tienen reglas activas en la semilla:

- `SALE_RETURN`, `PURCHASE_RETURN`: faltan reglas espejo para revertir ventas o compras.
- `PAYMENT_IN`: no se ha mapeado el flujo de cobranza a cuentas por cobrar o ingresos diferidos.
- `TRANSFER_IN`, `TRANSFER_OUT`, `PURCHASE_ORDER`: se consideran movimientos logísticos (no contables) o documentos preparatorios.
- Métodos de pago `CHECK`, `CREDIT`, `MIXED`: requieren definir cuentas puente antes de habilitarlos.
- `CASH_SESSION_OPENING`: registra la apertura de caja y detalla la sesión en `metadata`, pero aún no se generan asientos automáticos.
- `CASH_SESSION_WITHDRAWAL`: refleja retiros manuales de efectivo; ajusta `expectedAmount` de la sesión pero no dispara asientos.

Al ejecutar el motor contable, estas transacciones simplemente no generan `LedgerPosting` hasta que se creen reglas correspondientes.

---

## Notas sobre el cálculo de montos

- Las reglas de alcance `TRANSACTION` usan el **total** de la transacción, salvo ventas y devoluciones, que emplean el **subtotal** para separar el IVA.
- Las reglas `TRANSACTION_LINE` acumulan el importe de cada línea coincidente con el impuesto (`taxId`).
- El signo del monto se invierte automáticamente en devoluciones (`SALE_RETURN`, `PURCHASE_RETURN`) cuando existan reglas para esos tipos.
- El motor `AccountingEngine` genera dos apuntes por regla (Debe y Haber) y consolida los saldos en `balanceByAccount`.

---

## Próximos pasos recomendados

1. Crear reglas espejo para devoluciones (`SALE_RETURN`, `PURCHASE_RETURN`) y cobranzas (`PAYMENT_IN`).
2. Afinar las reglas de IVA de venta para acreditar bancos cuando la forma de pago no sea efectivo.
3. Mapear categorías de gasto (`ExpenseCategory`) a cuentas 5.x específicas para obtener reportes granularizados.
4. Documentar cualquier nueva regla contable y validar el flujo resultante con un asiento de prueba antes de moverlo a producción.
