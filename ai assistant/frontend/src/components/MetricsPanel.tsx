import React from 'react';
import { Cpu, HardDrive, Cpu as RamIcon } from 'lucide-react';
import AILogo, { JarvisState } from './AILogo';

export interface ProcessInfo {
  pid: number;
  name: string;
  memory: number;
  cpu: number;
}

export interface SystemStats {
  cpu: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  disk_used: number;
  disk_total: number;
  disk_percent: number;
  processes: ProcessInfo[];
}

interface MetricsPanelProps {
  stats: SystemStats;
  orbState: JarvisState;
}

export default function MetricsPanel({ stats, orbState }: MetricsPanelProps) {
  return (
    <section className="w-80 border-r border-slate-900 flex flex-col p-4 bg-slate-900/10 overflow-y-auto space-y-6 shrink-0">
      
      {/* Animated AI Reactor Core Widget */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute top-2 left-2 text-[8px] font-mono text-slate-500 tracking-widest high-tech-font uppercase">
          ARC Reactor Model 2
        </div>
        <AILogo state={orbState} size={150} />
        <div className="mt-4 text-center">
          <h3 className="high-tech-font text-xs font-bold uppercase tracking-wider text-cyan-400">
            JARVIS Core Intelligence
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">
            Status: Online | Core: {orbState}
          </p>
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
            <span className="text-cyan-400 font-bold">{stats.cpu}%</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.cpu}%` }}
            />
          </div>
        </div>

        {/* RAM Metric */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400">System Memory</span>
            <span className="text-cyan-400 font-bold">
              {stats.memory_used.toFixed(1)} GB / {stats.memory_total.toFixed(1)} GB
            </span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.memory_percent}%` }}
            />
          </div>
        </div>

        {/* Disk Metric */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400">Disk Space (C:)</span>
            <span className="text-cyan-400 font-bold">
              {stats.disk_used.toFixed(0)} GB / {stats.disk_total.toFixed(0)} GB
            </span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.disk_percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Running Processes */}
      <div className="glass-panel p-4 rounded-xl space-y-2.5">
        <h4 className="high-tech-font text-[10px] font-bold uppercase tracking-wider text-cyan-500 flex items-center space-x-1.5">
          <RamIcon className="w-3.5 h-3.5 text-cyan-500" />
          <span>Top Memory Processes</span>
        </h4>
        <div className="space-y-1.5 font-mono text-[10px]">
          {stats.processes.map((proc, i) => (
            <div key={i} className="flex justify-between p-1.5 bg-slate-950/40 border border-slate-800/40 rounded hover:border-cyan-500/30 transition-colors duration-200">
              <span className="text-slate-300 truncate max-w-[120px]" title={proc.name}>
                {proc.name}
              </span>
              <div className="space-x-1.5 text-slate-400 shrink-0">
                <span>{proc.memory}% MEM</span>
                <span className="text-cyan-600 font-bold">{proc.cpu}% CPU</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
