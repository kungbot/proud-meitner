import React from 'react';
import { Cpu, HardDrive, Cpu as RamIcon, Activity } from 'lucide-react';
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
    <section className="w-80 h-full border-r border-slate-900/60 flex flex-col p-4 bg-slate-950/20 overflow-y-auto space-y-6 shrink-0 z-10">
      
      {/* Animated AI Reactor Core Widget */}
      <div className="glass-panel-hud p-6 rounded tech-corners flex flex-col items-center justify-center relative overflow-hidden group border border-cyan-500/10">
        <div className="tech-corners-inner" />
        <div className="absolute top-2 left-2 text-[8px] font-mono text-slate-500 tracking-widest high-tech-font uppercase select-none">
          ARC Core Diagnostics
        </div>
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[7px] font-mono text-cyan-400 uppercase tracking-widest">Live</span>
        </div>

        <div className="relative p-2 rounded-full border border-slate-800/60 bg-slate-950/40 mt-2">
          <AILogo state={orbState} size={130} />
        </div>
        
        <div className="mt-4 text-center select-none">
          <h3 className="high-tech-font text-[11px] font-bold uppercase tracking-wider text-cyan-400 text-neon-glow-cyan">
            A.I. Core Matrix
          </h3>
          <p className="text-[9px] text-slate-550 font-mono mt-0.5 uppercase tracking-wide">
            STATE: {orbState}
          </p>
        </div>
      </div>

      {/* Real-time System Metrics */}
      <div className="glass-panel-hud p-4 rounded tech-corners space-y-4 border border-cyan-500/10">
        <div className="tech-corners-inner" />
        <h4 className="high-tech-font text-[9px] font-bold uppercase tracking-widest text-cyan-400 flex items-center space-x-1.5 select-none">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Telemetry Feeds</span>
        </h4>
        
        {/* CPU Metric */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-400 uppercase tracking-wider">CPU Utilization</span>
            <span className="text-cyan-400 font-bold">{stats.cpu}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded overflow-hidden border border-slate-900">
            <div
              className="scanning-bar h-full rounded transition-all duration-500"
              style={{ width: `${stats.cpu}%` }}
            />
          </div>
        </div>

        {/* RAM Metric */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-400 uppercase tracking-wider">Memory Allocation</span>
            <span className="text-cyan-400 font-bold">
              {stats.memory_used.toFixed(1)}G / {stats.memory_total.toFixed(0)}G
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded overflow-hidden border border-slate-900">
            <div
              className="scanning-bar h-full rounded transition-all duration-500"
              style={{ 
                width: `${stats.memory_percent}%`,
                filter: 'hue-rotate(40deg)' // Shifts cyan/purple towards violet
              }}
            />
          </div>
        </div>

        {/* Disk Metric */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-400 uppercase tracking-wider">Storage Load (C:)</span>
            <span className="text-cyan-400 font-bold">
              {stats.disk_percent}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded overflow-hidden border border-slate-900">
            <div
              className="scanning-bar h-full rounded transition-all duration-500"
              style={{ 
                width: `${stats.disk_percent}%`,
                filter: 'hue-rotate(85deg)' // Shift color spectrum
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Running Processes */}
      <div className="glass-panel-hud p-4 rounded tech-corners space-y-2.5 border border-cyan-500/10 shrink-0 flex flex-col overflow-hidden h-[180px]">
        <div className="tech-corners-inner" />
        <h4 className="high-tech-font text-[9px] font-bold uppercase tracking-widest text-cyan-400 flex items-center space-x-1.5 select-none shrink-0">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Active Process Load</span>
        </h4>
        
        <div className="space-y-1.5 font-mono text-[9px] overflow-y-auto flex-1 pr-1">
          {stats.processes.map((proc, i) => (
            <div 
              key={i} 
              className="flex justify-between p-1.5 bg-slate-950/40 border border-slate-900/60 rounded hover:border-cyan-500/40 hover:bg-slate-900/10 transition-all duration-350"
            >
              <span className="text-slate-350 truncate max-w-[110px]" title={proc.name}>
                {proc.name}
              </span>
              <div className="space-x-1.5 text-slate-400 shrink-0">
                <span>{proc.memory.toFixed(1)}%</span>
                <span className="text-cyan-500 font-bold">{proc.cpu.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer to prevent bottom padding collapse in scrollable viewport */}
      <div className="h-4 shrink-0" />
    </section>
  );
}
