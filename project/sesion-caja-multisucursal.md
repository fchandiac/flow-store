# Documentación Técnica: Sesión de Caja y Gestión Multi-Sucursal

La Sesión de Caja es la entidad de control que encapsula todos los movimientos financieros en el punto de venta (POS). En un entorno de **Múltiples Sucursales**, este modelo asegura que cada sede opere de forma independiente pero consolidada.

---

## 1. Ciclo de Vida de la Sesión

Una sesión de caja debe transitar por estados obligatorios para garantizar la integridad de los datos.

### 1.1 Estados de la Sesión

| Estado | Descripción |
|--------|-------------|
| `OPEN` | Estado activo donde se permiten ventas y movimientos |
| `CLOSED` | El cajero ha declarado el conteo físico; no se permiten más transacciones |
| `RECONCILED` | Un supervisor ha validado descuadres y la sesión queda bloqueada permanentemente |

```
OPEN → CLOSED → RECONCILED
```

> ⚠️ Una vez `RECONCILED`, la sesión es **inmutable**.

---

## 2. Estructura Jerárquica Multi-Sucursal

### 2.1 Niveles de Organización

| Nivel | Entidad | Descripción |
|-------|---------|-------------|
| 1 | `Company` | Empresa/Holding - Entidad global que consolida reportes financieros |
| 2 | `Branch` | Sucursal - Entidad con autonomía operativa e inventario propio |
| 3 | `PointOfSale` | PDV/Terminal - Dispositivo físico o caja específica |
| 4 | `CashSession` | El turno de trabajo de un empleado en un PDV específico |

**Jerarquía:**

```
Company
└── Branch (Sucursal)
    └── PointOfSale (Terminal/Caja)
        └── CashSession (Turno)
```

---

## 3. Gastos Operativos desde Caja (OPEX)

El administrador puede autorizar pagos de gastos directamente con dinero de la sesión activa. Esto impacta tanto la **liquidez de la caja** como el **estado de resultados**.

### 3.1 Transacciones de Gasto en Caja

Para mantener la separación entre devengado y percibido, un gasto por caja genera un **par transaccional**:

#### EXPENSE_ACCRUAL (Reconocimiento del Gasto)

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Afectar el P&L (Pérdidas y Ganancias) |

**Metadata:**

| Campo | Descripción |
|-------|-------------|
| `cost_center_id` | Centro de costos |
| `category` | Limpieza, papelería, etc. |
| `description` | Descripción del gasto |

#### CASH_OUT (Salida de Dinero)

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Reflejar la salida física de dinero para el arqueo |

**Metadata:**

| Campo | Descripción |
|-------|-------------|
| `cash_session_id` | ID de la sesión |
| `recipient_name` | Nombre del receptor |
| `voucher_number` | Número de comprobante |

### 3.2 Reglas para Gastos por Caja

| Regla | Descripción |
|-------|-------------|
| **Límite de Gasto** | El sistema puede parametrizar un monto máximo permitido para gastos por caja sin autorización superior |
| **Vínculo a Centro de Costos** | Todo gasto de caja **DEBE** estar asociado a un `cost_center_id` de la sucursal para que la contabilidad sea precisa |
| **Soporte Digital** | Se recomienda adjuntar una foto del comprobante/factura en el campo `metadata` (referencia a storage) |

---

## 4. Movimientos entre Sucursales e Internos

### 4.1 Remesas y Transferencias

Si se envía efectivo de una sucursal a otra o a una cuenta bancaria:

| Paso | Transacción | Descripción |
|------|-------------|-------------|
| 1 | `CASH_OUT` | Salida de caja con tipo `REMITTANCE_SEND` |
| 2 | Tránsito | El dinero queda en estado "En Tránsito" hasta que la contraparte confirme |
| 3 | `CASH_IN` / `BANK_DEPOSIT` | Entrada según el destino |

**Flujo de Remesa:**

```
Sucursal A                    Sucursal B / Banco
    │                              │
    ├── CASH_OUT ──────────────────┤
    │   (REMITTANCE_SEND)          │
    │                              │
    │         [EN TRÁNSITO]        │
    │                              │
    │──────────────────── CASH_IN ─┤
    │                   (REMITTANCE_RECEIVE)
```

---

## 5. Gestión de Diferencias y Supervisión

| Hallazgo | Transacción de Ajuste | Alcance |
|----------|----------------------|---------|
| **Sobrante** | `CASH_OVERAGE` | Afecta el P&L de la sucursal como ingreso |
| **Faltante** | `CASH_SHORTAGE` | Gasto operativo o cuenta por cobrar al empleado |

### 5.1 Proceso de Conciliación

1. Cajero cierra sesión y declara conteo físico
2. Sistema calcula diferencia: `Conteo Físico - Saldo Teórico`
3. Si existe diferencia → Se genera `CASH_OVERAGE` o `CASH_SHORTAGE`
4. Supervisor revisa y marca como `RECONCILED`

---

## 6. Reglas de Negocio para Desarrolladores

### 6.1 Prioridad de Centros de Costo

> Al registrar un gasto operativo desde la sesión de caja, el sistema debe filtrar **solo los Centros de Costos activos** para esa `branch_id`.

### 6.2 Validación de Saldo Teórico

> El sistema debe advertir (o bloquear) si el monto del gasto excede el efectivo disponible (`CASH_IN` acumulado) en la sesión actual.

```
Saldo Disponible = Σ CASH_IN - Σ CASH_OUT
```

### 6.3 Doble Firma

> Para gastos mayores a un umbral $X$, el sistema debe requerir el `user_id` de un administrador además del cajero en la `metadata` de la transacción.

| Campo | Descripción |
|-------|-------------|
| `cashier_user_id` | Usuario cajero |
| `authorizer_user_id` | Usuario supervisor/administrador |
| `authorization_timestamp` | Momento de la autorización |

---

## 7. Reportabilidad Consolidada

| Reporte | Descripción |
|---------|-------------|
| **X-Report** | Estado actual con desglose de Ventas vs. Gastos Operativos realizados |
| **Z-Report** | Resumen de cierre incluyendo conciliación de comprobantes de gastos |
| **Branch Expense Analysis** | Reporte para el administrador que agrupa todos los gastos pagados por caja por Centro de Costos y Sucursal |

### 7.1 Estructura del Z-Report

| Sección | Contenido |
|---------|-----------|
| **Ventas** | Total bruto, neto, impuestos, descuentos |
| **Medios de Pago** | Desglose por efectivo, tarjeta, transferencia, crédito |
| **Gastos Operativos** | Lista de `EXPENSE_ACCRUAL` con comprobantes |
| **Movimientos de Caja** | `CASH_IN`, `CASH_OUT`, remesas |
| **Conciliación** | Saldo teórico vs. conteo físico, diferencias |

---

📌 **Este documento complementa la documentación base del ERP.**
