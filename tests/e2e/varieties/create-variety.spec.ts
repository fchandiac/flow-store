import { test, expect } from '@playwright/test';
import { AppHelper } from '../../helpers/app-helper';
import { AuthHelper } from '../../helpers/auth-helper';

// Test para crear una variedad y verificar los valores por defecto

test.describe('Crear Variedad', () => {
  test('El campo descripción está vacío por defecto', async ({ page }) => {
    const appHelper = new AppHelper();
    const authHelper = new AuthHelper(page);
    
    await appHelper.launch(page);
    await authHelper.login('test_admin', 'test123456');
    
    await page.goto('/home/varieties');
    await page.getByTestId('varieties-add-button').click();
    await expect(page.getByLabel('Descripción')).toHaveValue('');
  });

  test('Crear variedad con valores válidos', async ({ page }) => {
    const appHelper = new AppHelper();
    const authHelper = new AuthHelper(page);
    
    await appHelper.launch(page);
    await authHelper.login('test_admin', 'test123456');
    
    await page.goto('/home/varieties');
    await page.getByTestId('varieties-add-button').click();
    await page.getByLabel('Nombre de la variedad').fill('TestVariedad');
    await page.getByLabel('Descripción').fill('Descripción de prueba');
    await page.getByTestId('varieties-create-dialog').getByText('Crear Variedad').click();
    await expect(page.getByText('TestVariedad')).toBeVisible();
  });
});
