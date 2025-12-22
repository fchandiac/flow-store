import { Menu, BrowserWindow } from 'electron';

import fs from 'fs';
import path from 'path';

export const getConfigPath = (): string => {
  if (process.env.NODE_ENV === 'production' || (process as any).pkg) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'app.config.json');
  }
  return path.join(__dirname, '../../app.config.json');
};

export const readAppConfig = (): any => {
  const configPath = getConfigPath();
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo app.config.json:', err);
    return null;
  }
};

export const createAppMenu = () => {
  const { app, shell } = require('electron');
  
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Herramientas',
      submenu: [
        {
          label: 'Herramientas de Desarrollador',
          accelerator: 'CommandOrControl+Shift+I',
          click: () => {
            const mainWindow = BrowserWindow.getFocusedWindow();
            if (mainWindow) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          }
        },
        {
          label: 'Recargar',
          accelerator: 'CommandOrControl+R',
          click: () => {
            const mainWindow = BrowserWindow.getFocusedWindow();
            if (mainWindow) {
              mainWindow.webContents.reload();
            }
          }
        },
        {
          label: 'Recargar (Sin caché)',
          accelerator: 'CommandOrControl+Shift+R',
          click: () => {
            const mainWindow = BrowserWindow.getFocusedWindow();
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Ver Logs',
          submenu: [
            {
              label: 'Abrir Carpeta de Logs',
              click: () => {
                const userDataPath = app.getPath('userData');
                shell.openPath(userDataPath);
              }
            },
            {
              label: 'Ver Log Principal (main.log)',
              click: () => {
                const logPath = path.join(app.getPath('userData'), 'main.log');
                shell.openPath(logPath);
              }
            },
            {
              label: 'Ver Log de Next.js (next-server.log)',
              click: () => {
                const logPath = path.join(app.getPath('userData'), 'next-server.log');
                shell.openPath(logPath);
              }
            },
            {
              label: 'Copiar Ruta de Logs',
              click: () => {
                const { clipboard } = require('electron');
                const userDataPath = app.getPath('userData');
                clipboard.writeText(userDataPath);
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'CommandOrControl+Q',
          click: () => {
            require('electron').app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};
