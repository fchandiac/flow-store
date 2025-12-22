import { BrowserWindow, Menu } from 'electron';
import path from 'path';

function getIconPath(): string {
  if (process.platform === 'darwin') {
    return path.resolve(__dirname, '../../assets/icons/icon.png');
  } else if (process.platform === 'win32') {
    return path.resolve(__dirname, '../../assets/icons/icon.ico');
  } else {
    return path.resolve(__dirname, '../../assets/icons/icon.png');
  }
}

/**
 * Crea la ventana splash para mostrar mientras Next.js inicia.
 * @param metadata Metadata opcional para personalizar el splash screen
 * @returns BrowserWindow instancia de la ventana splash
 */
export function createSplashWindow(metadata?: {
  appName?: string;
  appVersion?: string;
  releaseDate?: string;
  description?: string;
  authorName?: string;
  authorEmail?: string;
  copyrightYear?: string;
}): BrowserWindow {
  const splashWindow = new BrowserWindow({
    width: 640,
    height: 360,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    show: false,
    center: true,
    icon: getIconPath(),
  });
  
  const splashPath = path.resolve(__dirname, '../../assets/splash.html');
  let url = `file://${splashPath}`;
  
  if (metadata) {
    const params = new URLSearchParams();
    if (metadata.appName) params.append('appName', metadata.appName);
    if (metadata.appVersion) params.append('appVersion', metadata.appVersion);
    if (metadata.releaseDate) params.append('releaseDate', metadata.releaseDate);
    if (metadata.description) params.append('description', metadata.description);
    if (metadata.authorName) params.append('authorName', metadata.authorName);
    if (metadata.authorEmail) params.append('authorEmail', metadata.authorEmail);
    if (metadata.copyrightYear) params.append('copyrightYear', metadata.copyrightYear);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
  }
  
  splashWindow.loadURL(url).catch(err => {
    console.error('[windowUtils] Failed to load splash file:', err);
  });

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
  return splashWindow;
}

/**
 * Crea la ventana principal de Electron y la asocia al puerto de Next.js.
 * @param port Puerto donde está corriendo Next.js
 * @returns BrowserWindow instancia de la ventana principal
 */
export function createMainWindowWithPort(port: number): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    title: 'FlowStore',
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Usar partición persistente para que las cookies se guarden en disco
      partition: 'persist:flowstore',
    },
  });
  mainWindow.loadURL(`http://localhost:${port}`);
  
  // Habilitar menú de contexto para copiar/pegar
  mainWindow.webContents.on('context-menu', (e) => {
    const template: Electron.MenuItemConstructorOptions[] = [
      { label: 'Copiar', role: 'copy' },
      { label: 'Pegar', role: 'paste' },
      { label: 'Cortar', role: 'cut' },
      { type: 'separator' },
      { label: 'Seleccionar todo', role: 'selectAll' },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });
  mainWindow.on('closed', () => {
    // No-op: la instancia se maneja en el archivo principal
  });
  return mainWindow;
}
