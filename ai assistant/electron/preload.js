const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisAPI', {
  isElectron: true,
  toggleDashboard: () => ipcRenderer.send('toggle-dashboard'),
  closeDashboard: () => ipcRenderer.send('close-dashboard'),
  minimizeDashboard: () => ipcRenderer.send('minimize-dashboard'),
  setOrbState: (state) => ipcRenderer.send('set-orb-state', state),
  onUpdateOrbState: (callback) => ipcRenderer.on('update-orb-state', (event, state) => callback(state)),
  onToggleVoice: (callback) => ipcRenderer.on('toggle-voice', (event) => callback()),
  quitApp: () => ipcRenderer.send('quit-app')
});
