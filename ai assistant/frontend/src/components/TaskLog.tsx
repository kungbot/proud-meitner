import React from 'react';
import { Terminal } from 'lucide-react';

export interface TaskLogItem {
  id: number;
  task_name: string;
  status: string;
  details: string;
  timestamp: string;
}

interface TaskLogProps {
  tasks: TaskLogItem[];
}

export default function TaskLog({ tasks }: TaskLogProps) {
  return (
    <div className="flex flex-col overflow-hidden bg-slate-950/20">
      {/* Panel Header */}
      <div className="h-8 border-b border-slate-900 px-3 flex items-center justify-between bg-slate-950/60 select-none">
        <span className="high-tech-font font-bold text-cyan-400 flex items-center space-x-1.5 uppercase text-[9px] tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-neon-glow-cyan">Tactical Action Log</span>
        </span>
        <span className="text-[7.5px] font-mono text-cyan-500 animate-pulse uppercase tracking-widest">Active Link</span>
      </div>

      {/* Logs Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-950/10">
        {tasks.length === 0 ? (
          <div className="text-slate-600 text-center font-mono text-[9px] mt-6 select-none uppercase">No logs recorded</div>
        ) : (
          tasks.map((task, i) => (
            <div 
              key={i} 
              className="flex justify-between p-1.5 hover:bg-slate-900/10 rounded border border-slate-900/30 font-mono text-[9px] bg-slate-950/10 transition-all duration-200"
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                {/* Custom glowing status indicators */}
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    task.status === 'completed'
                      ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                      : task.status === 'thinking'
                      ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-pulse'
                      : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  }`}
                />
                <span className="text-cyan-600 font-bold shrink-0 uppercase tracking-wide">
                  [{task.task_name}]
                </span>
                <span className="text-slate-350 truncate tracking-wide" title={task.details}>
                  {task.details}
                </span>
              </div>
              <span className="text-slate-600 text-[8px] shrink-0 font-mono select-none">{task.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
