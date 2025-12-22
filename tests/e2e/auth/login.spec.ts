import { test, expect } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { DBHelper } from '../../helpers/db-helper';

/**
 * Tests E2E para Login
 * 
 * Casos de prueba:
 * 1. Login exitoso con credenciales válidas
 * 2. Error con credenciales inválidas (password incorrecto)
 * 3. Error con usuario inexistente
 * 4. Verificar registro de auditoría después de login
 */

test.describe('Login Tests', () => {
  let appHelper: AppHelper;
  let authHelper: AuthHelper;
  let dbHelper: DBHelper;

  // Setup: Lanzar la aplicación UNA SOLA VEZ para todos los tests
  test.beforeAll(async () => {
    appHelper = new AppHelper();
    await appHelper.launch();
    
    dbHelper = new DBHelper();
    await dbHelper.connect();
  });

  // Teardown: Cerrar la aplicación solo al final de todos los tests
  test.afterAll(async () => {
    if (dbHelper) {
      await dbHelper.disconnect();
    }
    await appHelper.close();
  });

  // Setup para cada test: Limpiar estado sin cerrar la app
  test.beforeEach(async () => {
    const page = appHelper.getWindow();
    authHelper = new AuthHelper(page);

    // Limpiar completamente la sesión sin cerrar la app
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Limpiar cualquier estado de NextAuth
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    });

    // Forzar navegación a la página de login
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    
    // Esperar a que el formulario de login esté visible
    await page.waitForSelector('input[name="username"]', {
      state: 'visible',
      timeout: 15000,
    });

    // Verificar que estamos en la página correcta
    const currentUrl = page.url();
    if (!currentUrl.includes('localhost:3000/') || currentUrl.includes('/home')) {
      console.log(`Unexpected URL after navigation: ${currentUrl}, retrying...`);
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    }
  });

  test('debe permitir login exitoso con credenciales válidas', async () => {
    // Arrange
    const username = 'test_admin';
    const password = 'test123456'; // Debe coincidir con la contraseña en global-setup.ts

    // Asegurarse de que estamos en la página de login
    const page = appHelper.getWindow();
    const currentUrl = page.url();
    if (!currentUrl.includes('/')) {
      await page.goto('http://localhost:3000/');
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    }

    // Act
    await authHelper.login(username, password);

    // Assert
    // Verificar que el usuario está autenticado
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    // Verificar que estamos en la página home
    const finalUrl = await appHelper.getCurrentUrl();
    expect(finalUrl).toContain('/home');

    // Verificar auditoría en base de datos
    const user = await dbHelper.findUserByUsername(username);
    expect(user).toBeTruthy();

    const audits = await dbHelper.findAuditsByUser(user!.id);
    const loginAudit = audits.find((a) => a.action === 'LOGIN');
    expect(loginAudit).toBeTruthy();
    expect(loginAudit?.entityName).toBe('User'); // Entidad que se está guardando
    expect(loginAudit?.entityId).toBe(user!.id); // Usa user ID como entityId
    expect(loginAudit?.createdAt).toBeTruthy();
  });

  test('debe mostrar error con password incorrecto', async () => {
    // Arrange
    const username = 'test_admin';
    const password = 'WrongPassword123!';

    // Llenar el formulario pero no hacer login automáticamente
    const page = appHelper.getWindow();
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Act & Assert
    // Esperar que aparezca el mensaje de error en el formulario
    await page.waitForSelector('.alert-error', { timeout: 5000 });
    const errorElement = await page.locator('.alert-error');
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('Usuario o contraseña incorrectos');

    // Verificar que seguimos en la página de login
    const isLoginPageVisible = await authHelper.isLoginPageVisible();
    expect(isLoginPageVisible).toBe(true);

    // Verificar que NO estamos autenticados
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(false);

    // Verificar auditoría de intento fallido
    const user = await dbHelper.findUserByUsername(username);
    if (user) {
      const audits = await dbHelper.findAuditsByUser(user.id);
      const failedLoginAudit = audits.find((a) => a.action === 'LOGIN_FAILED');
      expect(failedLoginAudit).toBeTruthy();
      expect(failedLoginAudit?.action).toBe('LOGIN_FAILED');
    }
  });

  test('debe mostrar error con usuario inexistente', async () => {
    // Arrange
    const username = 'usuario_inexistente';
    const password = 'Password123!';

    // Llenar el formulario
    const page = appHelper.getWindow();
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Act & Assert
    // Esperar que aparezca el mensaje de error en el formulario
    await page.waitForSelector('.alert-error', { timeout: 5000 });
    const errorElement = await page.locator('.alert-error');
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('Usuario o contraseña incorrectos');

    // Verificar que seguimos en la página de login
    const isLoginPageVisible = await authHelper.isLoginPageVisible();
    expect(isLoginPageVisible).toBe(true);

    // Verificar que el usuario NO existe en la base de datos
    const user = await dbHelper.findUserByUsername(username);
    expect(user).toBeNull();
  });

  test('debe registrar auditoría completa después de login exitoso', async () => {
    // Arrange
    const username = 'test_admin';
    const password = 'test123456'; // Debe coincidir con la contraseña en global-setup.ts

    // Limpiar auditorías previas
    await dbHelper.clearAudits();

    // Act
    await authHelper.login(username, password);

    // Assert
    const user = await dbHelper.findUserByUsername(username);
    expect(user).toBeTruthy();

    const audits = await dbHelper.findAuditsByUser(user!.id);
    expect(audits.length).toBeGreaterThan(0);

    const loginAudit = audits.find((a) => a.action === 'LOGIN');
    expect(loginAudit).toBeTruthy();
    expect(loginAudit?.entityName).toBe('User'); // Entidad que se está guardando
    expect(loginAudit?.entityId).toBe(user!.id); // Usa user ID como entityId
    expect(loginAudit?.createdAt).toBeTruthy();

    // Verificar estadísticas de auditoría
    const stats = await dbHelper.getAuditStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.byAction['LOGIN_SUCCESS']).toBeGreaterThan(0);
  });

  test('debe mantener sesión después de recargar página', async () => {
    // Arrange
    const username = 'test_admin';
    const password = 'test123456'; // Debe coincidir con la contraseña en global-setup.ts

    // Act
    await authHelper.login(username, password);

    // Verificar que estamos autenticados
    let isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    // Recargar la página
    await appHelper.reload();

    // Assert
    // Verificar que seguimos autenticados después de recargar
    isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    // Verificar que seguimos en página home
    const currentUrl = await appHelper.getCurrentUrl();
    expect(currentUrl).toContain('/home');
  });
});
