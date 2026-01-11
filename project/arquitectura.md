# Arquitectura del Proyecto

## 1. Descripción General

FlowStore es una aplicación de escritorio construida con **Electron** que hospeda internamente un servidor **Next.js** con rendering híbrido (SSR + componentes cliente). El proceso principal de Electron orquesta la ventana nativa y coordina la inicialización; Next.js resuelve el enrutamiento, la lógica de negocio y las Server Actions; TypeORM conecta con MySQL para la persistencia.

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

**Componentes clave**
- Proceso principal (`Electron`): administra ventanas, menús, accesos directos, IPC y ciclo de vida.
- Proceso web (`Next.js`): levanta el servidor HTTP local, renderiza React y ejecuta Server Actions.
- Capa de datos (`TypeORM` + MySQL): centraliza la persistencia mediante un `DataSource` singleton.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| Desktop | Electron 39 | Shell nativo, BrowserWindow, menús y accesos directos |
| Frontend | Next.js 15 + React 19 | UI con SSR, App Router y componentes cliente |
| Estilos | Tailwind CSS 3 | Diseño responsive basado en utilidades |
| Estado | Zustand | Estado global cliente sincronizado con Server Actions |
| Backend | Next.js Server Actions | Lógica de negocio sin API REST tradicional |
| ORM | TypeORM 0.3 | Mapeo objeto-relacional, subscribers y migraciones |
| Base de Datos | MySQL 8 | Persistencia primaria |
| Auth | NextAuth.js | Autenticación y sesiones |
| Tests | Playwright | Automatización E2E |
| Packaging | Electron Forge | Empaquetado y generación de instaladores |

---

## 3. Estructura de Carpetas

```
flow-store/
├── .DS_Store                   # Metadata macOS (se puede eliminar)
├── .env                        # Variables de entorno locales
├── .env.example                # Plantilla de variables de entorno
├── .eslintrc.json              # Configuración ESLint
├── .git/                       # Metadatos Git
├── .github/                    # Workflows y configuración GitHub
├── .gitignore                  # Exclusiones Git
├── .next/                      # Salida Next.js (dev/build)
├── .vscode/                    # Configuración del workspace VS Code
├── AUDIT_DOCUMENTATION.md      # Notas de auditoría
├── README.md                   # Intro del proyecto
├── app/                        # Next.js (App Router)
│   ├── actions/                # Server Actions por dominio
│   ├── admin/                  # Panel de administración
│   │   ├── layout.tsx          # Layout principal del área admin
│   │   ├── loading.tsx         # Pantalla de carga para rutas anidadas
│   │   ├── page.tsx            # Vista bienvenida/dashboard
│   │   ├── audit/              # Auditorías y bitácoras
│   │   ├── inventory/          # Gestión de inventario y órdenes
│   │   ├── persons/            # Personas (clientes/proveedores/usuarios)
│   │   ├── reports/            # Reportería y análisis
│   │   ├── sales/              # Módulo de ventas
│   │   ├── settings/           # Configuraciones administrativas
│   │   └── showcases/          # Demos / componentes de referencia
│   ├── api/                    # API Routes (auth/config)
│   ├── baseComponents/         # Diseño de sistema (Button, DataGrid, Dialog...)
│   ├── pointOfSale/            # Módulo POS
│   ├── globalstate/            # Estado cliente compartido (alertas, permisos)
│   │   ├── alert/              # Stack de alertas y hook asociado
│   │   │   ├── AlertContext.tsx
│   │   │   └── useAlert.ts
│   │   └── permissions/        # Permisos derivados de next-auth y su hook
│   │       ├── PermissionsContext.tsx
│   │       └── usePermissions.ts
│   ├── ui/                     # Componentes específicos de negocio
│   ├── Providers.tsx           # Inyección de providers globales
│   └── global.css              # Estilos globales
├── app.config.example.json     # Configuración de muestra
├── app.config.json             # Configuración de desarrollo
├── app.config.prod.json        # Configuración de producción
├── app.config.test.json        # Configuración de testing
├── assets/                     # Splash screen, íconos y assets empaquetados
├── check-pallets.ts            # Script utilitario
├── check-table.js              # Script utilitario
├── cookies.txt                 # Datos de sesión (Electron)
├── data/                       # Conexión TypeORM, entidades, seeds
├── dist/                       # Salida compilada de Electron
├── forge.config.js             # Configuración Electron Forge
├── lib/                        # Utilidades puras (fechas, permisos, excel)
├── middleware.ts               # Middleware Next.js
├── next-env.d.ts               # Tipos de Next.js
├── next.config.js              # Configuración de Next.js
├── node_modules/               # Dependencias instaladas
├── out/                        # Artefactos de empaquetado
├── package-lock.json           # Lockfile npm
├── package.json                # Dependencias y scripts npm
├── playwright-report/          # Reportes Playwright
├── playwright.config.ts        # Config Playwright
├── postcss.config.js           # Configuración PostCSS
├── project/                    # Documentación funcional/técnica
├── public/                     # Archivos servidos por Next
├── run-seed.js                 # Script de seeds
├── scripts/                    # Scripts node (seed, migraciones, sync)
├── src/                        # Código del proceso principal de Electron
│   ├── main.dev.ts             # Entry point en modo desarrollo
│   ├── main.prod.ts            # Entry point en modo producción/standalone
│   └── utils/                  # Utilidades compartidas del proceso principal
│       ├── appUtils.ts         # Menús, configuración de app y helpers de Electron
│       ├── ipcHandlers.ts      # Handlers que responden a IPC (print, close, etc.)
│       ├── preload.js          # Bridge entre renderer y proceso principal
│       ├── processUtils.ts     # Gestión de procesos hijos (Next dev/standalone)
│       └── windowUtils.ts      # Creación de ventanas (splash, principal)
├── tailwind.config.js          # Configuración Tailwind CSS
├── test-results/               # Resultados de pruebas
├── tests/                      # Playwright y utilidades de QA
└── tsconfig.json               # Configuración TypeScript
```

