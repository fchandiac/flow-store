# 🧪 Sistema de Testing E2E - ElectNextStart

Sistema completo de testing end-to-end usando Playwright para la aplicación Electron + Next.js.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura de Tests](#estructura-de-tests)
- [Helpers](#helpers)
- [Convenciones](#convenciones)
- [CI/CD](#cicd)

---

## 🎯 Descripción General

Este sistema de testing E2E está diseñado para probar la aplicación completa ElectNextStart, incluyendo:

- ✅ Autenticación (login, logout, sesiones)
- ✅ CRUD de usuarios
- ✅ Sistema de auditoría
- ✅ Navegación y rutas protegidas
- ✅ Integración con base de datos

**Framework:** Playwright (soporte nativo para Electron)
**Base de datos de test:** MySQL (`electnextstart_test`)
**Lenguaje:** TypeScript

---

## 🏗️ Arquitectura

```
tests/
├── e2e/                    # Tests end-to-end organizados por módulo
│   ├── auth/              # Tests de autenticación
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── users/             # Tests de gestión de usuarios
│   │   ├── create-user.spec.ts
│   │   └── search-users.spec.ts
│   └── audit/             # Tests de auditoría
│       └── audit.spec.ts
│
├── helpers/               # Clases helper para reutilización
│   ├── app-helper.ts     # Control de la app Electron
│   ├── auth-helper.ts    # Operaciones de autenticación
│   └── db-helper.ts      # Consultas a base de datos
│
├── scripts/              # Scripts de setup y seed
│   ├── setup-test-db.ts  # Crear/limpiar DB de test
│   └── seed-test-data.ts # Poblar datos iniciales
│
└── fixtures/             # Datos de test reutilizables
    └── users.json
```

---

## 📦 Instalación

### 1. Instalar dependencias

```bash
npm install
```

Las dependencias de Playwright ya están incluidas en `package.json`:
- `@playwright/test`
- `playwright`

### 2. Instalar browsers de Playwright

```bash
npx playwright install
```

Esto descarga Chromium, Firefox y WebKit.

---

## ⚙️ Configuración

### 1. Base de datos de test

Asegúrate de tener MySQL corriendo y edita `app.config.test.json` si es necesario:

```json
{
  "database": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "",
    "database": "electnextstart_test"
  }
}
```

### 2. Configuración de Playwright

La configuración está en `playwright.config.ts`:

- **Timeout por test:** 30 segundos
- **Reporters:** HTML, JSON, List, JUnit
- **Screenshots/Videos:** Solo en fallos
- **Traces:** Capturados en fallos (muy útil para debugging)

---

## 🚀 Uso

### Setup inicial (primera vez)

```bash
# 1. Crear base de datos de test
npm run test:setup

# 2. Poblar datos iniciales
npm run test:seed
```

### Ejecutar tests

```bash
# Ejecutar todos los tests (headless)
npm run test:e2e

# Ejecutar con interfaz gráfica (recomendado para desarrollo)
npm run test:e2e:ui

# Ejecutar en modo debug (paso a paso)
npm run test:e2e:debug

# Ejecutar con navegador visible
npm run test:e2e:headed

# Ejecutar un archivo específico
npx playwright test tests/e2e/auth/login.spec.ts

# Ejecutar tests que coincidan con un patrón
npx playwright test auth

# Ejecutar un test específico por nombre
npx playwright test -g "debe permitir login exitoso"
```

### Ver reportes

```bash
# Ver último reporte HTML
npm run test:report
```

Los reportes se generan en:
- `playwright-report/` - Reporte HTML interactivo
- `test-results/` - Screenshots, videos, traces

---

## 📝 Estructura de Tests

### Anatomía de un test

```typescript
import { test, expect } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { DBHelper } from '../../helpers/db-helper';

test.describe('Nombre del módulo', () => {
  let appHelper: AppHelper;
  let authHelper: AuthHelper;
  let dbHelper: DBHelper;

  // Setup: Antes de cada test
  test.beforeEach(async () => {
    appHelper = new AppHelper();
    await appHelper.launch();
    
    const window = appHelper.getWindow();
    authHelper = new AuthHelper(window);
    
    dbHelper = new DBHelper();
    await dbHelper.connect();
  });

  // Teardown: Después de cada test
  test.afterEach(async () => {
    await dbHelper.disconnect();
    await appHelper.close();
  });

  test('descripción del test', async () => {
    // Arrange: Preparar datos
    const username = 'test_admin';
    
    // Act: Ejecutar acción
    await authHelper.login(username, 'Admin123!');
    
    // Assert: Verificar resultado
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });
});
```

### Usuarios de test disponibles

Después de ejecutar `npm run test:seed`, tienes estos usuarios:

| Username | Password | Role |
|----------|----------|------|
| `test_admin` | `Admin123!` | admin |
| `test_user` | `User123!` | user |
| `test_viewer` | `Viewer123!` | viewer |

---

## 🛠️ Helpers

### AppHelper

Control de la aplicación Electron:

```typescript
// Lanzar app
await appHelper.launch();

// Obtener ventana principal
const window = appHelper.getWindow();

// Navegar
await appHelper.goto('/home/users');

// Esperar ruta
await appHelper.waitForRoute('/home');

// Screenshot
await appHelper.screenshot('error-state');

// Cerrar app
await appHelper.close();
```

### AuthHelper

Operaciones de autenticación:

```typescript
// Login
await authHelper.login('test_admin', 'Admin123!');

// Logout
await authHelper.logout();

// Verificar autenticación
const isLoggedIn = await authHelper.isLoggedIn();

// Obtener usuario actual
const username = await authHelper.getCurrentUsername();

// Esperar error de login
const errorMessage = await authHelper.waitForLoginError();

// Limpiar sesión
await authHelper.clearSession();
```

### DBHelper

Consultas a base de datos:

```typescript
// Conectar
await dbHelper.connect();

// Buscar usuario
const user = await dbHelper.findUserByUsername('test_admin');

// Contar usuarios activos
const count = await dbHelper.countActiveUsers();

// Buscar auditorías
const audits = await dbHelper.findAuditsByUser(userId);

// Limpiar datos de test
await dbHelper.clearAudits();
await dbHelper.deleteUserByUsername('temp_user');

// Estadísticas de auditoría
const stats = await dbHelper.getAuditStats();

// Desconectar
await dbHelper.disconnect();
```

---

## 📐 Convenciones

### Nomenclatura de tests

```typescript
// ✅ BIEN: Descriptivo y claro
test('debe permitir login exitoso con credenciales válidas', async () => {});
test('debe mostrar error con password incorrecto', async () => {});
test('debe registrar auditoría después de crear usuario', async () => {});

// ❌ MAL: Muy genérico
test('login works', async () => {});
test('test 1', async () => {});
```

### Organización

- **Un archivo por funcionalidad** (ej: `login.spec.ts`, `create-user.spec.ts`)
- **Agrupar con describe** tests relacionados
- **Setup/teardown consistente** en beforeEach/afterEach
- **Datos de test únicos** para evitar colisiones

### Assertions

```typescript
// ✅ BIEN: Específico
expect(user?.userName).toBe('test_admin');
expect(audits.length).toBeGreaterThan(0);
expect(errorMessage).toContain('Invalid credentials');

// ❌ MAL: Muy genérico
expect(user).toBeTruthy();
expect(result).not.toBeNull();
```

---

## 🔧 Debugging

### Opciones de debugging

1. **UI Mode** (recomendado):
   ```bash
   npm run test:e2e:ui
   ```
   - Ver tests en tiempo real
   - Time travel debugging
   - Ver traces y screenshots

2. **Debug Mode**:
   ```bash
   npm run test:e2e:debug
   ```
   - Pausa en cada acción
   - Consola de Playwright
   - Inspeccionar elementos

3. **Headed Mode**:
   ```bash
   npm run test:e2e:headed
   ```
   - Ver el navegador durante ejecución

4. **Screenshots manuales**:
   ```typescript
   await appHelper.screenshot('debug-point-1');
   ```

5. **Traces**:
   Los traces se capturan automáticamente en fallos. Ábrelos con:
   ```bash
   npx playwright show-trace test-results/.../trace.zip
   ```

---

## 🔄 CI/CD

### GitHub Actions

Ejemplo de workflow (`.github/workflows/test.yml`):

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Setup test database
        run: npm run test:setup
        env:
          DB_HOST: localhost
          DB_USER: root
          DB_PASSWORD: root
      
      - name: Seed test data
        run: npm run test:seed
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📊 Reportes

### HTML Report

Después de ejecutar tests:

```bash
npm run test:report
```

Abre un navegador con reporte interactivo mostrando:
- ✅ Tests pasados/fallados
- ⏱️ Tiempos de ejecución
- 📸 Screenshots de fallos
- 🎥 Videos de fallos
- 🔍 Traces completos

### JSON Report

Para integración con otras herramientas:

```bash
cat test-results/results.json
```

### JUnit Report

Para CI/CD:

```bash
cat test-results/junit.xml
```

---

## 🆘 Troubleshooting

### Problema: Tests fallan con timeout

**Solución:** Aumenta timeout en `playwright.config.ts`:

```typescript
timeout: 60000, // 60 segundos
```

### Problema: No se encuentra la app Electron

**Solución:** Verifica que `src/main.dev.ts` existe y compila:

```bash
npm run build:electron
```

### Problema: Base de datos no se conecta

**Solución:** Verifica credenciales en `app.config.test.json` y que MySQL esté corriendo.

### Problema: Selectores no funcionan

**Solución:** Usa Playwright Inspector para encontrar selectores correctos:

```bash
npx playwright test --debug
```

---

## 📚 Recursos

- [Playwright Documentation](https://playwright.dev)
- [Playwright Electron](https://playwright.dev/docs/api/class-electron)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

## 🎯 Próximos Pasos

1. Ejecutar setup inicial:
   ```bash
   npm run test:setup
   npm run test:seed
   ```

2. Ejecutar tests en UI mode:
   ```bash
   npm run test:e2e:ui
   ```

3. Revisar y ajustar selectores según tu UI real

4. Agregar más tests según necesidades

5. Configurar CI/CD con GitHub Actions

---

**¡Happy Testing! 🚀**
