const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('credenciaAgent', {
  getLocalIps: () => ipcRenderer.invoke('system:getLocalIps'),
  openLogs: () => ipcRenderer.invoke('system:openLogs'),
  restartServicePrepared: () => ipcRenderer.invoke('system:restartServicePrepared'),
  minimizeToTrayPrepared: () => ipcRenderer.invoke('system:minimizeToTrayPrepared'),
  onMenuAction: callback => {
    ipcRenderer.on('menu:action', (event, action) => callback(action));
  }
});
