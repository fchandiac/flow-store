import { test, expect, Page } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';
import { DBHelper } from '../../helpers/db-helper';

const VARIETY_NAME = 'VariedadTestE2E';
const VARIETY_NAME_UPDATED = 'VariedadTestE2E-Actualizada';
const PRICE_CLP = '15000';
const PRICE_USD = '18';

test.describe('Variety Management Tests', () => {
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
    // Cerrar la app y la conexión a BD
    if (appHelper) {
      await appHelper.close();
    }
    if (dbHelper) {
      await dbHelper.disconnect();
    }
  });

  test('Crear variedad con valores por defecto', async () => {
    // Esperar a que el contenedor de variedades sea visible
    const varietiesContainer = page.locator('[data-test-id="varieties-list-container"]');
    await varietiesContainer.waitFor({ state: 'visible', timeout: 5000 });

    // Abrir diálogo de creación
    await page.getByTestId('varieties-add-button').click();
    await page.waitForTimeout(500);

    // Verificar valores por defecto
    const priceCLPInput = page.getByLabel('Precio CLP');
    await priceCLPInput.waitFor({ state: 'visible', timeout: 5000 });
    await expect(priceCLPInput).toHaveValue('0');
    await expect(page.getByLabel('Precio USD')).toHaveValue('0');

    // Cerrar diálogo presionando Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('Listado de variedades y filtro de búsqueda', async () => {
    // Esperar a que el contenedor de variedades sea visible
    const varietiesContainer = page.locator('[data-test-id="varieties-list-container"]');
    await varietiesContainer.waitFor({ state: 'visible', timeout: 5000 });

    // Esperar a que el grid de variedades sea visible
    const varietiesGrid = page.locator('[data-test-id="varieties-grid"]');
    await varietiesGrid.waitFor({ state: 'visible', timeout: 5000 });

    // Filtro: buscar una variedad inexistente
    const searchInput = page.locator('[data-test-id="varieties-search-input"]');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('NoExisteVariedad123XYZ');
    await page.waitForTimeout(1000);
    
    // Verificar mensaje de vacío
    const emptyMessage = page.getByTestId('varieties-empty-message');
    await emptyMessage.waitFor({ state: 'visible', timeout: 5000 });

    // Limpiar filtro
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    // Verificar que las variedades vuelven a aparecer
    await varietiesGrid.waitFor({ state: 'visible', timeout: 5000 });
  });

  test('Creación, actualización, eliminación y auditoría', async () => {
    // Esperar a que el contenedor de variedades sea visible
    const varietiesContainer = page.locator('[data-test-id="varieties-list-container"]');
    await varietiesContainer.waitFor({ state: 'visible', timeout: 5000 });

    // 1. Crear variedad
    await page.getByTestId('varieties-add-button').click();
    await page.waitForTimeout(500);
    
    // Esperar a que el diálogo se abra
    await page.waitForSelector('input[value="0"]', { timeout: 5000 });
    
    // Rellenar formulario
    await page.getByLabel('Nombre de la variedad').fill(VARIETY_NAME);
    await page.getByLabel('Precio CLP').clear();
    await page.getByLabel('Precio CLP').fill(PRICE_CLP);
    await page.getByLabel('Precio USD').clear();
    await page.getByLabel('Precio USD').fill(PRICE_USD);
    
    // Enviar formulario
    await page.getByText('Crear Variedad').click();
    await page.waitForTimeout(2000);

    // Esperar a que la variedad aparezca en el listado
    const varietyText = page.getByText(VARIETY_NAME);
    await varietyText.waitFor({ state: 'visible', timeout: 5000 });

    // 2. Filtro por la variedad creada
    const searchInput = page.locator('[data-test-id="varieties-search-input"]');
    await searchInput.fill(VARIETY_NAME);
    await page.waitForTimeout(500);
    await varietyText.waitFor({ state: 'visible', timeout: 5000 });
    
    // Limpiar filtro
    await searchInput.clear();
    await page.waitForTimeout(500);

    // 3. Actualizar variedad
    const editButtons = page.locator('[data-test-id*="edit-button"]');
    await editButtons.first().waitFor({ state: 'visible', timeout: 5000 });
    await editButtons.first().click();
    await page.waitForTimeout(500);

    // Cambiar nombre
    const nameInput = page.getByLabel('Nombre de la variedad');
    await nameInput.clear();
    await nameInput.fill(VARIETY_NAME_UPDATED);
    await page.waitForTimeout(300);
    
    // Enviar actualización
    await page.getByText('Actualizar Variedad').click();
    await page.waitForTimeout(2000);
    
    const updatedText = page.getByText(VARIETY_NAME_UPDATED);
    await updatedText.waitFor({ state: 'visible', timeout: 5000 });

    // 4. Verificar auditoría de creación y actualización
    await page.goto('http://localhost:3000/home/audit', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(1000);
    
    // Verificar que hay registros de auditoría
    const auditText = await page.locator('body').textContent();
    expect(auditText).toContain('CREATE');

    // 5. Volver a variedades y eliminar
    await page.goto('http://localhost:3000/home/varieties', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(1000);

    // Esperar a que la variedad actualizada esté visible
    await varietiesContainer.waitFor({ state: 'visible', timeout: 5000 });
    await updatedText.waitFor({ state: 'visible', timeout: 5000 });

    // Buscar el botón de eliminar
    const deleteButtons = page.locator('[data-test-id*="delete-button"]');
    await deleteButtons.first().waitFor({ state: 'visible', timeout: 5000 });
    await deleteButtons.first().click();
    await page.waitForTimeout(500);

    // Confirmar eliminación
    await page.getByRole('button', { name: /eliminar/i }).click();
    await page.waitForTimeout(2000);
    
    await updatedText.waitFor({ state: 'hidden', timeout: 5000 });

    // 6. Verificar auditoría de eliminación
    await page.goto('http://localhost:3000/home/audit', { 
      waitUntil: 'domcontentloaded' 
    });
    await page.waitForTimeout(1000);
    
    const auditTextDelete = await page.locator('body').textContent();
    expect(auditTextDelete).toContain('DELETE');
  });
});
