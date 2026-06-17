import React, { useRef, useEffect } from 'react';

export type JarvisState = 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking';

interface AILogoProps {
  state: JarvisState;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export default function AILogo({ state, size = 120, className = "", onClick }: AILogoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map states to color palettes
  const colorMap = {
    idle: {
      primary: '#00e1ff',
      secondary: '#0066cc',
      glow: 'rgba(0, 225, 255, 0.4)'
    },
    listening: {
      primary: '#ef4444', // Danger red
      secondary: '#991b1b',
      glow: 'rgba(239, 68, 68, 0.5)'
    },
    thinking: {
      primary: '#f59e0b', // Warning amber
      secondary: '#92400e',
      glow: 'rgba(245, 158, 11, 0.5)'
    },
    executing: {
      primary: '#10b981', // Success emerald
      secondary: '#065f46',
      glow: 'rgba(16, 185, 129, 0.5)'
    },
    speaking: {
      primary: '#06b6d4', // Cyan wave
      secondary: '#0891b2',
      glow: 'rgba(6, 182, 212, 0.6)'
    }
  };

  const colors = colorMap[state] || colorMap.idle;

  // Siri-style multi-frequency sinusoidal wave visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || state === 'idle') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let phase = 0;
    
    // Scale for high DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      
      phase += 0.08;
      
      const centerX = size / 2;
      const centerY = size / 2;
      
      // Determine wave parameters based on state
      let numWaves = 3;
      let maxAmplitude = 0;
      
      if (state === 'speaking') {
        maxAmplitude = 12;
        numWaves = 4;
      } else if (state === 'listening') {
        maxAmplitude = 9;
        numWaves = 3;
      } else if (state === 'thinking') {
        maxAmplitude = 3;
        numWaves = 2;
      } else if (state === 'executing') {
        maxAmplitude = 5;
        numWaves = 3;
      }
      
      for (let i = 0; i < numWaves; i++) {
        ctx.beginPath();
        const wavePhase = phase * (1 + i * 0.12) * (state === 'speaking' ? 1.4 : 1.0);
        const opacity = 0.2 + (i * 0.15);
        ctx.strokeStyle = colors.primary + Math.round(opacity * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = i === numWaves - 1 ? 1.8 : 0.8;
        
        for (let x = 15; x < size - 15; x++) {
          const normX = (x - centerX) / (size / 2 - 15);
          // Bell curve envelope to taper wave amplitude at the edges
          const envelope = Math.pow(1 - normX * normX, 2);
          const frequency = 0.07 + (i * 0.02);
          const y = centerY + Math.sin(x * frequency + wavePhase) * maxAmplitude * envelope;
          
          if (x === 15) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, size, colors.primary]);

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center cursor-pointer transition-all duration-500 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Radial Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-60 transition-all duration-500 scale-110"
        style={{ 
          background: `radial-gradient(circle, ${colors.primary} 0%, ${colors.secondary} 40%, transparent 70%)` 
        }}
      />

      {/* Dynamic Voice Visualizer Canvas */}
      {state !== 'idle' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ width: size, height: size }}
        />
      )}

      {/* SVG Arc Reactor Core */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        className="relative z-10"
      >
        {/* Outer Tech Ring 1 (Slow Spin) */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colors.primary}
          strokeWidth="0.8"
          strokeDasharray="4 8 12 8"
          opacity="0.6"
          className="animate-spin-slow origin-center"
        />

        {/* Outer Tech Ring 2 (Fast Reverse Spin) */}
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke={colors.secondary}
          strokeWidth="0.5"
          strokeDasharray="16 6 8 6"
          opacity="0.8"
          className="animate-spin-reverse-slow origin-center"
        />

        {/* Angular Tick Marks */}
        <g className="origin-center animate-spin-slow" style={{ animationDuration: '30s' }}>
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="8"
              x2="50"
              y2="12"
              stroke={colors.primary}
              strokeWidth="1.5"
              opacity="0.8"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </g>

        {/* Middle Solid Split Ring */}
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke={colors.primary}
          strokeWidth="2.5"
          strokeDasharray="35 15"
          opacity="0.5"
          className="animate-spin-slow origin-center"
        />

        {/* Internal Circuit Circle */}
        <circle
          cx="50"
          cy="50"
          r="24"
          fill="none"
          stroke={colors.secondary}
          strokeWidth="0.5"
          strokeDasharray="2 2"
          opacity="0.7"
        />

        {/* Pulse Layer */}
        <circle
          cx="50"
          cy="50"
          r="18"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.5"
          opacity="0.7"
          className="animate-pulse origin-center"
        />

        {/* Solid Inner Core Core */}
        <circle
          cx="50"
          cy="50"
          r="12"
          fill={colors.primary}
          opacity="0.95"
          className="animate-pulse-slow origin-center"
          style={{
            filter: `drop-shadow(0 0 8px ${colors.primary})`
          }}
        />

        {/* Central White Dot for Intensity */}
        <circle
          cx="50"
          cy="50"
          r="4"
          fill="#ffffff"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