### 3.1 Detalle de `app/globalstate/`

- **alert/**: encapsula toda la experiencia de notificaciones.
  - `AlertContext.tsx`: define el contexto, `AlertProvider` y helpers (`success`, `error`, etc.) que pintan el stack flotante de avisos.
  - `useAlert.ts`: módulo `use client` que reexporta el hook, simplificando las importaciones desde componentes cliente.
- **permissions/**: agrupa la lógica de permisos basada en la sesión actual.
  - `PermissionsContext.tsx`: deriva las abilities del usuario autenticado, expone utilidades `has`/`hasAny` y marca estados de carga en función de `next-auth`.
  - `usePermissions.ts`: hook `use client` que centraliza el consumo del contexto en componentes cliente.
- **Integración**: `app/Providers.tsx` compone `SessionProvider`, `AlertProvider` y `PermissionsProvider`, asegurando que cualquier ruta del App Router tenga acceso coherente a estas capacidades cliente.

---

## 4. Flujo de Ejecución

### 4.1 Desarrollo (`npm run dev`)

1. **Compilación del proceso principal** (`npm run build:electron`)
   - Ejecuta `tsc` sobre `src/**/*.ts` y deposita la salida en `dist/src`.
   - Limpia `.next/types` para evitar residuos de typings previos.
   - Copia `assets/` dentro de `dist/` (splash, íconos, recursos locales).
2. **Inicio de Electron** (`electron dist/src/main.dev.js`)
   - Fija `userData` en `~/.flow-store` para compartir cookies y sesiones entre reinicios.
   - Registra menús y atajos globales (`CommandOrControl+Shift+D` abre/cierra DevTools).
3. **Arranque del servidor Next.js**
   - `main.dev.ts` busca un puerto libre entre 3000 y 3010 (`getAvailablePort`).
   - Lanza `next dev -p {port}` mediante `spawn`, inyectando `PORT`, `NEXTAUTH_URL` y `NEXTAUTH_SECRET`.
   - Muestra `splash.html` mientras `waitForNextReady` valida que Next responde.
4. **Render de la UI**
   - Cierra el splash y crea un `BrowserWindow` apuntando a `http://localhost:{port}`.
   - React entra en ejecución y puede invocar Server Actions desde los componentes cliente.

