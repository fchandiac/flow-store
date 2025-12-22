# FlowStore ERP - Documentación

Sistema ERP completo para gestión de retail con soporte multi-sucursal, punto de venta, inventario y contabilidad.

---

## 📚 Documentación Técnica

### Arquitectura Base
| Documento | Descripción |
|-----------|-------------|
| [base.md](base.md) | Arquitectura fundamental, transacciones inmutables, entidades maestras |
| [producto-inventario.md](producto-inventario.md) | Productos, variantes, storage, stock, costeo PPP |

### Procesos de Negocio
| Documento | Descripción |
|-----------|-------------|
| [proceso-venta.md](proceso-venta.md) | Flujo de ventas, documentos, pagos, anulaciones |
| [proceso-compras.md](proceso-compras.md) | Órdenes de compra, recepciones, facturación |
| [sesion-caja-multisucursal.md](sesion-caja-multisucursal.md) | Sesiones de caja, multi-sucursal, remesas |
| [gastos-operativos.md](gastos-operativos.md) | OPEX, centros de costo, presupuestos, aprobaciones |
| [descuentos-promociones.md](descuentos-promociones.md) | Promociones, cupones, motor de descuentos |
| [gestion-fiscal.md](gestion-fiscal.md) | Impuestos, períodos fiscales, declaraciones |

---

## 🎨 Guías de Interfaz de Usuario

Las guías de UI se encuentran en el directorio [ui-guides/](ui-guides/):

| Guía | Descripción |
|------|-------------|
| [00-login-seleccion.md](ui-guides/00-login-seleccion.md) | Login, selección de modo, sucursal y punto de venta |
| [01-layouts-globales.md](ui-guides/01-layouts-globales.md) | Layouts Admin (SideBar) y POS (Tabs) |
| [02-pos-ui.md](ui-guides/02-pos-ui.md) | Punto de venta, carrito, checkout |
| [03-inventario-ui.md](ui-guides/03-inventario-ui.md) | Productos, stock, movimientos |
| [04-compras-ui.md](ui-guides/04-compras-ui.md) | Órdenes de compra, recepciones |
| [05-gastos-ui.md](ui-guides/05-gastos-ui.md) | Gastos operativos, presupuestos |
| [06-promociones-ui.md](ui-guides/06-promociones-ui.md) | Promociones, cupones |
| [07-fiscal-ui.md](ui-guides/07-fiscal-ui.md) | Gestión fiscal, declaraciones |
| [08-tesoreria-ui.md](ui-guides/08-tesoreria-ui.md) | Tesorería, sesiones de caja |
| [09-reportes-ui.md](ui-guides/09-reportes-ui.md) | Dashboard, reportes |

---

## 🏗️ Principios del Sistema

### Inmutabilidad
- Las transacciones nunca se modifican ni eliminan
- Para anular, se crea una transacción de reversión
- Trazabilidad completa por diseño

### Multi-Sucursal
- Jerarquía: Company → Branch → PointOfSale → CashSession
- Stock gestionado por Storage (IN_BRANCH, CENTRAL, EXTERNAL)
- Consolidación de reportes a nivel empresa

### Doble Entrada
- Cada operación genera transacciones balanceadas
- Separación entre devengado y percibido
- Integración contable automática

---

## 📋 Tipos de Transacciones

| Código | Categoría | Descripción |
|--------|-----------|-------------|
| `SALE` | Ventas | Venta de productos |
| `SALE_RETURN` | Ventas | Devolución de venta |
| `PURCHASE` | Compras | Compra a proveedor |
| `STOCK_IN` | Inventario | Entrada de stock |
| `STOCK_OUT` | Inventario | Salida de stock |
| `STOCK_TRANSFER` | Inventario | Transferencia entre storages |
| `CASH_IN` | Caja | Entrada de efectivo |
| `CASH_OUT` | Caja | Salida de efectivo |
| `EXPENSE_ACCRUAL` | Gastos | Reconocimiento de gasto |
| `TAX_LEDGER` | Fiscal | Débito fiscal |
| `TAX_CREDIT` | Fiscal | Crédito fiscal |

---

## 🚀 Tecnologías Sugeridas

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js + React |
| UI Components | Tailwind CSS + shadcn/ui |
| Desktop | Electron |
| Database | PostgreSQL |
| ORM | Prisma |
| API | tRPC o REST |

---

📌 **Este proyecto está en desarrollo. La documentación refleja el diseño conceptual del sistema.**
