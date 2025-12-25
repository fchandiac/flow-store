import { Page } from '@playwright/test';

/**
 * AuthHelper - Helper para operaciones de autenticación en tests E2E
 * 
 * Provee métodos para:
 * - Login de usuarios
 * - Logout
 * - Verificar estado de autenticación
 * - Obtener información del usuario actual
 */

export class AuthHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Realizar login con username y password usando sistema personalizado
   */
  async login(username: string, password: string): Promise<void> {
    // Primero verificar si ya estamos logueados (en página protegida)
    const currentUrl = this.page.url();
    if (currentUrl.includes('/admin') || currentUrl.includes('/pointOfSale')) {
      console.log('[AuthHelper] Already logged in, skipping login process');
      return;
    }

    // Esperar a que la página de login esté cargada
    await this.page.waitForSelector('input[data-test-id="login-username"]', {
      state: 'visible',
      timeout: 10000,
    });

    // Esperar un poco para asegurar que el DOM está estable
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(500);

    // Llenar el formulario de login usando los data-test-id
    const usernameInput = this.page.locator('input[data-test-id="login-username"]');
    await usernameInput.clear();
    await usernameInput.type(username, { delay: 50 });

    const passwordInput = this.page.locator('input[data-test-id="login-password"]');
    await passwordInput.clear();
    await passwordInput.type(password, { delay: 50 });

    // Hacer click en el botón de login
    const submitButton = this.page.locator('button[type="submit"]');
    await submitButton.click();

    // Esperar a que se complete la navegación después del login
    try {
      await this.page.waitForURL(/\/admin/, {
        timeout: 15000,
      });
    } catch (error) {
      // Verificar si hay errores en el formulario
      const errorElement = await this.page.locator('.alert-error').count();
      if (errorElement > 0) {
        const errorText = await this.page.locator('.alert-error').textContent();
        console.error(`[AuthHelper] Login failed with error: ${errorText}`);
        throw new Error(`Login failed: ${errorText}`);
      }
      
      const currentUrl = this.page.url();
      console.error(`[AuthHelper] Login failed. Current URL: ${currentUrl}`);
      throw error;
    }

    // Esperar a que se complete el proceso de autenticación
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(500);
  }

  /**
   * Realizar logout
   */
  async logout(): Promise<void> {
    // Hay dos botones de logout:
    // 1. En UserProfileDropdown (TopBar) - después de clickear el avatar/icono de usuario
    // 2. En SideBar - botón "Cerrar sesión" (necesita abrir el menu primero)
    
    console.log('[AuthHelper] Starting logout process...');
    const currentUrl = this.page.url();
    console.log('[AuthHelper] Current URL before logout:', currentUrl);
    
    // Intentar usar el UserProfileDropdown (TopBar)
    const profileButton = this.page.locator('button').filter({ hasText: /test_/ }).first();
    const isProfileButtonVisible = await profileButton.isVisible().catch(() => false);
    
    console.log('[AuthHelper] Profile button visible:', isProfileButtonVisible);
    
    if (isProfileButtonVisible) {
      // Click en el avatar/icono de usuario para abrir el dropdown
      console.log('[AuthHelper] Clicking profile button...');
      await profileButton.click();
      await this.page.waitForTimeout(500);
      
      // Buscar el botón "Cerrar Sesión" en el dropdown
      const logoutButtonInDropdown = this.page.locator('button').filter({ hasText: /Cerrar Sesión/ }).first();
      const isLogoutVisible = await logoutButtonInDropdown.isVisible().catch(() => false);
      
      console.log('[AuthHelper] Logout button in dropdown visible:', isLogoutVisible);
      
      if (isLogoutVisible) {
        console.log('[AuthHelper] Clicking logout button in dropdown...');
        await logoutButtonInDropdown.click();
      } else {
        throw new Error('[AuthHelper] Could not find logout button in dropdown or sidebar');
      }
    } else {
      // Si no hay perfil visible, intentar abrir el menu sidebar
      console.log('[AuthHelper] Profile not visible, trying to open sidebar...');
      
      // Buscar el botón de menu (hamburger) en el TopBar
      const menuButton = this.page.locator('[data-test-id="top-bar-menu-button"]');
      const isMenuButtonVisible = await menuButton.isVisible().catch(() => false);
      
      console.log('[AuthHelper] Menu button visible:', isMenuButtonVisible);
      
      if (isMenuButtonVisible) {
        console.log('[AuthHelper] Clicking menu button to open sidebar...');
        await menuButton.click();
        await this.page.waitForTimeout(500);
      }
      
      // Buscar el botón de logout en el SideBar
      const sidebarLogoutButton = this.page.locator('[data-test-id="side-bar-logout-btn"]');
      const isSidebarLogoutVisible = await sidebarLogoutButton.isVisible().catch(() => false);
      console.log('[AuthHelper] Sidebar logout button visible:', isSidebarLogoutVisible);
      
      if (!isSidebarLogoutVisible) {
        throw new Error('[AuthHelper] Could not find logout button in sidebar');
      }
      
      console.log('[AuthHelper] Clicking sidebar logout button...');
      await sidebarLogoutButton.click();
    }

    // Limpiar localStorage después del logout para evitar restauración automática
    await this.page.evaluate(() => {
      localStorage.removeItem('flow_session');
    });

    // Esperar a que se complete la navegación después del logout
    console.log('[AuthHelper] Waiting for redirect after logout...');
    await this.page.waitForTimeout(1500); // Esperar más tiempo para que se complete la redirección
    
    const urlAfterLogout = this.page.url();
    console.log('[AuthHelper] URL after logout:', urlAfterLogout);

    // Navegar a la página de login si no estamos ahí
    if (!urlAfterLogout.endsWith('/') && !urlAfterLogout.includes('/?')) {
      console.log('[AuthHelper] Navigating to login page...');
      await this.page.goto('/');
      await this.page.waitForTimeout(1000);
    }

    // Verificar que estamos en la página de login
    console.log('[AuthHelper] Waiting for login form to appear...');
    await this.page.waitForSelector('input[data-test-id="login-username"]', {
      state: 'visible',
      timeout: 10000,
    });
    
    console.log('[AuthHelper] Logout completed successfully');
  }

  /**
   * Verificar si el usuario está autenticado
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Verificar si existe algún elemento que solo aparece cuando el usuario está autenticado
      // Por ejemplo, el menú de usuario, un botón de logout, etc.
      
      // Opción 1: Verificar si estamos en una ruta protegida
      const currentUrl = this.page.url();
      if (currentUrl.includes('/home')) {
        return true;
      }

      // Opción 2: Verificar si existe un elemento de usuario autenticado
      const userElement = await this.page.locator('[aria-label="User menu"]').first();
      if (await userElement.isVisible().catch(() => false)) {
        return true;
      }

      // Opción 3: Verificar cookies de sesión
      const cookies = await this.page.context().cookies();
      const sessionCookie = cookies.find((c) => 
        c.name.includes('next-auth.session-token') || c.name.includes('__Secure-next-auth.session-token')
      );
      
      return !!sessionCookie;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener el username del usuario actual desde la UI
   */
  async getCurrentUsername(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user ? user.userName : null;
  }

  /**
   * Obtener información completa del usuario actual
   */
  async getCurrentUser(): Promise<{ userName: string; email: string } | null> {
    try {
      // Hacer una llamada al API de NextAuth para obtener la sesión
      const response = await this.page.request.get('/api/auth/session');
      if (response.ok()) {
        const session = await response.json();
        if (session?.user) {
          return {
            userName: session.user.name || '', // NextAuth usa 'name' en lugar de 'userName'
            email: session.user.email || '',
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Esperar a que aparezca un mensaje de error en el login
   */
  async waitForLoginError(timeout: number = 5000): Promise<string | null> {
    try {
      // NextAuth redirige a /auth/error cuando hay un error de login
      // Esperar a esa redirección
      console.log('[AuthHelper] Esperando redirección a /auth/error...');
      await this.page.waitForURL(/\/auth\/error/, {
        timeout,
      });

      const currentUrl = this.page.url();
      console.log('[AuthHelper] URL de error encontrada:', currentUrl);
      
      let errorMessage = null;
      
      // Intentar extraer el error de la URL primero
      try {
        const errorMatch = currentUrl.match(/error=([^&]+)/);
        if (errorMatch) {
          errorMessage = decodeURIComponent(errorMatch[1]);
          console.log('[AuthHelper] Login error captured from URL:', errorMessage);
        }
      } catch (decodeError) {
        console.log('[AuthHelper] Error decoding URL parameter:', decodeError);
      }
      
      // Si no se pudo extraer de la URL, intentar leerlo de la página personalizada
      if (!errorMessage) {
        console.log('[AuthHelper] Attempting to extract error from custom error page...');
        try {
          // Esperar a que la página de error se cargue completamente
          await this.page.waitForSelector('h1', { timeout: 3000 });
          
          // Verificar que estamos en la página de error correcta
          const headingText = await this.page.locator('h1').textContent();
          if (headingText && headingText.includes('Error')) {
            // Leer el mensaje de error de la página
            const errorText = await this.page.locator('p.text-gray-600').textContent();
            if (errorText) {
              errorMessage = errorText.trim();
              console.log('[AuthHelper] Login error captured from page:', errorMessage);
            } else {
              // Fallback: usar el texto del heading si no hay párrafo específico
              errorMessage = headingText.trim();
            }
          }
        } catch (pageError) {
          console.log('[AuthHelper] Could not extract error from page:', pageError);
          // Fallback: usar un mensaje genérico
          errorMessage = 'Error de autenticación';
        }
      }

      // Después de capturar el error, volver a la página de login (al root)
      // Esto permite que los tests posteriores continúen
      console.log('[AuthHelper] Navegando de vuelta a página de login...');
      const baseUrl = this.page.url().split('/api')[0]; // Obtener el baseURL correctamente
      await this.page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(500);
      
      return errorMessage;
    } catch (error) {
      console.log('[AuthHelper] Timeout or error waiting for error page:', error instanceof Error ? error.message : String(error));
      // Intentar volver a la página de login de todas formas
      try {
        const baseUrl = this.page.url().split('/api')[0]; // Obtener el baseURL correctamente
        await this.page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(500);
      } catch (e) {
        console.log('[AuthHelper] Error navigating back to login page');
      }
      return null;
    }
  }

  /**
   * Verificar si la página de login está visible
   */
  async isLoginPageVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector('input[name="username"]', {
        state: 'visible',
        timeout: 3000,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Limpiar sesión (cookies y storage)
   */
  async clearSession(): Promise<void> {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  }

  /**
   * Login rápido usando API (bypass UI) - útil para setup de tests
   */
  async loginViaAPI(username: string, password: string): Promise<void> {
    // Realizar login llamando directamente al endpoint de autenticación
    const response = await this.page.request.post('/api/auth/callback/credentials', {
      data: {
        userName: username,
        password: password,
      },
    });

    if (!response.ok()) {
      throw new Error(`Login via API failed: ${response.statusText()}`);
    }

    // Recargar la página para aplicar las cookies de sesión
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Verificar que el usuario fue redirigido después de logout
   */
  async verifyLogoutRedirect(): Promise<boolean> {
    const currentUrl = this.page.url();
    // Verificar si estamos en la página raíz (con o sin query parameters) o en la página de signin
    const isAtRoot = currentUrl === '/' || currentUrl.startsWith('http://localhost:3000/?');
    const isAtSignin = currentUrl.includes('/api/auth/signin');
    return isAtRoot || isAtSignin;
  }

  /**
   * Intentar acceder a una ruta protegida sin autenticación
   */
  async attemptProtectedRoute(route: string): Promise<boolean> {
    // Asegurar que la ruta sea una URL completa
    const fullUrl = route.startsWith('http') ? route : `http://localhost:3000${route}`;
    await this.page.goto(fullUrl);
    await this.page.waitForLoadState('domcontentloaded');
    
    // Verificar si fuimos redirigidos al login
    const currentUrl = this.page.url();
    return currentUrl.includes('/api/auth/signin') || currentUrl === 'http://localhost:3000/' || currentUrl.startsWith('http://localhost:3000/?');
  }
}
