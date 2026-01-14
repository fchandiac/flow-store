# FlowStore - Documentación de Entidades

Este directorio contiene la documentación detallada de todas las entidades del sistema FlowStore.

---

## 🏛️ Arquitectura Basada en Transacciones

FlowStore utiliza un modelo de **transacciones inmutables** como pilar central. Esto significa que:

- La entidad `Transaction` es el corazón del sistema
- Los saldos se calculan como suma de transacciones
- Nunca se modifica ni elimina una transacción
- Para anular, se crea una transacción de reversión

---

## 📁 Índice de Entidades

### Entidad Central
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| **Transaction** | [transaction.md](transaction.md) | Entidad central inmutable del sistema |

### Entidades de Organización
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| Company | [company.md](company.md) | Empresa/Holding |
| Branch | [branch.md](branch.md) | Sucursal |
| PointOfSale | [point-of-sale.md](point-of-sale.md) | Punto de venta/Terminal |
| Storage | [storage.md](storage.md) | Almacén/Bodega |
| CostCenter | [operating-expense.md](operating-expense.md#1-entidades-principales) | Centro de costos |

### Entidades de Actores
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| Person | [person.md](person.md) | Persona (natural o jurídica) |
| User | [user.md](user.md) | Usuario del sistema |
| Permission | [permission.md](permission.md) | Permisos granulares |
| Customer | [customer.md](customer.md) | Cliente (extensión de Person) |
| Supplier | [supplier.md](supplier.md) | Proveedor (extensión de Person) |
| Employee | [employee.md](employee.md) | Colaborador interno vinculado a Person |

### Entidades de Productos
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| Category | [category.md](category.md) | Categoría de productos |
| Product | [product.md](product.md) | Producto base |
| ProductVariant | [product-variant.md](product-variant.md) | Variante/SKU |
| PriceList | [price-list.md](price-list.md) | Lista de precios |

### Entidades de Inventario
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| StockLevel | [stock-level.md](stock-level.md) | Nivel de stock (calculado) |

### Entidades de Caja
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| CashSession | [cash-session.md](cash-session.md) | Sesión/Turno de caja |

### Entidades Financieras
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| Budget | [operating-expense.md](operating-expense.md#1-entidades-principales) | Presupuesto por centro y período |
| ExpenseCategory | [operating-expense.md](operating-expense.md#1-entidades-principales) | Catálogo de categorías de gasto |
| OperationalExpense | [operating-expense.md](operating-expense.md#3-transacciones-de-gasto) | Registro maestro de gasto operativo |
| TreasuryAccount | *(pendiente)* | Cuentas corporativas de tesorería |
| AccountingAccount | *(pendiente)* | Plan de cuentas contable |
| AccountingRule | *(pendiente)* | Reglas de imputación contable |
| AccountingPeriod | *(pendiente)* | Gestión de períodos contables |

### Entidades Fiscales
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| Tax | [tax.md](tax.md) | Impuestos (IVA, retenciones, etc.) |

### Entidades de Auditoría
| Entidad | Archivo | Descripción |
|---------|---------|-------------|
| Audit | [audit.md](audit.md) | Log de auditoría |

---

## 🔄 Diagrama de Relaciones

```
                        ┌─────────────────┐
                        │    COMPANY      │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │  BRANCH  │      │ STORAGE  │      │  PERSON  │
        └────┬─────┘      │ (CENTRAL)│      └────┬─────┘
             │            └──────────┘           │
    ┌────────┼────────┐                ┌─────────┼─────────┐
    │        │        │                │         │         │
    ▼        ▼        ▼                ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐     ┌───────┐ ┌───────┐ ┌───────┐
│  POS  │ │STORAGE│ │ USER  │     │ USER  │ │CUSTOMER│ │SUPPLIER│
└───┬───┘ │(BRANCH)│ └───────┘     └───────┘ └───────┘ └───────┘
    │     └───────┘
    ▼
┌─────────────┐
│ CASH_SESSION│
└─────────────┘
        │
        │  Todas las operaciones generan
        ▼
┌═══════════════════════════════════════════════════════════════┐
║                                                               ║
║                    T R A N S A C T I O N                      ║
║                    (Entidad Central Inmutable)                ║
║                                                               ║
║  SALE | PURCHASE | STOCK_IN | STOCK_OUT | CASH_IN | CASH_OUT  ║
║  STOCK_TRANSFER | EXPENSE | TAX_LEDGER | BANK_DEPOSIT | ...   ║
║                                                               ║
└═══════════════════════════════════════════════════════════════┘
```

---

## 📊 Flujo de Datos

```
OPERACIÓN                    TRANSACCIONES GENERADAS
─────────────────────────────────────────────────────────────────
Venta                    →   SALE + STOCK_OUT + CASH_IN
Compra                   →   PURCHASE + STOCK_IN + CASH_OUT
Devolución Venta         →   SALE_RETURN + STOCK_IN + CASH_OUT
Ajuste Inventario        →   STOCK_ADJUSTMENT
Transferencia Stock      →   STOCK_TRANSFER (origen → destino)
Gasto Operativo          →   EXPENSE_ACCRUAL + CASH_OUT
Depósito Bancario        →   CASH_OUT + BANK_DEPOSIT
```

---

## 🔐 Reglas de Inmutabilidad

| Regla | Descripción |
|-------|-------------|
| **No UPDATE** | Las transacciones nunca se modifican |
| **No DELETE** | Las transacciones nunca se eliminan |
| **Reversión** | Para anular → crear transacción con `reverses_transaction_id` |
| **Trazabilidad** | Toda transacción tiene `reference_id` al documento origen |

---

📌 **La entidad Transaction es el corazón del sistema. Todo saldo, movimiento o estado se deriva de ella.**
