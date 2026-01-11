# FlowStore ERP - Guías de Interfaz de Usuario

Este directorio contiene las guías visuales de la interfaz del sistema ERP. Cada guía muestra:

- **Wireframes ASCII**: Diagramas de la estructura de pantallas
- **Flujos de usuario**: Navegación y pasos de cada proceso
- **Componentes**: Elementos de UI utilizados
- **Estados**: Variantes visuales según contexto

---

## 📑 Índice de Guías

### Estructura y Rutas
| # | Guía | Descripción |
|---|------|-------------|
| 10 | [rutas-ui](10-rutas-ui.md) | **Mapa de rutas y UI requerida por página** |

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

### Sistema y Configuración
| # | Guía | Descripción |
|---|------|-------------|
| 11 | [permisos-roles](11-permisos-roles.md) | **Sistema de permisos y roles de usuario** |

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
- **DataTable/DataGrid**: Listados con ordenamiento y filtros
- **Dialog/Modal**: Acciones que requieren confirmación
- **Sheet**: Paneles laterales para detalles
- **Tabs**: Navegación dentro de un contexto
- **Badge**: Estado compacto visual
- **UserCard**: Tarjeta de usuario con avatar, info y acciones
- **DotProgress**: Indicador de carga animado

---

## 📁 Estructura de Carpetas UI por Página

Cada página con CRUD completo debe seguir esta estructura:

```
app/admin/[module]/
├── page.tsx              # Página principal (Server Component si es posible)
├── loading.tsx           # Estado de carga con DotProgress
└── ui/
    ├── index.ts          # Exports de componentes
    ├── [Module]List.tsx  # Lista/Grid de items (ej: UserList, ProductList)
    ├── [Module]Card.tsx  # Tarjeta individual (opcional, para vistas card)
    ├── Create[Module]Dialog.tsx  # Dialog para crear
    ├── Update[Module]Dialog.tsx  # Dialog para editar
    └── Delete[Module]Dialog.tsx  # Dialog para eliminar
```

### Ejemplo: Módulo de Usuarios (Patrón Cards con Dialogs)

```
app/admin/users/
├── page.tsx              # Carga usuarios y renderiza UserList
├── loading.tsx           # DotProgress mientras carga
└── ui/
    ├── index.ts          # export { UserList, UserCard, Create/Update/DeleteUserDialog }
    ├── UserList.tsx      # Grid de UserCards + búsqueda + botón agregar
    ├── UserCard.tsx      # Avatar + nombre + rol + email + acciones (edit/delete)
    ├── CreateUserDialog.tsx  # Form: userName, mail, password, rol, personName, personDni
    ├── UpdateUserDialog.tsx  # Form pre-llenado para edición
    └── DeleteUserDialog.tsx  # Confirmación de eliminación
```

### Ejemplo: Módulo Empresa (Patrón Form Directo - Singleton)

Para entidades únicas (como Empresa) que no tienen múltiples registros:

```
app/admin/settings/company/
├── page.tsx              # Server Component - Carga empresa y renderiza CompanyForm
├── loading.tsx           # DotProgress mientras carga
└── ui/
    ├── index.ts          # export { CompanyForm, CompanyActions }
    ├── CompanyForm.tsx   # Form directo (sin dialog) con createBaseForm
    ├── CompanyActions.tsx # Botones de edición/eliminación (Client Component)
    ├── EditCompanyDialog.tsx   # Dialog para editar configuración avanzada
    └── DeleteCompanyDialog.tsx # Dialog para eliminar (con confirmación)
```

**Nota**: Como `page.tsx` es Server Component, los botones y dialogs deben estar 
en componentes cliente separados (CompanyActions.tsx).

### Ejemplo: Módulo Sucursales/Impuestos/Listas de Precios (Patrón Cards)

```
app/admin/settings/branches/
├── page.tsx              # Server Component - Carga sucursales
├── loading.tsx           # DotProgress mientras carga
└── ui/
    ├── index.ts          # export { BranchList, BranchCard, Create/Update/DeleteBranchDialog }
    ├── BranchList.tsx    # Grid de BranchCards + búsqueda + botón agregar
    ├── BranchCard.tsx    # Tarjeta con nombre, dirección, teléfono, estado + acciones
    ├── CreateBranchDialog.tsx  # Form para crear sucursal
    ├── UpdateBranchDialog.tsx  # Form pre-llenado para edición
    └── DeleteBranchDialog.tsx  # Confirmación de eliminación
```

### Patrón de UserCard

```
┌─────────────────────────────────────────────────┐
│  ┌─────┐                                        │
│  │ 👤  │  Juan Pérez                            │
│  │     │  @juanperez                            │
│  │ ○─○ │  📧 juan@email.com                     │
│  └─────┘  📱 +56 9 1234 5678                    │
│  [Administrador]                                │
│                                  [✏️] [🗑️]     │
└─────────────────────────────────────────────────┘
```

### Patrón de Loading

```tsx
// loading.tsx - En cada carpeta de página
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export default function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <DotProgress />
      </div>
    </div>
  );
}
```

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