#### Hot reload en desarrollo
- `next dev` recompila rutas, Server Actions y componentes con Fast Refresh.
- Los cambios en `src/main.*.ts` requieren reiniciar `npm run dev` (no hay watcher de Electron).
- `data/db.ts` mantiene un `DataSource` singleton, evitando fugas de conexiones al recargar.

### 4.2 Producción (`npm run start:prod`)

1. `npm run build:next` genera la salida standalone (`.next/standalone`).
2. `npm run copy:standalone` traslada `public/` y `.next/static` al bundle standalone.
3. `npm run build:electron` recompila el proceso principal y replica `assets/`.
4. `electron dist/src/main.prod.js`:
  - Resuelve rutas dependiendo de `app.isPackaged` para ubicar `server.js` (standalone).
  - Inicia el servidor Next con `fork`, redirigiendo logs a `~/.flow-store/next-server.log`.
  - Configura variables (`NODE_ENV=production`, `PORT`, `NEXTAUTH_URL`, `HOSTNAME`).
  - Mantiene el splash al menos 4s mientras espera a `waitForNextReady`.
  - Abre la ventana principal y registra accesos directos.

#### Resiliencia en producción
- Logs del proceso principal en `~/.flow-store/main.log` con rotación simple.
- Manejo de señales `SIGINT`/`SIGTERM` para cerrar Electron y Next sin procesos huérfanos.
- Validación de rutas en Windows para evitar ejecuciones desde UNC o carpetas compartidas (`\\`, `\\psf\\`, `C:\\Mac\\`).

### 4.3 Procesos en paralelo

| Proceso | Quién lo lanza | Responsabilidad |
|---------|----------------|-----------------|
| Electron (main) | CLI `electron` | Ventanas, menús, IPC, señales del sistema |
| Next.js (dev/standalone) | `spawn` o `fork` desde el main | Enrutamiento, SSR, Server Actions |
| React (renderer) | BrowserWindow | Renderiza la UI cliente y gestiona la interacción |
| MySQL | Servicio externo | Persistencia consultada por TypeORM |

---

## 5. Server Actions y flujo de datos

- Cada archivo en `app/actions/*.ts` define funciones `'use server'` que viven en el runtime de Next.
- Los componentes `'use client'` importan estas acciones; Next serializa la invocación, la ejecuta en el servidor y devuelve el resultado.
- `data/db.ts` implementa un `DataSource` singleton con reintentos exponenciales, evitando `ER_CON_COUNT_ERROR` y registros duplicados de subscribers.
- Las acciones encapsulan validaciones, permisos y operaciones de negocio antes de tocar la base de datos.

```typescript
// app/actions/products.ts
'use server'

import { getDb } from '@/data/db';
import { Product } from '@/data/entities/Product';

export async function getProducts() {
  const ds = await getDb();
  return ds.getRepository(Product).find();
}

export async function createProduct(data: CreateProductDTO) {
  const ds = await getDb();
  const repo = ds.getRepository(Product);
  const product = repo.create(data);
  return repo.save(product);
}
```

```tsx
// Uso en componente (cliente)
'use client'

import { useEffect, useState } from 'react';
import { getProducts, createProduct } from '@/app/actions/products';

export function ProductList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getProducts().then(setItems);
  }, []);

  const handleCreate = async (payload: CreateProductDTO) => {
    const created = await createProduct(payload);
    setItems(prev => [...prev, created]);
  };

  return null;
}
```

---

## 6. Configuración

### 6.1 Archivos `app.config.*.json`

| Archivo | Uso |
|---------|-----|
| `app.config.json` | Configuración por defecto (desarrollo) |
| `app.config.test.json` | Credenciales aisladas para pruebas automatizadas |
| `app.config.prod.json` | Configuración empaquetada para producción |

`data/db.ts` selecciona el archivo usando `NODE_ENV` y, opcionalmente, la variable `CONFIG_PATH`. El resolver busca el JSON en el directorio actual y hasta dos niveles superiores, lo que funciona tanto en dev como en el bundle standalone.

```json
{
  "appName": "FlowStore",
  "dataBase": {
    "host": "localhost",
    "name": "flow-store",
    "username": "root",
    "password": "redbull90"
  }
}
```

> Nota: el código contempla tanto `dataBase` como `database` para mantener compatibilidad con configuraciones anteriores.

