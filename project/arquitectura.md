# Arquitectura del Proyecto

## 1. Descripción General

FlowStore es una aplicación de escritorio construida con **Electron** que embebe un servidor **Next.js** con Server-Side Rendering (SSR).

```
┌─────────────────────────────────────────────────────────┐
│                      ELECTRON                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  BrowserWindow                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              NEXT.JS (SSR)                  │  │  │
│  │  │  ┌─────────────┐  ┌──────────────────────┐ │  │  │
│  │  │  │   React     │  │   Server Actions     │ │  │  │
│  │  │  │   (Client)  │  │   (Server-Side)      │ │  │  │
│  │  │  └─────────────┘  └──────────────────────┘ │  │  │
│  │  │                         │                   │  │  │
│  │  │                         ▼                   │  │  │
│  │  │              ┌──────────────────┐          │  │  │
│  │  │              │     TypeORM      │          │  │  │
│  │  │              │     (MySQL)      │          │  │  │
│  │  │              └──────────────────┘          │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| Desktop | Electron | Aplicación de escritorio multiplataforma |
| Frontend | Next.js + React | UI con SSR |
| Estilos | Tailwind CSS | Diseño responsive |
| Estado | Zustand | Estado global del cliente |
| Backend | Next.js Server Actions | Lógica de negocio |
| ORM | TypeORM | Mapeo objeto-relacional |
| Base de Datos | MySQL | Persistencia |
| Auth | NextAuth.js | Autenticación |

---

## 3. Estructura de Carpetas

```
flow-store/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Layout principal
│   ├── page.tsx                # Página de login
│   ├── Providers.tsx           # Providers (Zustand, Session, etc.)
│   ├── global.css              # Estilos globales
│   │
│   ├── actions/                # 🔥 SERVER ACTIONS
│   │   ├── auth.server.ts      # Autenticación
│   │   ├── transactions.ts     # Transacciones
│   │   ├── products.ts         # Productos
│   │   └── ...                 # Un archivo por entidad
│   │
│   ├── admin/                  # Rutas de administración
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── users/
│   │   └── ...
│   │
│   ├── pointOfSale/            # Rutas de punto de venta
│   │   ├── layout.tsx
│   │   └── [posId]/
│   │
│   ├── api/                    # API Routes
│   │   ├── auth/               # NextAuth endpoints
│   │   └── config/             # Configuración
│   │
│   ├── baseComponents/         # Componentes base reutilizables
│   │   ├── Button/
│   │   ├── DataGrid/
│   │   ├── Dialog/
│   │   └── ...
│   │
│   ├── state/                  # Zustand stores
│   │   └── ...
│   │
│   └── ui/                     # Componentes de UI específicos
│
├── assets/                     # Recursos estáticos (icons, splash)
│
├── data/                       # Capa de datos
│   ├── db.ts                   # Conexión a base de datos
│   ├── entities/               # Entidades TypeORM
│   ├── services/               # Servicios de datos
│   ├── migrations/             # Migraciones
│   └── seed/                   # Datos iniciales
│
├── lib/                        # Utilidades compartidas
│   ├── dateTimeUtils.ts
│   ├── permissions.ts
│   └── ...
│
├── project/                    # 📚 DOCUMENTACIÓN
│   ├── base.md
│   ├── entities/               # Documentación de entidades
│   ├── server-actions/         # Documentación de server actions
│   └── ui-guides/              # Guías de UI
│
├── public/                     # Archivos públicos
│
├── scripts/                    # Scripts de utilidad
│
├── src/                        # Código Electron
│   ├── main.dev.ts             # Entry point desarrollo
│   ├── main.prod.ts            # Entry point producción
│   └── utils/                  # Utilidades Electron
│
└── tests/                      # Tests E2E (Playwright)
```

---

## 4. Flujo de Ejecución

### Desarrollo (`npm run dev`)

```
1. npm run build:electron
   └── Compila TypeScript de Electron

2. electron dist/src/main.dev.js
   ├── Muestra splash screen
   ├── Busca puerto disponible (3000-3010)
   ├── Inicia Next.js dev server
   ├── Espera a que Next esté listo
   └── Carga BrowserWindow con http://localhost:{port}
```

### Producción (`npm run start:prod`)

```
1. npm run build:next
   └── Compila Next.js (standalone)

2. npm run build:electron
   └── Compila TypeScript de Electron

3. electron dist/src/main.prod.js
   ├── Carga el servidor Next standalone
   └── Renderiza en BrowserWindow
```

---

## 5. Server Actions

Los Server Actions son funciones que se ejecutan en el servidor y pueden ser llamadas directamente desde componentes React.

```typescript
// app/actions/products.ts
'use server'

import { getDataSource } from '@/data/db';
import { Product } from '@/data/entities/Product';

export async function getProducts() {
    const ds = await getDataSource();
    const repo = ds.getRepository(Product);
    return await repo.find();
}

export async function createProduct(data: CreateProductDTO) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Product);
    const product = repo.create(data);
    return await repo.save(product);
}
```

```tsx
// Uso en componente
'use client'

import { getProducts, createProduct } from '@/app/actions/products';

function ProductList() {
    const [products, setProducts] = useState([]);
    
    useEffect(() => {
        getProducts().then(setProducts);
    }, []);
    
    const handleCreate = async (data) => {
        const newProduct = await createProduct(data);
        setProducts(prev => [...prev, newProduct]);
    };
}
```

---

## 6. Configuración

### app.config.json

```json
{
    "appName": "FlowStore",
    "database": {
        "host": "localhost",
        "database": "flow-store",
        "username": "root",
        "password": "redbull90"
    }
}
```

### Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXTAUTH_URL` | URL base para NextAuth |
| `NEXTAUTH_SECRET` | Secret para sesiones |
| `NODE_ENV` | Ambiente (development/production/test) |

---

## 7. IPC Communication (Electron ↔ Next)

```typescript
// main.dev.ts - Registrar handlers
ipcMain.handle('closeApp', closeAppHandler);
ipcMain.handle('print-html', silentPrintHandler);

// En React (via preload)
window.electron.closeApp();
window.electron.printHtml(htmlContent);
```

---

## 8. Build & Package

```bash
# Desarrollo
npm run dev              # Electron + Next dev

# Producción
npm run build            # Build completo
npm run start:prod       # Ejecutar producción

# Packaging
npm run pack:mac         # Package para macOS
npm run pack:win         # Package para Windows
npm run make:mac         # Crear instalador macOS
npm run make:win         # Crear instalador Windows
```
