# ElectNextStart

Proyecto base que combina Next.js con Electron para crear aplicaciones de escritorio modernas.

## Tecnologías

- **Next.js 15.3.3** - Framework React para aplicaciones web
- **Electron** - Framework para aplicaciones de escritorio
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework CSS utilitario
- **React Context API** - Gestión de estado global

## Scripts

- `npm run dev` - Inicia el servidor de desarrollo Next.js
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia la aplicación Electron
- `npm run electron:dev` - Inicia Electron en modo desarrollo

## Estructura del Proyecto

```
├── app/                    # Directorio de la aplicación Next.js
│   ├── components/         # Componentes reutilizables
│   ├── componentsShowcases/# Páginas de showcase de componentes
│   ├── state/              # Gestión de estado
│   │   ├── contexts/       # Contextos React
│   │   └── hooks/          # Hooks personalizados
│   ├── Providers.tsx       # Proveedores globales
│   └── layout.tsx          # Layout principal
├── electron/               # Código específico de Electron
│   ├── main.ts            # Proceso principal
│   └── preload.ts         # Script de preload
├── public/                # Archivos estáticos
└── assets/                # Recursos adicionales
```

## Componentes Disponibles

- **Alert** - Sistema de notificaciones con Context API
- **Button** - Botones con múltiples variantes
- **TextField** - Campos de entrada de texto
- **Select** - Selectores desplegables
- **IconButton** - Botones con iconos
- **AutoComplete** - Campos de autocompletado
- **DropdownList** - Listas desplegables

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación

```bash
npm install
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo Next.js
npm run dev

# En otra terminal, iniciar Electron
npm run electron:dev
```

## Construcción

```bash
# Construir para producción
npm run build

# Iniciar aplicación Electron empaquetada
npm start
```

## Configuración de Base de Datos

El proyecto está configurado para usar **Aiven** como base de datos MySQL. La configuración se maneja automáticamente según el entorno:

### Entornos

- **Desarrollo**: Usa `app.config.json`
- **Test**: Usa `app.config.test.json`
- **Producción**: Usa `app.config.prod.json`

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
# Base de datos de producción (Aiven)
DB_HOST=berries-a-felipe-6f5f.j.aivencloud.com
DB_PORT=17139
DB_USER=avnadmin
DB_PASSWORD=AVNS_6bx-z8_xReMMKCvNrG9
DB_NAME=defaultdb

# Base de datos de test (misma que producción)
DB_HOST_TEST=berries-a-felipe-6f5f.j.aivencloud.com
DB_PORT_TEST=17139
DB_USER_TEST=avnadmin
DB_PASSWORD_TEST=AVNS_6bx-z8_xReMMKCvNrG9
DB_NAME_TEST=defaultdb

# NextAuth
NEXTAUTH_SECRET=tu-secreto-aqui
NEXTAUTH_URL=http://localhost:3000

# Entorno
NODE_ENV=development
```

### Scripts de Base de Datos

```bash
# Ejecutar seed en entorno de test
npm run seed:test

# Ejecutar seed en entorno de producción
npm run seed:prod

# Sincronizar esquemas de base de datos
npm run sync-db
```

## Uso del Sistema de Alertas

El proyecto incluye un sistema completo de alertas basado en Context API:

```typescript
import { useAlert } from '@/app/state/hooks/useAlert';

function MyComponent() {
  const { success, error, info, warning } = useAlert();

  const handleAction = () => {
    success('¡Operación exitosa!');
  };

  return <button onClick={handleAction}>Acción</button>;
}
```

## Variables CSS Personalizadas

El proyecto utiliza variables CSS para temas consistentes:

```css
:root {
  --color-primary: #your-primary-color;
  --color-secondary: #your-secondary-color;
  --color-accent: #your-accent-color;
  --color-background: #your-background-color;
  --color-muted: #your-muted-color;
}
```

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Empaquetado para Mac (`pack:mac`)

El comando `npm run pack:mac` realiza el empaquetado de la aplicación para macOS siguiendo estos pasos:

1. **Construcción Next.js standalone**
   - Ejecuta `cd next && npx next build` para generar la build optimizada de Next.js en modo standalone dentro de `next/.next/standalone/`.

2. **Limpieza y build de Electron**
   - Ejecuta `npm run build:electron` para limpiar solo la carpeta `.next` en la raíz (no afecta el build de Next.js), compilar TypeScript y copiar los assets a `dist/`.

3. **Copia de archivos standalone**
   - Ejecuta `npm run copy:standalone` para copiar los archivos públicos y estáticos de Next.js al directorio standalone.

4. **Empaquetado con Electron Forge**
   - Llama a `electron-forge package --platform=darwin` para crear la app `.app` de macOS.
   - El hook postPackage copia la carpeta `next/.next/standalone/next` y los archivos de configuración (`app.config*.json`) dentro del paquete final en `out/FlowStore-darwin-arm64/FlowStore.app/Contents/Resources/standalone/`.

### Resultado final
- El paquete generado contiene todo lo necesario para ejecutar la app Electron+Next.js en Mac, incluyendo el servidor Next.js standalone (`server.js`), assets y archivos de configuración.

> **Tip:** Si necesitas personalizar archivos incluidos, revisa el hook `postPackage` en `forge.config.js`.
