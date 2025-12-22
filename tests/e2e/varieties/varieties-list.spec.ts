import { test, expect, Page } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { DBHelper } from '../../helpers/db-helper';

/**
 * E2E Tests para listado y búsqueda de Variedades
 * 
 * Estos tests se enfocan en las operaciones que funcionan bien en Electron:
 * - Listado de variedades
 * - Búsqueda y filtrado de variedades
 */

test.describe('Variety List Tests', () => {
  let appHelper: AppHelper;
  let authHelper: AuthHelper;
  let dbHelper: DBHelper;
  let page: Page;

  test.beforeEach(async () => {
    // Lanzar la aplicación Electron
    appHelper = new AppHelper();
    await appHelper.launch();
    
    page = appHelper.getWindow();
    authHelper = new AuthHelper(page);
    dbHelper = new DBHelper();
    await dbHelper.connect();

    // Limpiar la sesión
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navegar a la página de login
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(500);

    // Hacer login
    await authHelper.login('test_admin', 'test123456');
    
    // Navegar a la página de variedades
    await page.goto('http://localhost:3000/home/varieties', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    // Cerrar la aplicación
    if (appHelper) {
      await appHelper.close().catch(() => {
        // Ignorar errores al cerrar
      });
    }
    if (dbHelper) {
      await dbHelper.disconnect().catch(() => {
        // Ignorar errores al desconectar
      });
    }
  });

  test('debe mostrar lista de variedades después del login', async () => {
    // Act & Assert
    // Esperar a que la lista de variedades esté visible
    const varietiesListContainer = page.locator('[data-test-id="varieties-list-container"]');
    await varietiesListContainer.waitFor({ state: 'visible', timeout: 5000 });

    // Verificar que hay al menos un elemento en la lista (las variedades seeded)
    const varietyCards = page.locator('[data-test-id^="variety-card-"]');
    const count = await varietyCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('debe buscar variedades por nombre', async () => {
    // Arrange
    const searchQuery = 'Variedad Test 1';
    
    // Act
    // Esperar a que el contenedor de búsqueda sea visible
    const searchInput = page.locator('[data-test-id="varieties-search-input"]');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Llenar el campo de búsqueda
    await searchInput.fill(searchQuery);
    await page.waitForTimeout(1000);
    
    // Assert
    // Verificar que el nombre de la variedad aparece en los resultados
    const varietyCardText = page.getByText(searchQuery);
    await varietyCardText.waitFor({ state: 'visible', timeout: 5000 });
    expect(await varietyCardText.isVisible()).toBe(true);
  });

  test('debe mostrar mensaje vacío cuando no hay resultados de búsqueda', async () => {
    // Arrange
    const searchQuery = 'NoExisteVariedad123XYZ';
    
    // Act
    const searchInput = page.locator('[data-test-id="varieties-search-input"]');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    
    await searchInput.fill(searchQuery);
    await page.waitForTimeout(1000);
    
    // Assert
    // Verificar que aparece el mensaje de vacío
    const emptyMessage = page.locator('[data-test-id="varieties-empty-message"]');
    await emptyMessage.waitFor({ state: 'visible', timeout: 5000 });
    expect(await emptyMessage.isVisible()).toBe(true);
  });
});
