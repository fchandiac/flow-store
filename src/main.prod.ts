import { app, BrowserWindow, dialog, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { getAvailablePort, waitForNextReady, killChildProcess } from './utils/processUtils';
import {
  createSplashWindow,
  createMainWindowWithPort,
  openCustomerDisplayWindow,
  closeCustomerDisplayWindow,
} from './utils/windowUtils';
import { createAppMenu } from './utils/appUtils';
import { closeAppHandler, openLocationSettingsHandler, silentPrintHandler } from './utils/ipcHandlers';
import { fork, ChildProcess } from 'child_process';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let nextServerProcess: ChildProcess | null = null;
let activePort: number | null = null;

// Ensure stable userData path (Option A) - store profile in user's home
const fixedUserData = path.join(app.getPath('home'), '.flow-store');
app.setPath('userData', fixedUserData);

// Setup comprehensive file logging for production debugging
const userDataPath = app.getPath('userData');
const logFile = path.join(userDataPath, 'main.log');
const nextLogFile = path.join(userDataPath, 'next-server.log');

// Ensure log directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// Clear old logs on startup (keep last 100KB)
try {
  if (fs.existsSync(logFile)) {
    const stats = fs.statSync(logFile);
    if (stats.size > 100000) {
      const oldContent = fs.readFileSync(logFile, 'utf8');
      fs.writeFileSync(logFile, oldContent.slice(-50000)); // Keep last 50KB
    }
  }
} catch (err) {
  console.error('Error managing log file:', err);
}

function logToFile(message: string, logPath: string = logFile) {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (err) {
    // Silently fail to avoid infinite loops
  }
}

// Log startup info
logToFile(`========================================`);
logToFile(`APP STARTED - Version: ${app.getVersion()}`);
logToFile(`Platform: ${process.platform}`);
logToFile(`Arch: ${process.arch}`);
logToFile(`User Data Path: ${userDataPath}`);
logToFile(`Is Packaged: ${app.isPackaged}`);
logToFile(`========================================`);

// Redirect console to file in production
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  originalConsoleLog(...args);
  logToFile(args.map(a => String(a)).join(' '));
};

console.error = (...args) => {
  originalConsoleError(...args);
  logToFile(`❌ ERROR: ${args.map(a => String(a)).join(' ')}`);
};

console.warn = (...args) => {
  originalConsoleWarn(...args);
  logToFile(`⚠️  WARN: ${args.map(a => String(a)).join(' ')}`);
};

function killNextServer() {
  killChildProcess(nextServerProcess);
  nextServerProcess = null;
  closeCustomerDisplayWindow();
}

