'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, ShieldAlert, Cpu, HardDrive, Cpu as RamIcon, 
  Send, Mic, Brain, RefreshCw, X, Minimize2, Check, AlertTriangle, Play, Trash2
} from 'lucide-react';
import AILogo, { JarvisState } from '../components/AILogo';

interface ProcessInfo {
  pid: number;
  name: string;
  memory: number;
  cpu: number;
}

interface SystemStats {
  cpu: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  disk_used: number;
  disk_total: number;
  disk_percent: number;
  processes: ProcessInfo[];
}

interface MemoryItem {
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

interface TaskLog {
  id: number;
  task_name: string;
  status: string;
  details: string;
  timestamp: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  data?: any;
}

declare global {
  interface Window {
    jarvisAPI?: {
      isElectron: boolean;
      closeDashboard: () => void;
      minimizeDashboard: () => void;
      onUpdateOrbState: (callback: (state: string) => void) => void;
    };
  }
}

export default function DashboardPage() {
  // Application State
  const [orbState, setOrbState] = useState<JarvisState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  // System Metrics
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    memory_used: 0,
    memory_total: 16.0,
    memory_percent: 0,
    disk_used: 0,
    disk_total: 512.0,
    disk_percent: 0,
    processes: []
  });

  // DB Memories & Logs
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskLog[]>([]);

  // Security confirmation state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState('');
  const [confirmPayload, setConfirmPayload] = useState<any>(null);

  // New Memory creation form
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryVal, setNewMemoryVal] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          body: JSON.stringify({ query: "Welcome back, sir. Systems are fully loaded and operational." })
        });
      } catch (e) {
        console.error("Failed to trigger welcome TTS:", e);
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
      if (msg.type === "status") {
        setOrbState(msg.state as JarvisState);
        if (msg.state === 'listening') {
          setIsListening(true);
        } else {
          setIsListening(false);
        }
      } else if (msg.type === "transcription") {
        addMessage('user', msg.text);
      } else if (msg.type === "result") {
        if (msg.status === "needs_confirmation") {
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
          { pid: 3004, name: 'slack.exe', memory: 1.8, cpu: 0.1 }
        ]
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
        { key: 'project', value: 'VetConnect Dashboard', category: 'preference', updated_at: '2026-06-14' },
        { key: 'editor', value: 'VS Code', category: 'preference', updated_at: '2026-06-14' }
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
        { id: 1, task_name: 'Orchestrator', status: 'completed', details: 'Initialized system successfully.', timestamp: '15:36:27' }
      ]);
    }
  };

  const addMessage = (role: 'user' | 'assistant' | 'system', text: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setMessages(prev => [...prev, { role, text, timestamp, data }]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText('');
    addMessage('user', text);
    setOrbState('thinking');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.status === "needs_confirmation") {
          setConfirmDetails(result.action_details);
          setConfirmPayload(result.payload);
          setShowConfirm(true);
          setOrbState('idle');
        } else {
          addMessage('assistant', result.response, result.data);
          setOrbState('idle');
          fetchMemories();
        }
      }
    } catch (err) {
      addMessage('assistant', `I could not connect to my core brain services. Details: ${err}`);
      setOrbState('idle');
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
      // Offline fallback toggle simulation
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
        body: JSON.stringify({ payload: confirmPayload })
      });

      if (res.ok) {
        const data = await res.json();
        addMessage('assistant', data.response, data.data);
      }
    } catch (e) {
      addMessage('assistant', `Execution failed: ${e}`);
    } finally {
      setOrbState('idle');
      setConfirmPayload(null);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryVal.trim()) return;

    try {
      const res = await fetch('http://127.0.0.1:8000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newMemoryKey, value: newMemoryVal })
      });
      if (res.ok) {
        setNewMemoryKey('');
        setNewMemoryVal('');
        fetchMemories();
      }
    } catch (e) {
      console.error("Failed to save memory.");
    }
  };

  const handleDeleteMemory = async (key: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/memories/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMemories();
      }
    } catch (e) {
      console.error(e);
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
    <div className="w-screen h-screen flex flex-col bg-slate-950 overflow-hidden text-slate-200 border border-slate-800">
      
      {/* 1. High Tech Header (Draggable) */}
      <header className="h-12 border-b border-slate-800 drag-region flex items-center justify-between px-4 bg-slate-950/80 z-20">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="high-tech-font font-bold text-sm tracking-widest text-cyan-400">JARVIS OS HUD</span>
          <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
        </div>
        
        {/* Dynamic status nodes */}
        <div className="flex items-center space-x-6 text-[10px] font-mono no-drag">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${orbState === 'idle' ? 'bg-cyan-500' : orbState === 'listening' ? 'bg-red-500 animate-ping' : orbState === 'thinking' ? 'bg-amber-500' : 'bg-emerald-500'} `} />
            <span className="uppercase text-slate-400">Core: {orbState}</span>
          </div>
          <div className="text-slate-400">
            WS_DIR: <span className="text-cyan-600">proud-meitner</span>
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-center space-x-1 no-drag">
          <button onClick={handleMinimize} className="p-1.5 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={handleClose} className="p-1.5 hover:bg-rose-950 rounded text-slate-400 hover:text-rose-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main content region */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Reactor Core & Diagnostics */}
        <section className="w-80 border-r border-slate-900 flex flex-col p-4 bg-slate-900/10 overflow-y-auto space-y-6">
          
          {/* Animated AI Reactor Core Widget */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-2 left-2 text-[8px] font-mono text-slate-500 tracking-widest high-tech-font uppercase">ARC Reactor Model 1</div>
            <AILogo state={orbState} size={150} />
            <div className="mt-4 text-center">
              <h3 className="high-tech-font text-xs font-bold uppercase tracking-wider text-cyan-400">JARVIS Core Intelligence</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Status: Online | Listening Thread Active</p>
            </div>
          </div>

          {/* Real-time System Metrics */}
          <div className="glass-panel p-4 rounded-xl space-y-4">
            <h4 className="high-tech-font text-[10px] font-bold uppercase tracking-wider text-cyan-500 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-cyan-500" />
              <span>Telemetry Diagnostics</span>
            </h4>
            
            {/* CPU Metric */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">CPU Usage</span>
                <span className="text-cyan-400">{stats.cpu}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.cpu}%` }}
                />
              </div>
            </div>

            {/* RAM Metric */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">System Memory</span>
                <span className="text-cyan-400">{stats.memory_used} GB / {stats.memory_total} GB</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.memory_percent}%` }}
                />
              </div>
            </div>

            {/* Disk Metric */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Disk Space (C:)</span>
                <span className="text-cyan-400">{stats.disk_used} GB / {stats.disk_total} GB</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.disk_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Top Running Processes */}
          <div className="glass-panel p-4 rounded-xl space-y-2.5">
            <h4 className="high-tech-font text-[10px] font-bold uppercase tracking-wider text-cyan-500">Top Memory Processes</h4>
            <div className="space-y-1.5 font-mono text-[10px]">
              {stats.processes.map((proc, i) => (
                <div key={i} className="flex justify-between p-1 bg-slate-950/40 border border-slate-800/40 rounded">
                  <span className="text-slate-300 truncate max-w-[120px]">{proc.name}</span>
                  <div className="space-x-1.5 text-slate-400">
                    <span>{proc.memory}% MEM</span>
                    <span className="text-cyan-600">{proc.cpu}% CPU</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side: Conversation Grid / RAG memory tabs */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
          
          {/* Chat log Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <Brain className="w-12 h-12 text-slate-800 animate-pulse" />
                <div className="max-w-md">
                  <h3 className="high-tech-font text-cyan-400 text-sm tracking-wider uppercase">System Ready</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Say <span className="text-cyan-300 font-mono">"Jarvis, open Visual Studio Code"</span>, 
                    <span className="text-cyan-300 font-mono">"lock my computer"</span>, or type a request to orchestrate operating system tasks.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div className="flex items-center space-x-1.5 text-[9px] text-slate-500 font-mono mb-1">
                    <span>{msg.role.toUpperCase()}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-100 rounded-br-none' 
                      : msg.role === 'system'
                      ? 'bg-amber-950/40 border-amber-800/50 text-amber-100 font-mono'
                      : 'bg-slate-900/70 border-slate-800 text-slate-200 rounded-bl-none'
                  }`}>
                    {/* Render standard text or formatted code block */}
                    {msg.text.includes("```") ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap bg-slate-950 p-3 rounded font-mono text-[11px] text-cyan-300/90 border border-slate-900 mt-2">
                        {msg.text.replace(/```[a-z]*/g, "")}
                      </pre>
                    ) : (
                      <div className="whitespace-pre-line">{msg.text}</div>
                    )}

                    {/* Additional structured data details (e.g. folder listings, stats) */}
                    {msg.data && typeof msg.data === 'object' && !Array.isArray(msg.data) && (
                      <div className="mt-3 border-t border-slate-800/60 pt-2 text-[10px] text-slate-400 font-mono">
                        <details>
                          <summary className="cursor-pointer text-cyan-500 hover:underline">View JSON Payload</summary>
                          <pre className="mt-2 bg-slate-950/80 p-2 rounded overflow-x-auto text-[9px]">
                            {JSON.stringify(msg.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Interactive Chat Form Inputs */}
          <form 
            onSubmit={handleSendMessage} 
            className="p-4 border-t border-slate-900 bg-slate-950/80 flex items-center space-x-2.5 z-10"
          >
            <button 
              type="button"
              onClick={toggleMicListening}
              className={`p-3 rounded-full border transition flex items-center justify-center shrink-0 ${
                isListening 
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
                  : 'bg-slate-900 border-slate-800 hover:border-cyan-500 text-slate-400 hover:text-cyan-400'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Orchestrate JARVIS assistant..."
              className="flex-1 bg-slate-900/70 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
            />
            
            <button 
              type="submit"
              className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center justify-center hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Security Action Authorization Modal Popup Overlay */}
          {showConfirm && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-6">
              <div className="glass-panel-heavy p-6 rounded-2xl max-w-md w-full border border-cyan-500 shadow-2xl flex flex-col space-y-4">
                <div className="flex items-center space-x-3 text-cyan-400">
                  <ShieldAlert className="w-8 h-8 shrink-0 text-cyan-400" />
                  <div>
                    <h3 className="high-tech-font text-sm font-bold uppercase tracking-wider">Access Authorization</h3>
                    <p className="text-[10px] text-slate-400 font-mono">User prompt confirmation required.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-300 font-mono">
                  {confirmDetails}
                </div>

                <div className="flex space-x-3 text-xs">
                  <button 
                    onClick={() => handleConfirmAction(false)}
                    className="flex-1 py-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 hover:text-white transition font-mono uppercase text-slate-400"
                  >
                    Cancel Action
                  </button>
                  <button 
                    onClick={() => handleConfirmAction(true)}
                    className="flex-1 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 text-white transition font-mono uppercase font-bold flex items-center justify-center space-x-1.5 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Task</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 3. Bottom HUD Panel: Memory storage manager & task logs */}
      <footer className="h-48 border-t border-slate-900 grid grid-cols-2 bg-slate-950/60 font-mono text-[10px]">
        
        {/* Memory database viewer and registration */}
        <div className="border-r border-slate-900 flex flex-col overflow-hidden">
          <div className="h-8 border-b border-slate-900 px-3 flex items-center justify-between bg-slate-900/30">
            <span className="high-tech-font font-bold text-cyan-500 flex items-center space-x-1.5">
              <Brain className="w-3.5 h-3.5" />
              <span>Living Memory Facts</span>
            </span>
            <span className="text-slate-500">Stored keys: {memories.length}</span>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Memory feed */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-950/40">
              {memories.length === 0 ? (
                <div className="text-slate-600 text-center mt-6">Memory index is empty.</div>
              ) : (
                memories.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-900/20 hover:bg-slate-900/60 rounded group">
                    <span className="text-slate-400">
                      <strong className="text-cyan-600">{m.key}</strong>: <span className="text-slate-300">{m.value}</span>
                    </span>
                    <button 
                      onClick={() => handleDeleteMemory(m.key)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Save new memory fact form */}
            <form onSubmit={handleCreateMemory} className="w-48 border-l border-slate-900 p-2.5 flex flex-col space-y-2 bg-slate-950/20">
              <span className="text-slate-400 uppercase text-[8px] font-bold">Write preference</span>
              <input 
                type="text" 
                placeholder="Key (e.g. workspace)" 
                value={newMemoryKey} 
                onChange={e => setNewMemoryKey(e.target.value)}
                className="bg-slate-900 border border-slate-850 px-2 py-1 rounded text-[9px] focus:outline-none focus:border-cyan-500 text-slate-300"
              />
              <input 
                type="text" 
                placeholder="Value" 
                value={newMemoryVal} 
                onChange={e => setNewMemoryVal(e.target.value)}
                className="bg-slate-900 border border-slate-850 px-2 py-1 rounded text-[9px] focus:outline-none focus:border-cyan-500 text-slate-300"
              />
              <button 
                type="submit" 
                className="py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[9px] font-bold uppercase transition"
              >
                Register
              </button>
            </form>
          </div>
        </div>

        {/* Live background task checklist logger */}
        <div className="flex flex-col overflow-hidden bg-slate-950/20">
          <div className="h-8 border-b border-slate-900 px-3 flex items-center justify-between bg-slate-900/30">
            <span className="high-tech-font font-bold text-cyan-500 flex items-center space-x-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Orchestrator Actions Progress Log</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tasks.length === 0 ? (
              <div className="text-slate-600 text-center mt-6">No background tasks found.</div>
            ) : (
              tasks.map((task, i) => (
                <div key={i} className="flex justify-between p-1.5 hover:bg-slate-900/30 rounded border border-slate-900/10">
                  <div className="flex items-center space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'thinking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="text-slate-400 font-bold text-[9px]">{task.task_name}</span>
                    <span className="text-slate-300">{task.details}</span>
                  </div>
                  <span className="text-slate-600 text-[9px]">{task.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </footer>
    </div>
  );
}
