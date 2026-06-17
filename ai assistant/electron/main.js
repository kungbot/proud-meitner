const { app, BrowserWindow, ipcMain, Tray, Menu, screen, globalShortcut, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let dashboardWin = null;
let orbWin = null;
let tray = null;
let pythonProcess = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function startBackend() {
  console.log("Starting Python FastAPI Backend...");
  
  // Find python executable path, using standard windows naming
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const backendPath = path.join(__dirname, '..', 'backend');
  
  pythonProcess = spawn(pythonCmd, ['main.py'], {
    cwd: backendPath,
    stdio: 'inherit',
    shell: true
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

function createDashboardWindow() {
  dashboardWin = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    frame: false, // Custom header
    backgroundColor: '#020617', // match slate-950
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const url = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '..', 'frontend', 'out', 'index.html')}`;

  dashboardWin.loadURL(url);

  dashboardWin.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      dashboardWin.hide();
    }
  });
}

function createOrbWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  orbWin = new BrowserWindow({
    width: 160,
    height: 160,
    x: width - 180,
    y: height - 180,
    type: 'toolbar',
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Make orb draggable via -webkit-app-region: drag in HTML
  orbWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  orbWin.setAlwaysOnTop(true, 'screen-saver');

  const url = isDev 
    ? 'http://localhost:3000/orb' 
    : `file://${path.join(__dirname, '..', 'frontend', 'out', 'orb.html')}`;

  orbWin.loadURL(url);
}

function createTray() {
  // Use a fallback empty system icon if none found
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Dashboard (Ctrl+Space)', 
      click: () => {
        if (dashboardWin) {
          dashboardWin.show();
          dashboardWin.focus();
        }
      } 
    },
    { 
      label: 'Toggle Listening', 
      click: () => {
        if (orbWin) {
          orbWin.webContents.send('toggle-voice');
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit JARVIS', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('JARVIS AI Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (dashboardWin) {
      if (dashboardWin.isVisible()) {
        dashboardWin.hide();
      } else {
        dashboardWin.show();
        dashboardWin.focus();
      }
    }
  });
}

// IPC Handlers
ipcMain.on('toggle-dashboard', () => {
  if (dashboardWin) {
    if (dashboardWin.isVisible()) {
      dashboardWin.hide();
    } else {
      dashboardWin.show();
      dashboardWin.focus();
    }
  }
});

ipcMain.on('close-dashboard', () => {
  if (dashboardWin) {
    dashboardWin.hide();
  }
});

ipcMain.on('minimize-dashboard', () => {
  if (dashboardWin) {
    dashboardWin.minimize();
  }
});

// Broadcast orb state changes (idle, thinking, listening, executing, speaking) to Dashboard
ipcMain.on('set-orb-state', (event, state) => {
  if (dashboardWin && !dashboardWin.isDestroyed()) {
    dashboardWin.webContents.send('update-orb-state', state);
  }
});

ipcMain.on('quit-app', () => {
  app.isQuitting = true;
  app.quit();
});

ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'icon.png') }).show();
  }
});

app.on('ready', () => {
  startBackend();
  createDashboardWindow();
  createOrbWindow();
  
  // Create an empty PNG dynamic tray icon buffer so we don't crash if icon.png is missing
  // Or write dummy icon to disk
  try {
    createTray();
  } catch (e) {
    console.log("Could not load tray icon. Proceeding without tray tray: ", e.message);
  }

  // Register global hotkey: Ctrl+Space to toggle dashboard
  const ret = globalShortcut.register('CommandOrControl+Space', () => {
    if (dashboardWin) {
      if (dashboardWin.isVisible()) {
        dashboardWin.hide();
      } else {
        dashboardWin.show();
        dashboardWin.focus();
      }
    }
  });
  if (!ret) {
    console.log('Global shortcut registration failed (Ctrl+Space may be in use by another app)');
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pythonProcess) {
    console.log("Terminating Python backend process...");
    pythonProcess.kill('SIGTERM');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
