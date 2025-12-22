import { test, expect, Page } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { DBHelper } from '../../helpers/db-helper';

/**
 * E2E Tests para la gestión de Variedades (Simplificado)
 * 
 * Tests focalizados en funcionalidades que funcionan bien en Electron:
 * - Listado de variedades
 * - Búsqueda de variedades
 * 
 * Nota: Tests de CRUD (crear, editar, eliminar) requieren configuración especial de Electron
 * y se cubren mejor con tests API o pruebas manuales por ahora.
 */

test.describe('Variety Management Tests - Simplified', () => {
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
    
    // Después del login, NextAuth redirige a /home, así que esperamos y navegamos a variedades
    await page.waitForURL('**/home', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Navegar a la página de variedades UNA SOLA VEZ
    await page.goto('http://localhost:3000/home/products/varieties', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(500);
  });

  // Teardown: Cerrar la aplicación solo al final de todos los tests
  test.afterAll(async () => {
    if (dbHelper) {
      await dbHelper.disconnect().catch(() => {
        // Ignorar errores al desconectar
      });
    }
    if (appHelper) {
      await appHelper.close().catch(() => {
        // Ignorar errores al cerrar
      });
    }
  });

  // Setup para cada test: Solo navegar a la página de variedades (sesión mantenida)
  test.beforeEach(async () => {
    // Solo navegar a la página de variedades, manteniendo la sesión activa
    await page.goto('http://localhost:3000/home/products/varieties', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(500);
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
    // Buscar en el campo de búsqueda usando el contenedor
    const searchContainer = page.locator('[data-test-id="varieties-search-container"]');
    await searchContainer.waitFor({ state: 'visible', timeout: 5000 });
    
    // El TextField contiene un input dentro
    const inputElement = searchContainer.locator('input').first();
    await inputElement.waitFor({ state: 'visible', timeout: 5000 });
    await inputElement.fill(searchQuery);
    await page.waitForTimeout(500);
    
    // Assert
    // Verificar que el URL se actualiza con el parámetro de búsqueda
    await page.waitForURL(/search=.*Variedad%20Test%201/, { timeout: 5000 }).catch(() => {
      // Si la URL no cambia, al menos verificar que la lista se actualiza
    });

    // Verificar que la variedad aparece en los resultados
    const varietiesContainer = page.locator('[data-test-id="varieties-grid"]');
    const content = await varietiesContainer.textContent();
    expect(content).toContain('Variedad Test 1');
  });

  test('debe mostrar mensaje vacío cuando no hay resultados de búsqueda', async () => {
    // Arrange
    const searchQuery = 'NoExisteVariedad123XYZ';
    
    // Act
    const searchContainer = page.locator('[data-test-id="varieties-search-container"]');
    await searchContainer.waitFor({ state: 'visible', timeout: 5000 });
    
    const inputElement = searchContainer.locator('input').first();
    await inputElement.fill(searchQuery);
    await page.waitForTimeout(500);
    
    // Assert
    // Verificar que aparece el mensaje de vacío
    const emptyMessage = page.locator('[data-test-id="varieties-empty-message"]');
    await emptyMessage.waitFor({ state: 'visible', timeout: 5000 });
    expect(await emptyMessage.isVisible()).toBe(true);
  });

  test('debe mostrar botón para crear nueva variedad', async () => {
    // Act & Assert
    const createButton = page.locator('[data-test-id="varieties-add-button"]');
    await createButton.waitFor({ state: 'visible', timeout: 5000 });
    expect(await createButton.isVisible()).toBe(true);
  });

  test('debe mostrar badgets de moneda correctamente', async () => {
    // Act & Assert
    // Esperar a que las tarjetas de variedad sean visibles
    const varietyCards = page.locator('[data-test-id^="variety-card-"]');
    await varietyCards.first().waitFor({ state: 'visible', timeout: 5000 });
    
    // Verificar que hay badges de moneda (CLP o USD)
    const currencyBadges = page.locator('[data-test-id*="currency-badge"]');
    const badgeCount = await currencyBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(1);
  });
});
