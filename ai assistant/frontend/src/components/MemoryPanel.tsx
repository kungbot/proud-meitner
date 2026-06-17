import React, { useState } from 'react';
import { Brain, Trash2 } from 'lucide-react';

export interface MemoryItem {
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

interface MemoryPanelProps {
  memories: MemoryItem[];
  onDeleteMemory: (key: string) => void;
  onCreateMemory: (key: string, value: string, category: string) => void;
}

export default function MemoryPanel({ memories, onDeleteMemory, onCreateMemory }: MemoryPanelProps) {
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('user_preference');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim() || !valueInput.trim()) return;
    onCreateMemory(keyInput.trim(), valueInput.trim(), categoryInput);
    setKeyInput('');
    setValueInput('');
  };

  return (
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
            <div className="text-slate-650 text-center mt-6">Memory index is empty.</div>
          ) : (
            memories.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 bg-slate-900/20 hover:bg-slate-900/60 rounded group transition-colors duration-200"
              >
                <span className="text-slate-400 truncate max-w-[90%]">
                  <strong className="text-cyan-600 font-mono">{m.key}</strong>:{' '}
                  <span className="text-slate-300 font-mono">{m.value}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteMemory(m.key)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition duration-200 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Save new memory fact form */}
        <form
          onSubmit={handleSubmit}
          className="w-48 border-l border-slate-900 p-2.5 flex flex-col space-y-2 bg-slate-950/20"
        >
          <span className="text-slate-400 uppercase text-[8px] font-bold tracking-widest font-mono">
            Write preference
          </span>
          <input
            type="text"
            placeholder="Key (e.g. name)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="bg-slate-900 border border-slate-850 px-2 py-1 rounded text-[9px] focus:outline-none focus:border-cyan-500 text-slate-300 font-mono focus:ring-1 focus:ring-cyan-500/20"
          />
          <input
            type="text"
            placeholder="Value (e.g. Tony)"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className="bg-slate-900 border border-slate-850 px-2 py-1 rounded text-[9px] focus:outline-none focus:border-cyan-500 text-slate-300 font-mono focus:ring-1 focus:ring-cyan-500/20"
          />
          <div className="flex space-x-1.5 pt-0.5">
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="bg-slate-900 border border-slate-850 px-1 py-1 rounded text-[8px] focus:outline-none text-slate-400 font-mono flex-1"
            >
              <option value="user_preference">Pref</option>
              <option value="general">Info</option>
              <option value="history">Hist</option>
            </select>
            <button
              type="submit"
              className="py-1 px-2.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[9px] font-bold uppercase tracking-wider transition hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] shrink-0 font-mono"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
