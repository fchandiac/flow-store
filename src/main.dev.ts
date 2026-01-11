import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { getAvailablePort, waitForNextReady, killChildProcess } from './utils/processUtils';
import { createSplashWindow, createMainWindowWithPort } from './utils/windowUtils';
import { createAppMenu } from './utils/appUtils';
import { closeAppHandler, openLocationSettingsHandler, silentPrintHandler } from './utils/ipcHandlers';
import { spawn, ChildProcess } from 'child_process';

// Ensure stable userData path (Option A) - store profile in user's home
const fixedUserData = path.join(app.getPath('home'), '.flow-store');
app.setPath('userData', fixedUserData);
console.log('[main.dev] userData path set to:', fixedUserData);

// Log cookies directory
const cookiesPath = path.join(fixedUserData, 'Cookies');
console.log('[main.dev] Cookies will be stored in:', cookiesPath);

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let nextDevProcess: ChildProcess | null = null;

function killNextDev() {
  killChildProcess(nextDevProcess);
  nextDevProcess = null;
}

app.on('ready', async () => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.resolve(__dirname, '../../assets/icons/icon.png'));
  }
  createAppMenu();

  // Configurar variables de entorno globales para NextAuth
  // Usar un puerto dinámico disponible (probe entre 3000 y 3010)
  const port = await getAvailablePort(3000, 3010);
  process.env.NEXTAUTH_URL = `http://localhost:${port}`;
  process.env.NEXTAUTH_SECRET = 'super-secret-key-for-development-at-least-32-chars-long';

  // Registrar handlers IPC
  ipcMain.handle('closeApp', closeAppHandler);
  ipcMain.handle('openLocationSettings', openLocationSettingsHandler);
  ipcMain.handle('print-html', silentPrintHandler);

  // En modo test, ir directamente a la aplicación sin splash screen
  if (process.env.NODE_ENV === 'test') {
    console.log('[main.dev] Test mode detected, skipping splash screen...');
    const port = await getAvailablePort(3000, 3010);
    
    // Inicia Next.js en el puerto encontrado
    const nextPath = path.resolve(__dirname, '..', '..', 'node_modules', 'next', 'dist', 'bin', 'next');
    console.log(`[main.dev] Starting Next.js on port ${port}`);
    
    nextDevProcess = spawn('node', [nextPath, 'dev', '-p', port.toString()], {
      cwd: path.resolve(__dirname, '..', '..', 'next'),
      stdio: 'inherit',
      env: { 
        ...process.env, 
        PORT: port.toString(),
        NEXTAUTH_URL: `http://localhost:${port}`,
        NEXTAUTH_SECRET: 'test-secret-key-for-e2e-tests',
        NODE_ENV: 'test',
      },
    });
    
    // Esperar que Next.js esté listo
    const ready = await waitForNextReady(port);
    if (ready) {
      mainWindow = createMainWindowWithPort(port);
      
      // Registrar atajo de teclado para abrir/cerrar DevTools
      globalShortcut.register('CommandOrControl+Shift+D', () => {
        if (mainWindow?.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow?.webContents.openDevTools();
        }
      });
      
      mainWindow?.once('closed', () => {
        mainWindow = null;
        globalShortcut.unregisterAll();
      });
    } else {
      console.error(`Next.js no respondió en el puerto ${port}`);
    }
  } else {
    // Modo normal con splash screen
    const splashMetadata = {
      appName: 'FlowStore',
      appVersion: '1.0',
      releaseDate: '22-Diciembre-2025',
      description: 'Sistema de Gestión ERP',
      authorName: 'Felipe Chandía Castillo',
      authorEmail: 'felipe.chandia.dev@gmail.com',
      copyrightYear: '2025'
    };
    splashWindow = createSplashWindow(splashMetadata);
    const startTime = Date.now();
    const port = await getAvailablePort(3000, 3010);
  
  // Inicia Next.js en el puerto encontrado
  // Usamos node directamente para ejecutar el script de next para mejor control del proceso
  const nextPath = path.resolve(__dirname, '..', '..', 'node_modules', 'next', 'dist', 'bin', 'next');
  console.log(`[main.dev] Starting Next.js on port ${port}`);
  
  nextDevProcess = spawn('node', [nextPath, 'dev', '-p', String(port)], {
    stdio: 'inherit',
    shell: false,
    cwd: path.resolve(__dirname, '..', '..', 'next'),
    env: { 
      ...process.env, 
      PORT: String(port),
      NEXTAUTH_URL: `http://localhost:${port}`,
      NEXTAUTH_SECRET: 'super-secret-key-for-development-at-least-32-chars-long',
    }
  });

  console.log(`[main.dev] Next.js dev process started on port ${port}`);
  console.log(`[main.dev] NEXTAUTH_URL set to: ${process.env.NEXTAUTH_URL || 'NOT SET'}`);
  console.log(`[main.dev] Environment NEXTAUTH_URL: http://localhost:${port}`);

  // Espera a que Next.js esté listo antes de abrir la ventana principal
  const ready = await waitForNextReady(port, 120000);
  if (ready) {
    const elapsedTime = Date.now() - startTime;
    const minSplashTime = 4000;
    const remainingTime = minSplashTime - elapsedTime;

    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    mainWindow = createMainWindowWithPort(port);
    splashWindow?.close();
    
    // Registrar atajo de teclado para abrir/cerrar DevTools
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools();
      }
    });
    
    mainWindow?.once('closed', () => {
      mainWindow = null;
      globalShortcut.unregisterAll();
    });
  } else {
    console.error(`Next.js no respondió en el puerto ${port}`);
    splashWindow?.close();
  }
  } // Cierre del else del modo normal
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', async () => {
  // NO limpiar sesión - permitir que el usuario permanezca logueado entre reinicios
  killNextDev();
});

// Manejo explícito de señales para asegurar limpieza
process.on('SIGINT', () => {
  console.log('[main.dev] Received SIGINT');
  killNextDev();
  app.quit();
});

process.on('SIGTERM', () => {
  console.log('[main.dev] Received SIGTERM');
  killNextDev();
  app.quit();
});
