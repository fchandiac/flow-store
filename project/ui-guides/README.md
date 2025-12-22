# FlowStore ERP - Guías de Interfaz de Usuario

Este directorio contiene las guías visuales de la interfaz del sistema ERP. Cada guía muestra:

- **Wireframes ASCII**: Diagramas de la estructura de pantallas
- **Flujos de usuario**: Navegación y pasos de cada proceso
- **Componentes**: Elementos de UI utilizados
- **Estados**: Variantes visuales según contexto

---

## 📑 Índice de Guías

### Acceso y Estructura
| # | Guía | Descripción |
|---|------|-------------|
| 00 | [login-seleccion](00-login-seleccion.md) | Login, selección de modo, sucursal y punto de venta |
| 01 | [layouts-globales](01-layouts-globales.md) | Layouts Admin (SideBar) y POS (TabBar) |

### Punto de Venta
| # | Guía | Descripción |
|---|------|-------------|
| 02 | [pos-ui](02-pos-ui.md) | Interfaz POS, carrito, búsqueda, checkout |

### Administración
| # | Guía | Descripción |
|---|------|-------------|
| 03 | [inventario-ui](03-inventario-ui.md) | Productos, stock, movimientos, ajustes |
| 04 | [compras-ui](04-compras-ui.md) | Órdenes de compra, recepciones, proveedores |
| 05 | [gastos-ui](05-gastos-ui.md) | Gastos operativos, presupuestos, aprobaciones |
| 06 | [promociones-ui](06-promociones-ui.md) | Promociones, cupones, condiciones |

### Contabilidad y Reportes
| # | Guía | Descripción |
|---|------|-------------|
| 07 | [fiscal-ui](07-fiscal-ui.md) | Períodos fiscales, libros, declaraciones |
| 08 | [tesoreria-ui](08-tesoreria-ui.md) | Sesiones de caja, arqueos, remesas |
| 09 | [reportes-ui](09-reportes-ui.md) | Dashboard, KPIs, reportes operativos |

---

## 🎨 Convenciones de Diseño

### Iconografía (Lucide Icons)
| Concepto | Icono |
|----------|-------|
| Ventas | ShoppingCart |
| Inventario | Package |
| Compras | Truck |
| Gastos | Receipt |
| Fiscal | FileText |
| Reportes | BarChart3 |
| Configuración | Settings |
| Usuario | User |
| Sucursal | Building2 |

### Paleta de Estados
| Estado | Color | Uso |
|--------|-------|-----|
| Primary | Blue | Acciones principales |
| Success | Green | Confirmaciones, completado |
| Warning | Yellow | Alertas, pendientes |
| Danger | Red | Errores, anulaciones |
| Muted | Gray | Deshabilitado, secundario |

### Componentes Base
- **Card**: Contenedor principal de información
- **DataTable**: Listados con ordenamiento y filtros
- **Dialog/Modal**: Acciones que requieren confirmación
- **Sheet**: Paneles laterales para detalles
- **Tabs**: Navegación dentro de un contexto
- **Badge**: Estado compacto visual

---

## 📐 Responsive Design

| Breakpoint | Uso Principal |
|------------|---------------|
| < 640px | Móvil (POS básico) |
| 640-1024px | Tablet (POS completo) |
| > 1024px | Desktop (Admin + POS) |

El modo POS está optimizado para tablets en orientación landscape.
El modo Admin está optimizado para desktop con sidebar expandible.

---

📌 **Estas guías usan diagramas ASCII exclusivamente. No contienen código.**
