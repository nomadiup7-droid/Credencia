const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  const windowOptions = {
    width: 1240,
    height: 820,
    minWidth: 1040,
    minHeight: 700,
    title: 'Credencia Print Manager',
    backgroundColor: '#eef3f8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  };

  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function sendMenuAction(action) {
  const target = BrowserWindow.getFocusedWindow() || mainWindow;

  if (target && !target.isDestroyed()) {
    target.webContents.send('menu:action', action);
  }
}

function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Atualizar status', accelerator: 'F5', click: () => sendMenuAction('refresh') },
        { label: 'Reiniciar servico', click: () => sendMenuAction('restart-service') },
        { type: 'separator' },
        { label: 'Fechar', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Configuracoes',
      submenu: [
        { label: 'Impressoras', click: () => sendMenuAction('page-printers') },
        { label: 'Preferencias', click: () => sendMenuAction('page-settings') }
      ]
    },
    {
      label: 'Ferramentas',
      submenu: [
        { label: 'Abrir logs', click: () => sendMenuAction('open-logs') },
        { label: 'Teste de impressao', click: () => sendMenuAction('test-print') }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        { label: 'Sobre', click: () => sendMenuAction('page-about') }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  Object.values(interfaces).forEach(entries => {
    (entries || []).forEach(entry => {
      if (entry.family === 'IPv4' && !entry.internal) {
        ips.push({
          address: entry.address,
          name: entry.name
        });
      }
    });
  });

  return ips;
}

app.whenReady().then(() => {
  ipcMain.handle('system:getLocalIps', () => getLocalIps());
  ipcMain.handle('system:openLogs', async () => {
    await shell.openPath(path.join(__dirname, '..', '..'));
    return { ok: true };
  });
  ipcMain.handle('system:restartServicePrepared', () => ({
    ok: false,
    message: 'Reinicio do servico sera implementado em fase futura.'
  }));
  ipcMain.handle('system:minimizeToTrayPrepared', () => ({
    ok: false,
    message: 'Minimizar para bandeja sera implementado em fase futura.'
  }));

  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
