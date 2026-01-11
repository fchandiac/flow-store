import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Establecer variables de entorno para NextAuth en tests
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-do-not-use-in-production';
(process.env as any).NODE_ENV = 'test';

/**
 * Configuración de Playwright para testing E2E en Electron + Next.js
 * 
 * Esta configuración está optimizada para:
 * - Testing de aplicaciones Electron
 * - Debugging con screenshots, videos y traces
 * - Ejecución en CI/CD
 */
export default defineConfig({
  // Directorio donde están los tests
  testDir: './tests/e2e',
  
  // Timeout general para cada test
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Número de reintentos en caso de fallo
  retries: process.env.CI ? 2 : 0,
  
  // Workers (paralelización)
  // Usamos 1 worker para evitar race conditions con la base de datos y puertos de Electron
  // En modo desarrollo, esto es más importante para evitar deadlocks
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/.output/reports', open: 'never' }],
    ['json', { outputFile: 'tests/.output/results.json' }],
    ['list'],
    ['junit', { outputFile: 'tests/.output/junit.xml' }]
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL (no aplica para Electron pero útil para referencia)
    baseURL: 'http://localhost:3000',
    
    // Screenshots automáticos en fallos
    screenshot: 'only-on-failure',
    
    // Videos automáticos en fallos
    video: 'retain-on-failure',
    
    // Traces automáticos en fallos (muy útil para debugging)
    trace: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 10000,
  },
  
  // Folder para artefactos de test
  outputDir: 'tests/.output/artifacts',
  
  // Configuración de proyectos
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
      use: {
        // Configuración específica para Electron
        // Evitar que Playwright cierre automáticamente el contexto
        // y dar más tiempo para que la aplicación se inicialice
        actionTimeout: 15000,
        navigationTimeout: 30000,
      },
    },
  ],
  
  // Global setup/teardown (opcional)
  globalSetup: require.resolve('./tests/global-setup'),
  // globalTeardown: require.resolve('./tests/global-teardown'),
});
