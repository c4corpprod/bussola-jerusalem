/* ═══════════════════════════════════════════════════════════════
   🕎 ELECTRON PRELOAD — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Bridge seguro entre Node.js e a página web
   ═══════════════════════════════════════════════════════════════ */

const { contextBridge } = require('electron');

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    version: '1.0.0'
});
