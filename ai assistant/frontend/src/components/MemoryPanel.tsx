import React, { useState } from 'react';
import { Brain, Trash2, Plus } from 'lucide-react';

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
    <div className="border-r border-slate-900/60 flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="h-8 border-b border-slate-900 px-3 flex items-center justify-between bg-slate-950/60 select-none">
        <span className="high-tech-font font-bold text-cyan-400 flex items-center space-x-1.5 uppercase text-[9px] tracking-wider">
          <Brain className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-neon-glow-cyan">Semantic Memory Index</span>
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase">Records: {memories.length}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Memory feed */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-950/20">
          {memories.length === 0 ? (
            <div className="text-slate-600 text-center font-mono text-[9px] mt-6 select-none uppercase">Memory index empty</div>
          ) : (
            memories.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 bg-slate-900/10 border border-slate-900/60 hover:border-cyan-500/30 hover:bg-slate-900/5 rounded group transition-all duration-200"
              >
                <span className="text-slate-350 truncate max-w-[90%] text-[9px]">
                  <strong className="text-cyan-500 font-mono tracking-wide">{m.key}</strong>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className="text-slate-300 font-mono">{m.value}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteMemory(m.key)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-900 text-slate-500 hover:text-rose-400 rounded transition duration-200 shrink-0"
                  title="Purge Fact"
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
          className="w-48 border-l border-slate-900 p-2.5 flex flex-col space-y-2 bg-slate-950/40 select-none"
        >
          <span className="text-slate-500 uppercase text-[8px] font-bold tracking-widest font-mono">
            Register Preference
          </span>
          <input
            type="text"
            placeholder="Key (e.g., editor)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="bg-slate-950 border border-slate-900 px-2 py-1.5 rounded text-[9px] focus:outline-none focus:border-cyan-500/50 text-slate-300 font-mono"
          />
          <input
            type="text"
            placeholder="Value (e.g., VS Code)"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className="bg-slate-950 border border-slate-900 px-2 py-1.5 rounded text-[9px] focus:outline-none focus:border-cyan-500/50 text-slate-300 font-mono"
          />
          <div className="flex space-x-1.5 pt-0.5">
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="bg-slate-950 border border-slate-900 px-1 py-1 rounded text-[8px] focus:outline-none text-slate-500 font-mono flex-1 cursor-pointer"
            >
              <option value="user_preference">PREF</option>
              <option value="general">INFO</option>
              <option value="history">HIST</option>
            </select>
            <button
              type="submit"
              className="p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition flex items-center justify-center shrink-0 w-7 h-6 hover:shadow-[0_0_8px_rgba(6,182,212,0.4)]"
              title="Save Fact"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
