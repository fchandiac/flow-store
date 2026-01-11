# DataGrid Component

Componente de tabla de datos flexible para aplicaciones Next.js con App Router. Soporta paginación, ordenamiento, búsqueda, filtros y acciones personalizadas con persistencia de estado en URL.

---

## 📁 Estructura de Archivos

Para usar el DataGrid, crea esta estructura en tu página:

```
[tu-pagina]/
├── page.tsx                    # Server Component - fetch de datos
└── ui/
    └── [Modulo]DataGrid.tsx    # Client Component - renderiza DataGrid
```

### Convención de nombres para `[Modulo]DataGrid.tsx`:
- PascalCase con sufijo `DataGrid`
- Ejemplos: `UsersDataGrid.tsx`, `ProductsDataGrid.tsx`, `OrdersDataGrid.tsx`

---

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                         page.tsx                                │
│                    (Server Component)                           │
│                                                                 │
│  1. Lee searchParams de la URL                                  │
│  2. Llama a la función de fetch con los parámetros              │
│  3. Pasa los datos al Client Component                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  [Modulo]DataGrid.tsx                           │
│                    (Client Component)                           │
│                                                                 │
│  1. Recibe data y configuración                                 │
│  2. Define columnas y acciones                                  │
│  3. Renderiza <DataGrid />                                      │
│  4. Actualiza URL en cambios (paginación, filtros, etc.)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementación

### Paso 1: page.tsx (Server Component)

```tsx
// page.tsx
import { fetchUsers } from './actions'  // Tu función de fetch
import UsersDataGrid from './ui/UsersDataGrid'

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    sortField?: string
    sort?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  
  const result = await fetchUsers({
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 10,
    search: params.search || '',
    sortField: params.sortField || 'createdAt',
    sort: (params.sort as 'ASC' | 'DESC') || 'DESC',
  })
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Usuarios</h1>
      <UsersDataGrid
        data={result.data}
        total={result.total}
        page={result.page}
        limit={result.limit}
      />
    </div>
  )
}
```

### Paso 2: ui/[Modulo]DataGrid.tsx (Client Component)

```tsx
// ui/UsersDataGrid.tsx
'use client'

import DataGrid from '@/baseComponents/DataGrid'
import type { DataGridColumn } from '@/baseComponents/DataGrid'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface Props {
  data: User[]
  total: number
  page: number
  limit: number
}

export default function UsersDataGrid({ data, total, page, limit }: Props) {
  const columns: DataGridColumn[] = [
    { 
      field: 'name', 
      headerName: 'Nombre',
      sortable: true,
      flex: 1,
    },
    { 
      field: 'email', 
      headerName: 'Email',
      sortable: true,
      flex: 1,
    },
    { 
      field: 'role', 
      headerName: 'Rol',
      width: 120,
      renderCell: ({ value }) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
          {value}
        </span>
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Fecha',
      width: 120,
      sortable: true,
      renderCell: ({ value }) => new Date(value).toLocaleDateString()
    },
  ]
  
  return (
    <DataGrid
      columns={columns}
      rows={data}
      totalRows={total}
      title="Usuarios"
    />
  )
}
```

---

## 📊 Props Reference

### DataGridProps

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `columns` | `DataGridColumn[]` | **requerido** | Definición de columnas |
| `rows` | `any[]` | `[]` | Datos a mostrar |
| `totalRows` | `number` | **requerido** | Total de registros (para paginación) |
| `title` | `string` | - | Título del grid |
| `height` | `number \| string` | `'70vh'` | Altura del componente |
| `limit` | `number` | `25` | Filas por página por defecto |
| `showBorder` | `boolean` | `false` | Mostrar borde alrededor |
| `onAddClick` | `() => void` | - | Callback para botón "+" |
| `createForm` | `ReactNode` | - | Formulario de creación (modal interno) |
| `createFormTitle` | `string` | - | Título del modal de creación |
| `onExportExcel` | `() => Promise<void>` | - | Callback para exportar a Excel |
| `expandable` | `boolean` | `false` | Habilitar filas expandibles |
| `expandableRowContent` | `(row) => ReactNode` | - | Contenido del panel expandido |

