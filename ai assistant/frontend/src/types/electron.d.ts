interface JarvisAPI {
  isElectron: boolean;
  toggleDashboard: () => void;
  closeDashboard: () => void;
  minimizeDashboard: () => void;
  setOrbState: (state: string) => void;
  onUpdateOrbState: (callback: (state: string) => void) => void;
  onToggleVoice: (callback: () => void) => void;
  showNotification: (title: string, body: string) => void;
  quitApp: () => void;
}

declare global {
  interface Window {
    jarvisAPI?: JarvisAPI;
  }
}

export {};