app.on('ready', async () => {
  // Configurar icono en el Dock de macOS para desarrollo/producción no empaquetado
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.resolve(__dirname, '../../assets/icons/icon.png');
    app.dock.setIcon(iconPath);
  }

  // Check for UNC path on Windows or Parallels Shared Folders
  if (process.platform === 'win32') {
    const execPath = process.execPath.toLowerCase();
    if (
      execPath.startsWith('\\\\') || 
      execPath.includes('\\psf\\') || 
      execPath.includes('c:\\mac\\')
    ) {
      console.error('Detected UNC/Network path execution. Aborting.');
      dialog.showErrorBox(
        'Ubicación no compatible',
        'Estás ejecutando la aplicación desde una carpeta compartida de red o de Parallels (ej. C:\\Mac o \\\\psf).\n\nElectron no funciona correctamente en estas ubicaciones.\n\nPor favor, mueve la carpeta de la aplicación a una ubicación local de Windows (ej. C:\\App o C:\\Users\\TuUsuario\\Downloads) e inténtalo de nuevo.'
      );
      app.quit();
      return;
    }
  }

  createAppMenu();

  // Configurar variables de entorno globales para NextAuth
  const isPackaged = app.isPackaged;
  let port: number;
  
  if (isPackaged) {
    // Intentar puerto 3000 primero
    try {
      port = await getAvailablePort(3000, 3000); // Solo puerto 3000
    } catch {
      // Si 3000 no está disponible, buscar en rango amplio
      port = await getAvailablePort(3001, 3010);
    }
  } else {
    port = await getAvailablePort(3000, 3010);
  }
  
  activePort = port;
  process.env.NEXTAUTH_URL = `http://localhost:${port}`;
  process.env.NEXTAUTH_SECRET = 'super-secret-key-for-production-at-least-32-chars-long';

  // Registrar handlers IPC
  ipcMain.handle('closeApp', closeAppHandler);
  ipcMain.handle('openLocationSettings', openLocationSettingsHandler);
  ipcMain.handle('print-html', silentPrintHandler);
  ipcMain.handle('openCustomerDisplay', async () => {
    if (activePort == null) {
      throw new Error('El punto de venta aún no está disponible.');
    }
    openCustomerDisplayWindow(activePort);
  });

  const splashMetadata = {
    appName: 'BerriesApp',
    appVersion: '2.1',
    releaseDate: '16-Diciembre-2025',
    description: 'Gestión Recepciones y despacho para berries',
    authorName: 'Felipe Chandía Castillo',
    authorEmail: 'felipe.chandia.dev@gmail.com',
    copyrightYear: '2025'
  };
  splashWindow = createSplashWindow(splashMetadata);
  const startTime = Date.now();
  
  // Ruta al servidor standalone empaquetado
  // En producción (packaged), estará en resources/standalone
  // En desarrollo (si probamos main.prod.ts), estará en next/.next/standalone
  
  let serverPath: string;
  let cwd: string;

  if (isPackaged) {
    cwd = path.join(process.resourcesPath, 'standalone');
    serverPath = path.join(cwd, 'server.js');
  } else {
    // Fallback para probar main.prod.ts localmente
    cwd = path.join(__dirname, '..', '..', 'next', '.next', 'standalone');
    serverPath = path.join(cwd, 'server.js');
  }

  console.log(`[main.prod] Starting Next.js Standalone on port ${port}`);
  console.log(`[main.prod] Server path: ${serverPath}`);
  console.log(`[main.prod] CWD: ${cwd}`);
  console.log(`[main.prod] Server exists: ${fs.existsSync(serverPath)}`);
  console.log(`[main.prod] CWD exists: ${fs.existsSync(cwd)}`);
  
  // Log app.config.json location
  const configPath = path.join(cwd, 'app.config.json');
  console.log(`[main.prod] Looking for config at: ${configPath}`);
  console.log(`[main.prod] Config exists: ${fs.existsSync(configPath)}`);
  
  if (fs.existsSync(cwd)) {
    const files = fs.readdirSync(cwd);
    console.log(`[main.prod] Files in CWD:`, files.slice(0, 20).join(', '));
  }

  const env: NodeJS.ProcessEnv = { 
    ...process.env, 
    PORT: String(port),
    NODE_ENV: 'production',
    HOSTNAME: '127.0.0.1',
    NEXTAUTH_URL: `http://localhost:${port}`,
    NEXTAUTH_SECRET: 'super-secret-key-for-production-at-least-32-chars-long',
  };

  console.log(`[main.prod] Setting NEXTAUTH_URL to ${env.NEXTAUTH_URL}`);
  console.log(`[main.prod] Using port: ${port}`);
  console.log(`[main.prod] Is packaged: ${isPackaged}`);
  console.log(`[main.prod] Resources path: ${process.resourcesPath}`);
  console.log(`[main.prod] CWD: ${cwd}`);
  console.log(`[main.prod] Server path exists: ${fs.existsSync(serverPath)}`);

  // Usamos fork para lanzar el proceso de Next.js.
  // fork maneja automáticamente ELECTRON_RUN_AS_NODE y evita problemas de iconos extra en el Dock en macOS.
  nextServerProcess = fork(serverPath, [], {
    cwd: cwd,
    silent: true, // Pipes stdout/stderr
    env: env
  });

  nextServerProcess.stdout?.on('data', (data) => {
    const message = data.toString().trim();
    console.log(`[Next.js]: ${message}`);
    logToFile(`[Next.js STDOUT]: ${message}`, nextLogFile);
  });

  nextServerProcess.stderr?.on('data', (data) => {
    const message = data.toString().trim();
    console.error(`[Next.js Error]: ${message}`);
    logToFile(`[Next.js STDERR]: ${message}`, nextLogFile);
  });

  nextServerProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[main.prod] Next.js process exited unexpectedly with code ${code} and signal ${signal}`);
    }
  });

  // Espera a que Next.js esté listo
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
      closeCustomerDisplayWindow();
    });
  } else {
    console.error(`Next.js Standalone no respondió en el puerto ${port}`);
    splashWindow?.close();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', async () => {
  // NO limpiar sesión - permitir que el usuario permanezca logueado entre reinicios
  killNextServer();
});

process.on('SIGINT', () => {
  killNextServer();
  app.quit();
});

process.on('SIGTERM', () => {
  killNextServer();
  app.quit();
});
