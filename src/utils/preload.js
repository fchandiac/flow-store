const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.invoke('closeApp'),
  openLocationSettings: () => ipcRenderer.invoke('openLocationSettings'),
  printHtml: (payload) => ipcRenderer.invoke('print-html', payload),
});