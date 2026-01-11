# FlowStore ERP - Documentación

Sistema ERP completo para gestión de retail con soporte multi-sucursal, punto de venta, inventario y contabilidad.

---

## 📚 Documentación Técnica

### Arquitectura
| Documento | Descripción |
|-----------|-------------|
| [arquitectura.md](arquitectura.md) | **Estructura del proyecto Electron + Next.js con SSR** |
| [base.md](base.md) | Arquitectura fundamental, transacciones inmutables, entidades maestras |

### Sistema Core
| Documento | Descripción |
|-----------|-------------|
| [personas.md](personas.md) | Sistema de personas (base para usuarios, clientes, proveedores) |
| [usuarios.md](usuarios.md) | Gestión de usuarios, roles y autenticación |
| [permisos.md](permisos.md) | Sistema de permisos granulares |
| [auditorias.md](auditorias.md) | Sistema de auditoría y trazabilidad |
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

## 🗄️ Entidades

La documentación de entidades se encuentra en [entities/](entities/):

| Entidad | Descripción |
|---------|-------------|
| [Transaction](entities/transaction.md) | **ENTIDAD CENTRAL** - Registro inmutable de operaciones |
| [Company](entities/company.md) | Configuración de empresa única |
| [Branch](entities/branch.md) | Sucursales |
| [Storage](entities/storage.md) | Almacenes/Bodegas |
| [PointOfSale](entities/point-of-sale.md) | Puntos de venta |
| [CashSession](entities/cash-session.md) | Sesiones de caja |
| [Person](entities/person.md) | Persona base |
| [User](entities/user.md) | Usuarios del sistema |
| [Customer](entities/customer.md) | Clientes |
| [Supplier](entities/supplier.md) | Proveedores |
| [Product](entities/product.md) | Productos |
| [ProductVariant](entities/product-variant.md) | Variantes/SKUs |
| [Category](entities/category.md) | Categorías |
| [PriceList](entities/price-list.md) | Listas de precios |
| [Tax](entities/tax.md) | Impuestos |
| [StockLevel](entities/stock-level.md) | Stock (calculado) |
| [Audit](entities/audit.md) | Auditoría |
| [Permission](entities/permission.md) | Permisos |

---

## ⚡ Server Actions

La documentación de Server Actions se encuentra en [server-actions/](server-actions/):

| Action | Entidad | Descripción |
|--------|---------|-------------|
| [transactions.ts](server-actions/transactions.md) | Transaction | Ventas, compras, movimientos (inmutables) |
| [auth.server.ts](server-actions/auth.md) | User/Session | Helpers de sesión NextAuth |
| [companies.ts](server-actions/companies.md) | Company | Configuración de empresa |
| [branches.ts](server-actions/branches.md) | Branch | Gestión de sucursales |
| [storages.ts](server-actions/storages.md) | Storage | Gestión de almacenes |
| [pointsOfSale.ts](server-actions/points-of-sale.md) | PointOfSale | Puntos de venta |
| [cashSessions.ts](server-actions/cash-sessions.md) | CashSession | Sesiones de caja |
| [persons.ts](server-actions/persons.md) | Person | CRUD de personas |
| [users.ts](server-actions/users.md) | User | Gestión de usuarios |
| [customers.ts](server-actions/customers.md) | Customer | Gestión de clientes |
| [suppliers.ts](server-actions/suppliers.md) | Supplier | Gestión de proveedores |
| [products.ts](server-actions/products.md) | Product | Productos base |
| [productVariants.ts](server-actions/product-variants.md) | ProductVariant | Variantes/SKUs |
| [categories.ts](server-actions/categories.md) | Category | Categorías |
| [priceLists.ts](server-actions/price-lists.md) | PriceList | Listas de precios |
| [taxes.ts](server-actions/taxes.md) | Tax | Impuestos |
| [stock.ts](server-actions/stock.md) | StockLevel | Consultas de stock |
| [audits.ts](server-actions/audits.md) | Audit | Consulta de auditorías |
| [permissions.ts](server-actions/permissions.md) | Permission | Gestión de permisos |

---

## 🎨 Guías de Interfaz de Usuario

Las guías de UI se encuentran en [ui-guides/](ui-guides/):

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
| [10-rutas-ui.md](ui-guides/10-rutas-ui.md) | Mapa de rutas y wireframes |

---

## 🏗️ Principios del Sistema

### Inmutabilidad
- Las transacciones nunca se modifican ni eliminan
- Para anular, se crea una transacción de reversión
- Trazabilidad completa por diseño

### Compañía Única
- El sistema opera con una sola Company
- La configuración fiscal se maneja en la entidad Tax

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
