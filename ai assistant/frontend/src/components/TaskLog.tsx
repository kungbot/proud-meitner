import React from 'react';
import { RefreshCw } from 'lucide-react';

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
      <div className="h-8 border-b border-slate-900 px-3 flex items-center justify-between bg-slate-900/30">
        <span className="high-tech-font font-bold text-cyan-500 flex items-center space-x-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
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
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    task.status === 'completed'
                      ? 'bg-emerald-500'
                      : task.status === 'thinking'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-400 font-bold text-[9px]">{task.task_name}</span>
                <span className="text-slate-300 truncate max-w-[280px]">{task.details}</span>
              </div>
              <span className="text-slate-650 text-[9px] shrink-0">{task.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
