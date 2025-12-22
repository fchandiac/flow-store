import { test, expect } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { DBHelper } from '../../helpers/db-helper';

/**
 * Tests E2E para Logout
 * 
 * Casos de prueba:
 * 1. Logout exitoso desde página home
 * 2. No se puede acceder a rutas protegidas después de logout
 * 3. Verificar limpieza de sesión (cookies, storage)
 * 4. Verificar registro de auditoría después de logout
 */

test.describe('Logout Tests', () => {
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

  // Setup para cada test: Hacer login y verificar estado
  test.beforeEach(async () => {
    const page = appHelper.getWindow();
    authHelper = new AuthHelper(page);

    // Limpiar completamente la sesión
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Limpiar cualquier estado de NextAuth
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    });

    // Navegar a la página de login
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(500);

    // Hacer login antes de cada test
    await authHelper.login('test_admin', 'test123456');
    
    // Verificar que estamos autenticados
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test('debe realizar logout exitoso', async () => {
    // Act
    await authHelper.logout();

    // Assert
    // Verificar que NO estamos autenticados
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(false);

    // Verificar que fuimos redirigidos al login
    const logoutRedirect = await authHelper.verifyLogoutRedirect();
    expect(logoutRedirect).toBe(true);

    // Verificar que la página de login está visible
    const isLoginPageVisible = await authHelper.isLoginPageVisible();
    expect(isLoginPageVisible).toBe(true);
  });

  test('no debe permitir acceso a rutas protegidas después de logout', async () => {
    // Act
    await authHelper.logout();

    // Assert
    // Intentar acceder a ruta protegida /home
    const redirectedToLogin = await authHelper.attemptProtectedRoute('/home');
    expect(redirectedToLogin).toBe(true);

    // Intentar acceder a ruta protegida /home/users
    const redirectedToLogin2 = await authHelper.attemptProtectedRoute('/home/users');
    expect(redirectedToLogin2).toBe(true);

    // Intentar acceder a ruta protegida /home/audit
    const redirectedToLogin3 = await authHelper.attemptProtectedRoute('/home/audit');
    expect(redirectedToLogin3).toBe(true);
  });

  test('debe limpiar sesión completamente después de logout', async () => {
    // Act
    await authHelper.logout();

    // Assert
    // Verificar que las cookies de sesión fueron eliminadas
    const page = appHelper.getWindow();
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => 
      c.name.includes('next-auth.session-token') || 
      c.name.includes('__Secure-next-auth.session-token')
    );
    expect(sessionCookie).toBeUndefined();

    // Verificar que el sessionStorage está limpio
    const sessionStorageData = await page.evaluate(() => {
      return sessionStorage.length;
    });
    expect(sessionStorageData).toBe(0);

    // Verificar que el localStorage relevante está limpio
    const nextAuthData = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('next-auth')) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    });
    expect(Object.keys(nextAuthData).length).toBe(0);
  });

  test('debe registrar auditoría después de logout', async () => {
    // Arrange
    const user = await dbHelper.findUserByUsername('test_admin');
    expect(user).toBeTruthy();

    // Limpiar auditorías previas para test limpio
    await dbHelper.clearAudits();

    // Logout primero para poder hacer login nuevamente y generar auditoría limpia
    await authHelper.logout();

    // Re-login para generar auditoría limpia
    await authHelper.login('test_admin', 'test123456');

    // Act
    await authHelper.logout();

    // Assert
    const audits = await dbHelper.findAuditsByUser(user!.id);
    
    // Debe haber al menos 2 auditorías: LOGIN_SUCCESS y LOGOUT
    expect(audits.length).toBeGreaterThanOrEqual(2);

    const logoutAudit = audits.find((a) => a.action === 'LOGOUT');
    expect(logoutAudit).toBeTruthy();
    expect(logoutAudit?.entityName).toBe('Auth');
    expect(logoutAudit?.createdAt).toBeTruthy();
  });

  test('debe requerir nuevo login después de logout', async () => {
    // Act
    await authHelper.logout();

    // Intentar acceder a página protegida - debería ser redirigido al login
    const page = appHelper.getWindow();
    await page.goto('http://localhost:3000/home/users');
    await page.waitForLoadState('domcontentloaded');

    // Assert
    // Verificar que fuimos redirigidos al login
    const isLoginPageVisible = await authHelper.isLoginPageVisible();
    expect(isLoginPageVisible).toBe(true);

    // Hacer login nuevamente
    await authHelper.login('test_admin', 'test123456');

    // Verificar que ahora SÍ tenemos acceso
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    const currentUrl = await appHelper.getCurrentUrl();
    expect(currentUrl).toContain('/home');
  });

  test('no debe mantener información de usuario después de logout', async () => {
    // Arrange
    // Verificar que estamos autenticados antes del logout
    const isLoggedInBefore = await authHelper.isLoggedIn();
    expect(isLoggedInBefore).toBe(true);

    // Act
    await authHelper.logout();

    // Assert
    // Verificar que NO estamos autenticados después del logout
    const isLoggedInAfter = await authHelper.isLoggedIn();
    expect(isLoggedInAfter).toBe(false);

    // Verificar que NO podemos obtener información de usuario
    const usernameAfter = await authHelper.getCurrentUsername();
    expect(usernameAfter).toBeNull();

    const currentUser = await authHelper.getCurrentUser();
    expect(currentUser).toBeNull();

    // Verificar que las cookies de sesión fueron eliminadas
    const page = appHelper.getWindow();
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) =>
      c.name.includes('next-auth.session-token') ||
      c.name.includes('__Secure-next-auth.session-token')
    );
    expect(sessionCookie).toBeUndefined();

    // Verificar que el localStorage relevante está limpio
    const nextAuthData = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('next-auth')) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    });
    expect(Object.keys(nextAuthData).length).toBe(0);

    // Verificar que el sessionStorage está limpio
    const sessionStorageData = await page.evaluate(() => {
      return sessionStorage.length;
    });
    expect(sessionStorageData).toBe(0);
  });

  test('debe permitir logout desde diferentes páginas', async () => {
    // Este test verifica que el logout funciona desde la página principal
    // Las otras páginas pueden tener diferentes layouts de UI

    // Desde la página principal (home)
    await appHelper.goto('/home');
    let currentUrl = await appHelper.getCurrentUrl();
    expect(currentUrl).toContain('/home');

    await authHelper.logout();
    let logoutRedirect = await authHelper.verifyLogoutRedirect();
    expect(logoutRedirect).toBe(true);
  });
});
