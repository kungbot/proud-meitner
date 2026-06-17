'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Minimize2, Settings, Trash2 } from 'lucide-react';
import { JarvisState } from '../components/AILogo';
import ChatPanel, { Message } from '../components/ChatPanel';
import MetricsPanel, { SystemStats } from '../components/MetricsPanel';
import MemoryPanel, { MemoryItem } from '../components/MemoryPanel';
import TaskLog, { TaskLogItem } from '../components/TaskLog';
import ConfirmModal from '../components/ConfirmModal';
import SettingsPanel from '../components/SettingsPanel';
import { ToastProvider, useToast } from '../components/NotificationToast';

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}

function DashboardContent() {
  const { showToast } = useToast();

  // Application State
  const [orbState, setOrbState] = useState<JarvisState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // System Metrics
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    memory_used: 0,
    memory_total: 16.0,
    memory_percent: 0,
    disk_used: 0,
    disk_total: 512.0,
    disk_percent: 0,
    processes: [],
  });

  // DB Memories & Logs
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskLogItem[]>([]);

  // Security confirmation state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState('');
  const [confirmPayload, setConfirmPayload] = useState<any>(null);

  // Settings Panel State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Sync state changes with Electron preloads
  useEffect(() => {
    if (window.jarvisAPI) {
      window.jarvisAPI.onUpdateOrbState((state) => {
        setOrbState(state as JarvisState);
      });
    }
  }, []);

  // Trigger startup welcome voice greeting
  useEffect(() => {
    const speakWelcome = async () => {
      try {
        await fetch('http://127.0.0.1:8000/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'Welcome back, sir. Systems are fully loaded and operational.' }),
        });
      } catch (e) {
        console.error('Failed to trigger welcome TTS:', e);
      }
    };
    // Wait a brief 1.5 seconds for uvicorn process to settle before speaking
    const timer = setTimeout(speakWelcome, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Poll diagnostic status, memories and tasks logs
  useEffect(() => {
    fetchStats();
    fetchMemories();
    fetchTasks();
    fetchHistory();

    const interval = setInterval(() => {
      fetchStats();
      fetchTasks();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Open WebSocket for voice updates
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/api/voice');

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'status') {
        setOrbState(msg.state as JarvisState);
        setIsListening(msg.state === 'listening');
      } else if (msg.type === 'transcription') {
        addMessage('user', msg.text);
      } else if (msg.type === 'result') {
        if (msg.status === 'needs_confirmation') {
          setConfirmDetails(msg.action_details);
          setConfirmPayload(msg.payload);
          setShowConfirm(true);
        } else {
          addMessage('assistant', msg.response, msg.data);
        }
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/status');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      // Mock stats fallback for browser dev mode
      setStats({
        cpu: Math.floor(Math.random() * 20) + 5,
        memory_used: 6.4,
        memory_total: 16.0,
        memory_percent: 40,
        disk_used: 120.4,
        disk_total: 512.0,
        disk_percent: 23,
        processes: [
          { pid: 4882, name: 'chrome.exe', memory: 8.2, cpu: 1.5 },
          { pid: 1042, name: 'code.exe', memory: 5.4, cpu: 0.8 },
          { pid: 9022, name: 'electron.exe', memory: 3.1, cpu: 1.2 },
          { pid: 1104, name: 'python.exe', memory: 2.5, cpu: 0.5 },
          { pid: 3004, name: 'slack.exe', memory: 1.8, cpu: 0.1 },
        ],
      });
    }
  };

  const fetchMemories = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (e) {
      setMemories([
        { key: 'project', value: 'Antigravity Workspace', category: 'preference', updated_at: '2026-06-17' },
        { key: 'editor', value: 'VS Code', category: 'preference', updated_at: '2026-06-17' },
      ]);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      setTasks([
        {
          id: 1,
          task_name: 'Orchestrator',
          status: 'completed',
          details: 'Initialized systems successfully.',
          timestamp: '11:00:00',
        },
      ]);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/history');
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          role: item.role,
          text: item.message,
          timestamp: new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        }));
        setMessages(mapped);
      }
    } catch (e) {
      console.log('Failed to fetch chat history:', e);
    }
  };

  const addMessage = (role: 'user' | 'assistant' | 'system', text: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setMessages((prev) => [...prev, { role, text, timestamp, data }]);
  };

  const handleSendMessage = async (text: string) => {
    addMessage('user', text);
    setOrbState('thinking');
    setStreamingText('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });

      if (!response.ok) {
        throw new Error(`Core responded with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) {
        throw new Error('Readable stream not supported.');
      }

      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(cleaned.slice(6));
            if (data.type === 'confirmation') {
              setConfirmDetails(data.action_details);
              setConfirmPayload(data.payload);
              setShowConfirm(true);
              setOrbState('idle');
              setStreamingText('');
              return;
            } else if (data.type === 'chunk') {
              setOrbState('speaking');
              setStreamingText((prev) => prev + data.text);
            } else if (data.type === 'result') {
              setStreamingText('');
              addMessage('assistant', data.response, data.data);
              setOrbState('idle');
              fetchMemories();
            } else if (data.type === 'error') {
              setStreamingText('');
              addMessage('assistant', `System Error: ${data.response}`);
              setOrbState('idle');
            }
          } catch (err) {
            console.error('Failed to parse SSE line:', err);
          }
        }
      }
    } catch (err) {
      addMessage('assistant', `Communication error: ${err}`);
      setOrbState('idle');
      setStreamingText('');
    }
  };

  const toggleMicListening = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (!isListening) {
        wsRef.current.send(JSON.stringify({ type: 'start_listening' }));
      } else {
        setOrbState('idle');
        setIsListening(false);
      }
    } else {
      setIsListening(!isListening);
      setOrbState(!isListening ? 'listening' : 'idle');
    }
  };

  const handleConfirmAction = async (approved: boolean) => {
    setShowConfirm(false);
    if (!approved) {
      addMessage('system', 'System authorization denied.');
      return;
    }

    addMessage('system', 'System authorization granted. Executing action...');
    setOrbState('executing');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: confirmPayload }),
      });

      if (res.ok) {
        const data = await res.json();
        addMessage('assistant', data.response, data.data);
        showToast('success', 'Action Authorized', 'System operation executed successfully.');
      }
    } catch (e) {
      addMessage('assistant', `Execution failed: ${e}`);
      showToast('error', 'Authorization Failure', 'Failed to execute the requested system operation.');
    } finally {
      setOrbState('idle');
      setConfirmPayload(null);
    }
  };

  const handleCreateMemory = async (key: string, value: string, category: string) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category }),
      });
      if (res.ok) {
        fetchMemories();
        showToast('success', 'Memory Registered', `Committed: ${key} = ${value}`);
      }
    } catch (e) {
      showToast('error', 'Memory Registration Failed', 'Unable to persist memory key.');
    }
  };

  const handleDeleteMemory = async (key: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/memories/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMemories();
        showToast('info', 'Memory Purged', `Deleted preference fact for: ${key}`);
      }
    } catch (e) {
      showToast('error', 'Deletion Failed', 'Failed to remove preference from memory database.');
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/history', { method: 'DELETE' });
      if (res.ok) {
        setMessages([]);
        showToast('info', 'Chat Logs Purged', 'Cleared session chat logs from DB.');
      }
    } catch (e) {
      showToast('error', 'Failure', 'Failed to clear database logs.');
    }
  };

  const handleClose = () => {
    if (window.jarvisAPI) {
      window.jarvisAPI.closeDashboard();
    }
  };

  const handleMinimize = () => {
    if (window.jarvisAPI) {
      window.jarvisAPI.minimizeDashboard();
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 overflow-hidden text-slate-200 border border-slate-800 relative">
      {/* 1. High Tech Header (Draggable) */}
      <header className="h-12 border-b border-slate-800 drag-region flex items-center justify-between px-4 bg-slate-950/80 z-20 shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="high-tech-font font-bold text-sm tracking-widest text-cyan-400">JARVIS OS HUD</span>
          <span className="text-[10px] text-slate-500 font-mono">v2.0.0</span>
        </div>

        {/* Dynamic status nodes */}
        <div className="flex items-center space-x-6 text-[10px] font-mono no-drag">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                orbState === 'idle'
                  ? 'bg-cyan-500'
                  : orbState === 'listening'
                  ? 'bg-red-500 animate-ping'
                  : orbState === 'thinking'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              } `}
            />
            <span className="uppercase text-slate-400">Core: {orbState}</span>
          </div>
          <div className="text-slate-400">
            WS_DIR: <span className="text-cyan-600 font-bold">proud-meitner</span>
          </div>
        </div>

        {/* Window & Settings controls */}
        <div className="flex items-center space-x-1 no-drag">
          <button
            onClick={handleClearHistory}
            title="Clear Chat Logs"
            className="p-1.5 hover:bg-slate-900 rounded text-slate-500 hover:text-rose-400 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Configuration Panel"
            className="p-1.5 hover:bg-slate-900 rounded text-slate-500 hover:text-cyan-400 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleMinimize}
            title="Minimize"
            className="p-1.5 hover:bg-slate-900 rounded text-slate-500 hover:text-white transition"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            title="Close"
            className="p-1.5 hover:bg-rose-950 rounded text-slate-500 hover:text-rose-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main content region */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Metrics & Reactor Core */}
        <MetricsPanel stats={stats} orbState={orbState} />

        {/* Center Chat Feed */}
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isListening={isListening}
          onToggleMic={toggleMicListening}
          orbState={orbState}
          streamingText={streamingText || undefined}
        />
      </main>

      {/* 3. Bottom HUD Panel: Memory storage manager & task logs */}
      <footer className="h-48 border-t border-slate-900 grid grid-cols-2 bg-slate-950/60 font-mono text-[10px] shrink-0">
        <MemoryPanel
          memories={memories}
          onDeleteMemory={handleDeleteMemory}
          onCreateMemory={handleCreateMemory}
        />
        <TaskLog tasks={tasks} />
      </footer>

      {/* Confirmation Modal Overlay */}
      <ConfirmModal isOpen={showConfirm} details={confirmDetails} onConfirm={handleConfirmAction} />

      {/* Settings Overlay Slide-in Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