### 6.2 Variables de entorno clave

| Variable | Quién la define | Propósito |
|----------|-----------------|-----------|
| `NODE_ENV` | Scripts npm | Controla el modo (development, test, production) |
| `NEXTAUTH_URL` | `main.dev.ts` / `main.prod.ts` | URL base que usa NextAuth |
| `NEXTAUTH_SECRET` | `main.dev.ts` / `main.prod.ts` | Secret criptográfico de sesiones |
| `PORT` | Proceso principal | Puerto HTTP asignado al servidor Next |
| `CONFIG_PATH` | Scripts/tests (opcional) | Fuerza la ruta del archivo de configuración |

---

## 7. Comunicación IPC (Electron ↔ Next)

El proceso principal registra handlers con `ipcMain.handle` y el preload los expone en `window.electron` para que la UI interactúe sin escapar del sandbox.

```typescript
// main.dev.ts / main.prod.ts
ipcMain.handle('closeApp', closeAppHandler);
ipcMain.handle('openLocationSettings', openLocationSettingsHandler);
ipcMain.handle('print-html', silentPrintHandler);
```

```typescript
// preload.ts
contextBridge.exposeInMainWorld('electron', {
  closeApp: () => ipcRenderer.invoke('closeApp'),
  openLocationSettings: () => ipcRenderer.invoke('openLocationSettings'),
  printHtml: (html: string) => ipcRenderer.invoke('print-html', html),
});
```

```tsx
// Uso en React
window.electron.printHtml('<html>...</html>');
```

- La UI permanece desacoplada del proceso principal.
- Cualquier canal nuevo debe definirse en ambos lados para conservar tipado y seguridad.

---

## 8. Build & Packaging

```bash
# Desarrollo (Electron + Next dev server)
npm run dev

# Build completo (Next standalone + Electron dist)
npm run build

# Ejecutar el build en modo producción local
npm run start:prod

# Empaquetado
npm run pack:mac   # Paquete .app/.dmg
npm run pack:win   # Paquete .exe (Squirrel)
npm run make:mac   # Crea instalador según makers
npm run make:win
```

- `electron-forge` gestiona los makers configurados (`dmg`, `zip`, `squirrel`, `deb`, `rpm`).
- `build:electron` limpia `.next/types` antes de `tsc` para evitar conflictos.
- `copy:standalone` asegura que `public/` y `.next/static` acompañen al bundle standalone.
- Ejecutar `npm run build` antes de distribuir garantiza consistencia entre Electron y Next.

---

## 9. Persistencia y Seeds

- `data/entities/` modela las tablas MySQL, y `AuditSubscriber` centraliza auditorías.
- `getDb()` aplica reintentos exponenciales (1s, 2s, 4s) ante fallos de conexión y destruye/recrea el `DataSource` si un ping falla.
- Seeds y sincronizaciones disponibles:

```bash
npm run seed            # Seeds base en entorno test
npm run seed:prod       # Seeds específicos para producción
npm run sync-db         # Sincroniza esquemas entre bases
```

---

## 10. Testing y QA

- Playwright vive en `tests/` con scripts de setup/seed en `tests/scripts/`.
- `npm run test:e2e` ejecuta la suite headless; `npm run test:e2e:ui` abre el inspector.
- En modo `NODE_ENV=test`, `main.dev.ts` omite el splash y usa un `NEXTAUTH_SECRET` diferente para los escenarios automatizados.
- Reportes se guardan en `test-results/` y `playwright-report/`.

---

## 11. Observabilidad y Depuración

- Revisar `~/.flow-store/main.log` y `next-server.log` para diagnosticar problemas en producción.
- Si la app tarda en iniciar, verificar puertos ocupados (Electron buscará otro entre 3000-3010).
- Errores de base de datos suelen relacionarse con `app.config.*.json` faltante o credenciales inválidas.
- Cambios de UI se reflejan al instante con Next; cambios en el proceso principal requieren reiniciar `npm run dev`.

---

Con esta referencia se puede seguir todo el ciclo de vida de FlowStore: cómo se arranca el runtime híbrido, cómo fluyen las acciones hacia MySQL, qué comandos de build intervienen y dónde depurar cuando algo falla.

