'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

export type JarvisState = 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking';

export default function OrbPage() {
  const [state, setState] = useState<JarvisState>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<JarvisState>('idle');

  // Mic and Audio analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const volumeRef = useRef<number>(0);

  // Mouse tracking
  const mouseX = useRef<number>(0);
  const mouseY = useRef<number>(0);
  const targetRotationX = useRef<number>(0);
  const targetRotationY = useRef<number>(0);

  // Sync state ref
  useEffect(() => {
    stateRef.current = state;
    if (window.jarvisAPI) {
      window.jarvisAPI.setOrbState(state);
    }

    // Toggle mic based on state
    if (state === 'listening') {
      startMicrophone();
    } else {
      stopMicrophone();
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

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY.current = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopMicrophone();
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
      setTimeout(() => setState('thinking'), 2500);
      setTimeout(() => setState('speaking'), 5000);
      setTimeout(() => setState('idle'), 9000);
    }
  };

  const handleClick = () => {
    if (state === 'idle') {
      triggerVoiceListening();
    } else {
      setState('idle');
    }
  };

  const handleDoubleClick = () => {
    if (window.jarvisAPI) {
      window.jarvisAPI.toggleDashboard();
    }
  };

  // Web Audio API Microphone capture
  const startMicrophone = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!analyserRef.current || stateRef.current !== 'listening') return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Boost volume detection for visual impact
        volumeRef.current = Math.min((average / 128.0) * 1.5, 1.0);
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn("Could not start local microphone analyzer:", e);
    }
  };

  const stopMicrophone = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    analyserRef.current = null;
    volumeRef.current = 0;
  };

  // Color mapping matching existing design
  const colorMap = {
    idle: { primary: '#00e1ff', secondary: '#0066cc' },
    listening: { primary: '#ef4444', secondary: '#991b1b' },
    thinking: { primary: '#f59e0b', secondary: '#92400e' },
    executing: { primary: '#10b981', secondary: '#065f46' },
    speaking: { primary: '#06b6d4', secondary: '#0891b2' }
  };
  const colors = colorMap[state] || colorMap.idle;

  // Initialize and run Three.js 3D Particle Sphere
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 130;
    const scene = new THREE.Scene();
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6;

    // Set up renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(size, size);

    // Create glowing circle texture programmatically
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 16;
    textureCanvas.height = 16;
    const tCtx = textureCanvas.getContext('2d');
    if (tCtx) {
      const gradient = tCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      tCtx.fillStyle = gradient;
      tCtx.fillRect(0, 0, 16, 16);
    }
    const particleTexture = new THREE.CanvasTexture(textureCanvas);

    // Generate particle sphere geometry (Fibonacci distribution)
    const particleCount = 850;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalRadii = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount * 2); // theta, phi

    for (let i = 0; i < particleCount; i++) {
      // Golden ratio placement
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      const radius = 1.6 + Math.random() * 0.15;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalRadii[i] = radius;
      angles[i * 2] = theta;
      angles[i * 2 + 1] = phi;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle material
    const material = new THREE.PointsMaterial({
      color: new THREE.Color(colors.primary),
      size: 0.14,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: particleTexture
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const time = clock.getElapsedTime();
      const currentState = stateRef.current;
      
      // Interpolate material color smoothly towards the target state color
      const currentColors = colorMap[currentState] || colorMap.idle;
      const targetColor = new THREE.Color(currentColors.primary);
      material.color.lerp(targetColor, 0.08);

      // Handle procedural volume simulation for offline or speaking states
      let activeVolume = volumeRef.current;
      if (currentState === 'speaking') {
        activeVolume = 0.15 + Math.sin(time * 12) * 0.1 + Math.sin(time * 7) * 0.05 + Math.random() * 0.05;
      } else if (currentState === 'thinking') {
        activeVolume = 0.05 + Math.sin(time * 6) * 0.02;
      } else if (currentState === 'executing') {
        activeVolume = 0.08 + Math.sin(time * 8) * 0.03;
      } else if (currentState === 'idle') {
        activeVolume = 0.02 + Math.sin(time * 2) * 0.01;
      }

      // Warp sphere particles
      const posAttr = geometry.attributes.position;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const theta = angles[i * 2];
        const phi = angles[i * 2 + 1];
        const baseR = originalRadii[i];

        // Procedural noise waves
        const wave = Math.sin(phi * 4 + time * 3) * Math.cos(theta * 4 + time * 2.5);
        let displacement = 0;

        if (currentState === 'listening') {
          // Dynamic mic responsiveness
          displacement = activeVolume * 1.4 * (1 + Math.sin(phi * 12 + time * 24) * 0.25);
        } else if (currentState === 'speaking') {
          // Rippling soundwaves
          displacement = activeVolume * 0.8 * (1 + wave * 0.35);
        } else if (currentState === 'thinking') {
          // Gentle pulsing swirling
          displacement = wave * 0.12;
        } else if (currentState === 'executing') {
          // Grid-like rapid vibrations
          displacement = activeVolume * 0.7 * (1 + Math.sin(phi * 18 + time * 15) * 0.15);
        } else {
          // Breathing motion
          displacement = activeVolume * 0.3 * (1 + wave * 0.2);
        }

        const r = baseR + displacement;

        // Swirl coordinates around Y axis if thinking
        let thetaOffset = 0;
        if (currentState === 'thinking') {
          thetaOffset = time * 0.4 * (1.0 - Math.abs(Math.cos(phi)));
        }

        const finalTheta = theta + thetaOffset;
        posArray[i * 3] = r * Math.sin(phi) * Math.cos(finalTheta);
        posArray[i * 3 + 1] = r * Math.sin(phi) * Math.sin(finalTheta);
        posArray[i * 3 + 2] = r * Math.cos(phi);
      }
      posAttr.needsUpdate = true;

      // Mouse tilts & continuous rotation
      targetRotationX.current = mouseY.current * 0.25;
      targetRotationY.current = mouseX.current * 0.25;
      
      // Auto rotations + mouse tilt interpolation
      particleSystem.rotation.y += 0.003;
      particleSystem.rotation.x += 0.001;

      particleSystem.rotation.x += (targetRotationX.current - (particleSystem.rotation.x % (Math.PI * 2))) * 0.05;
      particleSystem.rotation.y += (targetRotationY.current - (particleSystem.rotation.y % (Math.PI * 2))) * 0.05;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-transparent overflow-hidden drag-region">
      {/* Draggable container with central 3D Orb and Spinning HUD dials overlay */}
      <div 
        onClick={handleClick}
        className="no-drag relative flex items-center justify-center w-[140px] h-[140px] cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        {/* Outer radial glow matching state colors */}
        <div 
          className="absolute w-[120px] h-[120px] rounded-full blur-xl opacity-50 transition-all duration-500 scale-110"
          style={{ 
            background: `radial-gradient(circle, ${colors.primary} 0%, ${colors.secondary || '#000'} 40%, transparent 70%)` 
          }}
        />

        {/* 3D WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute z-10 w-[130px] h-[130px] rounded-full pointer-events-none"
          style={{ width: 130, height: 130 }}
        />

        {/* Flat HUD tech rings (SVG overlay layered on top of 3D particle Canvas) */}
        <svg 
          width="130" 
          height="130" 
          viewBox="0 0 100 100" 
          className="absolute z-20 pointer-events-none select-none"
        >
          {/* Outer Tech Ring 1 (Slow Spin) */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={colors.primary}
            strokeWidth="0.6"
            strokeDasharray="6 12 18 8"
            opacity="0.45"
            className="animate-spin-slow origin-center"
            style={{ transition: 'stroke 0.5s' }}
          />

          {/* Outer Tech Ring 2 (Fast Reverse Spin) */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={colors.secondary}
            strokeWidth="0.4"
            strokeDasharray="20 8 10 6"
            opacity="0.6"
            className="animate-spin-reverse-slow origin-center"
            style={{ transition: 'stroke 0.5s' }}
          />

          {/* Angular Ticks around the perimeter */}
          <g 
            className="origin-center animate-spin-slow" 
            style={{ animationDuration: '35s' }}
          >
            {[...Array(8)].map((_, i) => (
              <line
                key={i}
                x1="50"
                y1="6"
                x2="50"
                y2="10"
                stroke={colors.primary}
                strokeWidth="1.2"
                opacity="0.7"
                transform={`rotate(${i * 45} 50 50)`}
                style={{ transition: 'stroke 0.5s' }}
              />
            ))}
          </g>

          {/* Middle Split Dial Ring */}
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke={colors.primary}
            strokeWidth="1.5"
            strokeDasharray="45 15"
            opacity="0.35"
            className="animate-spin-slow origin-center"
            style={{ transition: 'stroke 0.5s' }}
          />

          {/* Core Circuit Circle boundary */}
          <circle
            cx="50"
            cy="50"
            r="26"
            fill="none"
            stroke={colors.secondary}
            strokeWidth="0.5"
            strokeDasharray="2 3"
            opacity="0.5"
            style={{ transition: 'stroke 0.5s' }}
          />
        </svg>

        {/* Floating double-click dashboard toggler indicator */}
        <div 
          onDoubleClick={handleDoubleClick}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 text-center text-[9px] text-cyan-400 opacity-0 hover:opacity-80 transition-opacity duration-300 high-tech-font uppercase select-none cursor-pointer"
        >
          Double click to HUD
        </div>
      </div>
    </div>
  );
}
