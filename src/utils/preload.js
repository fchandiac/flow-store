const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: (opts) => ipcRenderer.invoke('closeApp', opts),
  openLocationSettings: () => ipcRenderer.invoke('openLocationSettings'),
  printHtml: (payload) => ipcRenderer.invoke('print-html', payload),
  openCustomerDisplay: () => ipcRenderer.invoke('openCustomerDisplay'),
});