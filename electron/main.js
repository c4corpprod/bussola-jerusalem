/* ═══════════════════════════════════════════════════════════════
   🕎 ELECTRON MAIN — Bússola para Jerusalém (Desktop)
   © 2026 Marcos Fernando — C4 Corporation
   
   Processo principal do Electron para Windows/Mac/Linux
   ═══════════════════════════════════════════════════════════════ */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Desabilita aceleração de hardware em máquinas fracas (opcional)
// app.disableHardwareAcceleration();

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 800,
        minWidth: 360,
        minHeight: 640,
        title: 'Bússola para Jerusalém',
        icon: path.join(__dirname, '..', 'www', 'assets', 'img', 'icon-512.png'),
        backgroundColor: '#1a0a00',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1a0a00',
            symbolColor: '#c4a35a',
            height: 32
        }
    });

    // Carrega o app a partir dos arquivos locais
    mainWindow.loadFile(path.join(__dirname, '..', 'www', 'index.html'));

    // Abre links externos no navegador padrão
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Menu simples
    const menu = Menu.buildFromTemplate([
        {
            label: 'Bússola',
            submenu: [
                { role: 'reload', label: 'Recarregar' },
                { role: 'forceReload', label: 'Forçar Recarga' },
                { type: 'separator' },
                { role: 'toggleDevTools', label: 'DevTools' },
                { type: 'separator' },
                { role: 'quit', label: 'Sair' }
            ]
        },
        {
            label: 'Sobre',
            submenu: [
                {
                    label: 'Bússola para Jerusalém v1.0.0',
                    enabled: false
                },
                {
                    label: '© Marcos Fernando — C4 Corporation',
                    enabled: false
                },
                { type: 'separator' },
                {
                    label: '💬 WhatsApp da Comunidade',
                    click: () => shell.openExternal('https://chat.whatsapp.com/C9KfyK7InB00wJ2jRFDtOr')
                }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Quando o Electron inicializar
app.whenReady().then(createWindow);

// Fecha app quando todas as janelas forem fechadas (exceto macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// macOS: reabre janela ao clicar no dock
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
