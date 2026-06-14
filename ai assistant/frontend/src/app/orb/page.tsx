'use client';

import React, { useState, useEffect, useRef } from 'react';
import AILogo, { JarvisState } from '../../components/AILogo';

declare global {
  interface Window {
    jarvisAPI?: {
      isElectron: boolean;
      toggleDashboard: () => void;
      setOrbState: (state: string) => void;
      onToggleVoice: (callback: () => void) => void;
    };
  }
}

export default function OrbPage() {
  const [state, setState] = useState<JarvisState>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  // Sync state with Electron if available
  useEffect(() => {
    if (window.jarvisAPI) {
      window.jarvisAPI.setOrbState(state);
    }
  }, [state]);

  // Connect to FastAPI WS
  useEffect(() => {
    connectWebSocket();
    
    // Register electron toggle voice triggers
    if (window.jarvisAPI) {
      window.jarvisAPI.onToggleVoice(() => {
        triggerVoiceListening();
      });
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://127.0.0.1:8000/api/voice');
      
      ws.onopen = () => {
        console.log("Orb WebSocket connected.");
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "status") {
          setState(msg.state as JarvisState);
        } else if (msg.type === "wake_word_detected") {
          setState("listening");
        }
      };

      ws.onclose = () => {
        console.log("Orb WebSocket closed. Reconnecting in 3 seconds...");
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("WS connection error:", e);
      setTimeout(connectWebSocket, 5000);
    }
  };

  const triggerVoiceListening = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_listening' }));
    } else {
      // Offline simulation fallback
      setState('listening');
      setTimeout(() => setState('thinking'), 2000);
      setTimeout(() => setState('idle'), 4000);
    }
  };

  const handleClick = () => {
    // Single click toggles microphone listening
    if (state === 'idle') {
      triggerVoiceListening();
    } else {
      // Return to idle
      setState('idle');
    }
  };

  const handleDoubleClick = () => {
    // Double click toggles main dashboard
    if (window.jarvisAPI) {
      window.jarvisAPI.toggleDashboard();
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-transparent overflow-hidden drag-region">
      {/* Draggable container with non-draggable central orb button */}
      <div className="no-drag">
        <AILogo 
          state={state} 
          size={130} 
          onClick={handleClick}
          className="transition-transform duration-300 hover:scale-105 active:scale-95"
        />
        
        {/* Double-click instruction label (subtle HUD element) */}
        <div 
          onDoubleClick={handleDoubleClick}
          className="text-center mt-1 text-[9px] text-cyan-400 opacity-0 hover:opacity-80 transition-opacity duration-300 high-tech-font uppercase select-none cursor-pointer"
        >
          Double click to show HUD
        </div>
      </div>
    </div>
  );
}
