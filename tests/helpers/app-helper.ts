import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * AppHelper - Helper para lanzar y controlar la aplicación Electron en tests E2E
 * 
 * Provee métodos para:
 * - Lanzar la aplicación con configuración de test
 * - Cerrar la aplicación limpiamente
 * - Navegar y esperar rutas
 * - Capturar screenshots para debugging
 */

export class AppHelper {
  private electronApp: ElectronApplication | null = null;
  private mainWindow: Page | null = null;

  /**
   * Lanzar la aplicación Electron con configuración de test
   */
  async launch(): Promise<void> {
    // Path al ejecutable de Electron para desarrollo
    const electronPath = require('electron');
    
    // Path al archivo principal de Electron (compilado)
    const mainPath = path.join(process.cwd(), 'dist', 'src', 'main.dev.js');
    
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Archivo principal de Electron no encontrado: ${mainPath}`);
    }

    // Variables de entorno para test
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      CONFIG_PATH: path.join(process.cwd(), 'app.config.json'),
      NEXTAUTH_URL: 'http://localhost:3002', // Match the port where the app runs
      NEXTAUTH_SECRET: 'test-secret-key-for-e2e-tests',
    };

    console.log('[AppHelper] Launching Electron with env:', {
      NODE_ENV: env.NODE_ENV,
      CONFIG_PATH: env.CONFIG_PATH,
      NEXTAUTH_URL: env.NEXTAUTH_URL,
    });

    // Lanzar Electron
    this.electronApp = await electron.launch({
      executablePath: electronPath as string,
      args: [mainPath],
      env,
      // Timeout para esperar que la app se inicie
      timeout: 30000,
    });

    // Esperar a que se cree la ventana principal
    this.mainWindow = await this.electronApp.firstWindow({
      timeout: 30000,
    });

    // Esperar a que la página esté completamente cargada
    await this.mainWindow.waitForLoadState('domcontentloaded', {
      timeout: 30000,
    });

    // Esperar adicionalmente a que Next.js esté listo
    await this.mainWindow.waitForLoadState('networkidle', {
      timeout: 30000,
    });

    // En lugar de navegar manualmente, vamos a esperar a que la aplicación
    // En modo test, la aplicación va directamente a Next.js sin splash screen
    console.log('Current URL after launch:', this.mainWindow.url());
    
    // Esperar a que Next.js esté listo y la página cargue
    console.log('Waiting for Next.js app to load...');
    await this.mainWindow.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    const currentUrl = this.mainWindow.url();
    console.log('Final URL:', currentUrl);
  }

  /**
   * Cerrar la aplicación limpiamente
   */
  async close(): Promise<void> {
    if (this.electronApp) {
      await this.electronApp.close();
      this.electronApp = null;
      this.mainWindow = null;
    }
  }

  /**
   * Obtener la ventana principal de la aplicación
   */
  getWindow(): Page {
    if (!this.mainWindow) {
      throw new Error('La aplicación no está iniciada. Llama a launch() primero.');
    }
    return this.mainWindow;
  }

  /**
   * Esperar a que la aplicación navegue a una ruta específica
   */
  async waitForRoute(route: string, options?: { timeout?: number }): Promise<void> {
    const page = this.getWindow();
    const timeout = options?.timeout || 10000;
    
    await page.waitForFunction(
      (expectedRoute) => {
        return window.location.pathname.includes(expectedRoute);
      },
      route,
      { timeout }
    );
  }

  /**
   * Capturar screenshot para debugging
   */
  async screenshot(name: string): Promise<Buffer> {
    const page = this.getWindow();
    const screenshotPath = path.join(
      process.cwd(),
      'test-results',
      'screenshots',
      `${name}-${Date.now()}.png`
    );
    
    // Crear directorio si no existe
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const screenshot = await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    return screenshot;
  }

  /**
   * Esperar a que un selector esté visible
   */
  async waitForSelector(selector: string, options?: { timeout?: number }): Promise<void> {
    const page = this.getWindow();
    await page.waitForSelector(selector, {
      state: 'visible',
      timeout: options?.timeout || 10000,
    });
  }

  /**
   * Hacer click en un elemento
   */
  async click(selector: string): Promise<void> {
    const page = this.getWindow();
    await page.click(selector);
  }

  /**
   * Llenar un input
   */
  async fill(selector: string, value: string): Promise<void> {
    const page = this.getWindow();
    await page.fill(selector, value);
  }

  /**
   * Obtener texto de un elemento
   */
  async getText(selector: string): Promise<string> {
    const page = this.getWindow();
    const element = await page.locator(selector);
    return await element.textContent() || '';
  }

  /**
   * Verificar si un elemento está visible
   */
  async isVisible(selector: string): Promise<boolean> {
    const page = this.getWindow();
    const element = await page.locator(selector);
    return await element.isVisible();
  }

  /**
   * Obtener la URL actual
   */
  async getCurrentUrl(): Promise<string> {
    const page = this.getWindow();
    return page.url();
  }

  /**
   * Navegar a una ruta (usando el router de Next.js)
   */
  async goto(route: string): Promise<void> {
    const page = this.getWindow();
    await page.evaluate((targetRoute) => {
      window.location.href = targetRoute;
    }, route);
    await this.waitForRoute(route);
  }

  /**
   * Esperar un tiempo específico (usar con moderación)
   */
  async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Recargar la página actual
   */
  async reload(): Promise<void> {
    const page = this.getWindow();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  }

  /**
   * Ejecutar código JavaScript en el contexto de la página
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    const page = this.getWindow();
    return await page.evaluate(fn);
  }

  /**
   * Obtener el título de la página
   */
  async getTitle(): Promise<string> {
    const page = this.getWindow();
    return await page.title();
  }

  /**
   * Verificar si la aplicación está activa
   */
  isRunning(): boolean {
    return this.electronApp !== null && this.mainWindow !== null;
  }

  /**
   * Obtener la aplicación Electron (para operaciones avanzadas)
   */
  getElectronApp(): ElectronApplication {
    if (!this.electronApp) {
      throw new Error('La aplicación no está iniciada. Llama a launch() primero.');
    }
    return this.electronApp;
  }
}
