import { test, expect, Page } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { DBHelper } from '../../helpers/db-helper';

/**
 * E2E Tests para la gestión de Clientes
 * 
 * Cubre:
 * - Listado de clientes
 * - Creación de nuevos clientes
 * - Búsqueda de clientes
 * - Actualización de clientes
 */

test.describe('Customer Management Tests', () => {
  let appHelper: AppHelper;
  let authHelper: AuthHelper;
  let dbHelper: DBHelper;
  let page: Page;

  // Setup: Lanzar la aplicación y hacer login UNA SOLA VEZ para todos los tests
  test.beforeAll(async () => {
    appHelper = new AppHelper();
    await appHelper.launch();
    
    page = appHelper.getWindow();
    authHelper = new AuthHelper(page);
    dbHelper = new DBHelper();
    await dbHelper.connect();

    // Limpiar completamente la sesión inicial
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

    // Hacer login UNA SOLA VEZ
    await authHelper.login('test_admin', 'test123456');
    
    // Navegar a la página de clientes UNA SOLA VEZ
    await page.goto('http://localhost:3000/home/dispatch/customers', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(500);
  });

  // Teardown: Cerrar la aplicación solo al final de todos los tests
  test.afterAll(async () => {
    if (dbHelper) {
      await dbHelper.disconnect();
    }
    await appHelper.close();
  });

    // Setup para cada test: Solo navegar a la página de clientes (sesión mantenida)
  test.beforeEach(async () => {
    // Solo navegar a la página de clientes, manteniendo la sesión activa
    await page.goto('http://localhost:3000/home/dispatch/customers', { 
      waitUntil: 'networkidle' 
    });
    await page.waitForTimeout(1000);
  });

  test('debe crear un nuevo cliente', async () => {
    // Arrange
    const customerName = `Test Customer ${Date.now()}`;
    const customerDni = `12345678-${Math.floor(Math.random() * 10)}`;
    const customerMail = `test-${Date.now()}@example.com`;
    const customerPhone = '987654321';
    const customerAddress = 'Calle Falsa 123';

    // Act
    // 1. Abrir el diálogo de creación
    const addButton = page.locator('[data-test-id="add-button"]');
    await addButton.waitFor({ state: 'visible', timeout: 15000 });
    await addButton.click();

    // 2. Llenar el formulario
    await page.locator('[data-test-id="input-name"]').fill(customerName);
    await page.locator('[data-test-id="input-dni"]').fill(customerDni);
    await page.locator('[data-test-id="input-mail"]').fill(customerMail);
    await page.locator('[data-test-id="input-phone"]').fill(customerPhone);
    await page.locator('[data-test-id="input-address"]').fill(customerAddress);

        // 3. Enviar el formulario
    const submitButton = page.locator('[data-test-id="submit-button"]');
    await submitButton.click();

    // 4. Esperar a que el diálogo se cierre y la página se recargue
    // El diálogo tiene un setTimeout de 500ms y luego hace reload
    await page.waitForTimeout(4000);

    // Assert
    // Buscar el nuevo cliente en la lista
    const searchInput = page.locator('input[name="datagrid-search"]');
    await searchInput.fill(customerName);
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-test-id="data-grid-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await expect(firstRow).toContainText(customerName);
  });

  test('debe mostrar lista de clientes después del login', async () => {
    // Act & Assert
    // Esperar a que el DataGrid esté visible
    const dataGrid = page.locator('[data-test-id="data-grid-root"]');
    await expect(dataGrid).toBeVisible({ timeout: 15000 });

    // Verificar que el título o algún elemento del grid esté presente
    const header = page.locator('[data-test-id="data-grid-header"]');
    await expect(header).toBeVisible();
  });

  test('debe buscar clientes por nombre', async () => {
    // Arrange
    // Asumimos que existe al menos un cliente o usamos el creado anteriormente
    const searchQuery = 'Test Customer';
    
    // Act
    const searchInput = page.locator('input[name="datagrid-search"]');
    await searchInput.fill(searchQuery);
    await page.waitForTimeout(1000);

    // Assert
    const rows = page.locator('.data-grid-row');
    const count = await rows.count();
    if (count > 0) {
      const firstRowName = rows.first().locator('span').first();
      await expect(firstRowName).toContainText(searchQuery);
    }
  });

  test('debe actualizar un cliente existente', async () => {
    // Arrange
    const updatedName = `Updated Customer ${Date.now()}`;
    
    // Act
    // 1. Buscar el primer cliente
    const editButton = page.locator('[data-test-id^="edit-customer-"]').first();
    await editButton.click();

    // 2. Cambiar el nombre
    const nameInput = page.locator('[data-test-id="input-name"]');
    await nameInput.fill(updatedName);

    // 3. Enviar
    const submitButton = page.locator('[data-test-id="submit-button"]');
    await submitButton.click();

    // 4. Esperar recarga
    await page.waitForTimeout(2000);

    // Assert
    const searchInput = page.locator('input[name="datagrid-search"]');
    await searchInput.fill(updatedName);
    await page.waitForTimeout(1000);

    const firstRowName = page.locator('.data-grid-row').first().locator('span').first();
    await expect(firstRowName).toContainText(updatedName);
  });
});