### DataGridColumn

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `field` | `string` | **requerido** | Nombre del campo en el objeto de datos |
| `headerName` | `string` | **requerido** | Texto del encabezado |
| `width` | `number` | - | Ancho fijo en píxeles |
| `minWidth` | `number` | - | Ancho mínimo |
| `flex` | `number` | - | Factor de crecimiento flexible |
| `sortable` | `boolean` | `false` | Si la columna es ordenable |
| `filterable` | `boolean` | `true` | Si la columna es filtrable |
| `hide` | `boolean` | `false` | Ocultar la columna |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Alineación del contenido |
| `renderCell` | `(params) => ReactNode` | - | Renderizado personalizado |
| `renderType` | `'currency' \| 'badge' \| 'dateString'` | - | Renderizado predefinido |
| `actionComponent` | `ComponentType<{row}>` | - | Componente de acciones |

---

## 🎯 Ejemplos

### Columna con renderizado personalizado

```tsx
{
  field: 'status',
  headerName: 'Estado',
  width: 100,
  renderCell: ({ value }) => (
    <span className={`px-2 py-1 rounded-full text-xs ${
      value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {value === 'active' ? 'Activo' : 'Inactivo'}
    </span>
  )
}
```

### Columna con imagen

```tsx
{
  field: 'avatar',
  headerName: 'Foto',
  width: 60,
  renderCell: ({ value }) => (
    <img 
      src={value || '/placeholder.png'} 
      alt="Avatar"
      className="w-10 h-10 rounded-full object-cover"
    />
  )
}
```

### Columna de acciones

```tsx
// Componente de acciones
function UserActions({ row }: { row: User }) {
  const router = useRouter()
  
  return (
    <div className="flex gap-1">
      <IconButton icon="edit" size="xs" onClick={() => router.push(`/users/${row.id}/edit`)} />
      <IconButton icon="delete" size="xs" className="text-red-500" onClick={() => handleDelete(row.id)} />
    </div>
  )
}

// En las columnas
{
  field: 'actions',
  headerName: '',
  width: 100,
  align: 'center',
  sortable: false,
  filterable: false,
  actionComponent: UserActions,
}
```

### Con formulario de creación (modal interno)

```tsx
<DataGrid
  columns={columns}
  rows={data}
  totalRows={total}
  title="Usuarios"
  createForm={<CreateUserForm />}
  createFormTitle="Crear Usuario"
/>
```

### Con callback de creación externo

```tsx
<DataGrid
  columns={columns}
  rows={data}
  totalRows={total}
  title="Usuarios"
  onAddClick={() => router.push('/users/new')}
/>
```

### Filas expandibles

```tsx
<DataGrid
  columns={columns}
  rows={data}
  totalRows={total}
  expandable={true}
  expandableRowContent={(row) => (
    <div className="p-4 bg-gray-50">
      <p>Descripción: {row.description}</p>
      <p>Notas: {row.notes}</p>
    </div>
  )}
/>
```

---

## 🔗 Contrato de Datos

### Query Params esperados

El DataGrid actualiza la URL con estos parámetros:

| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | `number` | Página (1-indexed) |
| `limit` | `number` | Registros por página |
| `search` | `string` | Término de búsqueda |
| `sortField` | `string` | Campo para ordenar |
| `sort` | `'asc' \| 'desc'` | Dirección |
| `filters` | `string` | Filtros por columna |

### Respuesta esperada del fetch

```typescript
{
  data: T[],        // Array de registros
  total: number,    // Total sin paginar
  page: number,     // Página actual
  limit: number     // Límite usado
}
```

---

## ✅ Checklist

- [ ] Crear `page.tsx` que lea `searchParams`
- [ ] Crear función de fetch que construya query params
- [ ] Crear `ui/[Modulo]DataGrid.tsx`
- [ ] Definir columnas con `field`, `headerName`
- [ ] Agregar `renderCell` para formatos personalizados
- [ ] Agregar `actionComponent` si necesitas acciones por fila
- [ ] Configurar `onAddClick` o `createForm` si necesitas crear registros
- [ ] Probar paginación, ordenamiento y búsqueda
