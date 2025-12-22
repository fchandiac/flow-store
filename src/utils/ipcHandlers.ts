import { app, shell, BrowserWindow } from 'electron';
import type { IpcMainInvokeEvent, WebContentsPrintOptions } from 'electron';

export interface SilentPrintPayload {
  html: string;
  title?: string;
  deviceName?: string;
  printBackground?: boolean;
}

export interface SilentPrintResult {
  success: boolean;
  error?: string;
}

export const closeAppHandler = async (): Promise<void> => {
  // Clear session cookies before closing app
  try {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (mainWindow) {
      const session = mainWindow.webContents.session;
      await session.clearStorageData({
        storages: ['cookies', 'localstorage']
      });
      console.log('[ipcHandlers] Cookies y almacenamiento local limpiados exitosamente');
    }
  } catch (error) {
    console.error('[ipcHandlers] Error clearing cookies:', error);
  }
  
  app.quit();
};

export const openLocationSettingsHandler = async (): Promise<void> => {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: Abrir Preferencias del Sistema > Seguridad y Privacidad > Localización
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices');
  } else if (platform === 'win32') {
    // Windows: Abrir Configuración > Privacidad > Ubicación
    await shell.openExternal('ms-settings:privacy-location');
  } else {
    // Otros sistemas: Abrir configuración general de privacidad
    await shell.openExternal('ms-settings:privacy');
  }
};

export const silentPrintHandler = async (_event: IpcMainInvokeEvent, payload: SilentPrintPayload): Promise<SilentPrintResult> => {
  if (!payload || typeof payload.html !== 'string' || payload.html.trim() === '') {
    return {
      success: false,
      error: 'Contenido de impresión inválido.',
    };
  }

  const { html, title, deviceName, printBackground = true } = payload;

  let printWindow: BrowserWindow | null = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    await new Promise<void>((resolve, reject) => {
      if (!printWindow) {
        reject(new Error('Ventana de impresión no disponible.'));
        return;
      }

      const options: WebContentsPrintOptions = {
        silent: true,
        printBackground,
      };

      if (deviceName) {
        options.deviceName = deviceName;
      }

      printWindow.webContents.print(options, (success, failureReason) => {
        if (!success) {
          reject(new Error(failureReason || 'Fallo al imprimir.'));
        } else {
          resolve();
        }
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('[ipcHandlers] Error during silent print:', error);
    return {
      success: false,
      error: error?.message ?? 'Error desconocido al imprimir.',
    };
  } finally {
    if (printWindow) {
      try {
        printWindow.destroy();
      } catch (destroyError) {
        console.warn('[ipcHandlers] Error closing print window:', destroyError);
      }
    }
    printWindow = null;
  }
};