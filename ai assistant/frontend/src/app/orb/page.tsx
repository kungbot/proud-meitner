'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

export type JarvisState = 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking';

export default function OrbPage() {
  const [state, setState] = useState<JarvisState>('idle');
  const [visualizerStyle, setVisualizerStyle] = useState<'sphere' | 'bars' | 'reactor'>('sphere');
  const wsRef = useRef<WebSocket | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<JarvisState>('idle');

  // Sync visualizer style from settings core
  useEffect(() => {
    const fetchStyle = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.visualizer_style) {
            setVisualizerStyle(data.visualizer_style);
          }
        }
      } catch (e) {
        console.error("Failed to load visualizer style:", e);
      }
    };
    fetchStyle();
    const interval = setInterval(fetchStyle, 5000);
    return () => clearInterval(interval);
  }, []);

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

  // Initialize and run Three.js 3D Visualizers
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

    // Setup visualizer variables
    let particleSystem: THREE.Points | null = null;
    let particleGeometry: THREE.BufferGeometry | null = null;
    let particleMaterial: THREE.PointsMaterial | null = null;
    const originalRadii: number[] = [];
    const angles: number[] = []; // theta, phi pairs
    const particleCount = 850;

    // For bars style
    const barCount = 48;
    const barsGroup = new THREE.Group();
    const bars: THREE.Mesh[] = [];
    const barGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);

    // For reactor style
    const reactorGroup = new THREE.Group();
    const ringParticles: THREE.Points[] = [];
    const ringRadii = [0.8, 1.3, 1.8];
    const ringCounts = [120, 200, 300];
    const ringSpeeds = [0.6, -0.4, 0.2];

    if (visualizerStyle === 'sphere') {
      particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
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

        originalRadii.push(radius);
        angles.push(theta, phi);
      }

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      particleMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(colors.primary),
        size: 0.14,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: particleTexture
      });

      particleSystem = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particleSystem);

    } else if (visualizerStyle === 'bars') {
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const barMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(colors.primary),
          transparent: true,
          opacity: 0.85
        });
        const mesh = new THREE.Mesh(barGeo, barMat);
        
        const radius = 1.5;
        mesh.position.x = radius * Math.cos(angle);
        mesh.position.y = radius * Math.sin(angle);
        mesh.position.z = 0;
        mesh.rotation.z = angle - Math.PI / 2;
        
        barsGroup.add(mesh);
        bars.push(mesh);
      }
      scene.add(barsGroup);

    } else if (visualizerStyle === 'reactor') {
      ringRadii.forEach((radius, ringIdx) => {
        const count = ringCounts[ringIdx];
        const ringGeo = new THREE.BufferGeometry();
        const ringPos = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.05;
          ringPos[i * 3] = radius * Math.cos(angle);
          ringPos[i * 3 + 1] = radius * Math.sin(angle);
          ringPos[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
        }
        
        ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
        
        const ringMat = new THREE.PointsMaterial({
          color: new THREE.Color(colors.primary),
          size: 0.11 - ringIdx * 0.02,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          map: particleTexture
        });
        
        const points = new THREE.Points(ringGeo, ringMat);
        reactorGroup.add(points);
        ringParticles.push(points);
      });
      scene.add(reactorGroup);
    }

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const time = clock.getElapsedTime();
      const currentState = stateRef.current;
      const currentColors = colorMap[currentState] || colorMap.idle;
      const targetColor = new THREE.Color(currentColors.primary);

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

      // Animate according to visualizerStyle
      if (visualizerStyle === 'sphere' && particleSystem && particleGeometry && particleMaterial) {
        particleMaterial.color.lerp(targetColor, 0.08);

        const posAttr = particleGeometry.attributes.position;
        const posArray = posAttr.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          const theta = angles[i * 2];
          const phi = angles[i * 2 + 1];
          const baseR = originalRadii[i];

          const wave = Math.sin(phi * 4 + time * 3) * Math.cos(theta * 4 + time * 2.5);
          let displacement = 0;

          if (currentState === 'listening') {
            displacement = activeVolume * 1.4 * (1 + Math.sin(phi * 12 + time * 24) * 0.25);
          } else if (currentState === 'speaking') {
            displacement = activeVolume * 0.8 * (1 + wave * 0.35);
          } else if (currentState === 'thinking') {
            displacement = wave * 0.12;
          } else if (currentState === 'executing') {
            displacement = activeVolume * 0.7 * (1 + Math.sin(phi * 18 + time * 15) * 0.15);
          } else {
            displacement = activeVolume * 0.3 * (1 + wave * 0.2);
          }

          const r = baseR + displacement;

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

        targetRotationX.current = mouseY.current * 0.25;
        targetRotationY.current = mouseX.current * 0.25;
        
        particleSystem.rotation.y += 0.003;
        particleSystem.rotation.x += 0.001;
        particleSystem.rotation.x += (targetRotationX.current - (particleSystem.rotation.x % (Math.PI * 2))) * 0.05;
        particleSystem.rotation.y += (targetRotationY.current - (particleSystem.rotation.y % (Math.PI * 2))) * 0.05;

      } else if (visualizerStyle === 'bars') {
        for (let i = 0; i < barCount; i++) {
          const mesh = bars[i];
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.color.lerp(targetColor, 0.08);

          const freqOffset = Math.sin((i / barCount) * Math.PI * 5 + time * 10) * 0.15;
          const scaleY = 0.2 + activeVolume * 2.0 * (1.0 + freqOffset);
          mesh.scale.set(1, scaleY, 1);

          const angle = (i / barCount) * Math.PI * 2;
          const currentRadius = 1.3 + activeVolume * 0.5;
          mesh.position.x = currentRadius * Math.cos(angle);
          mesh.position.y = currentRadius * Math.sin(angle);
        }
        barsGroup.rotation.z += 0.005;

        // Apply mouse tilts
        targetRotationX.current = mouseY.current * 0.15;
        targetRotationY.current = mouseX.current * 0.15;
        barsGroup.rotation.x += (targetRotationX.current - (barsGroup.rotation.x % (Math.PI * 2))) * 0.05;
        barsGroup.rotation.y += (targetRotationY.current - (barsGroup.rotation.y % (Math.PI * 2))) * 0.05;

      } else if (visualizerStyle === 'reactor') {
        ringParticles.forEach((points, ringIdx) => {
          const mat = points.material as THREE.PointsMaterial;
          mat.color.lerp(targetColor, 0.08);

          const speed = ringSpeeds[ringIdx];
          points.rotation.z += speed * 0.01;

          const scaleVal = 1.0 + activeVolume * 0.35 * Math.sin(time * 8 + ringIdx * Math.PI / 3);
          points.scale.set(scaleVal, scaleVal, 1);

          points.rotation.x = Math.sin(time + ringIdx) * 0.10;
          points.rotation.y = Math.cos(time + ringIdx) * 0.10;
        });
        reactorGroup.rotation.y += 0.002;

        targetRotationX.current = mouseY.current * 0.2;
        targetRotationY.current = mouseX.current * 0.2;
        reactorGroup.rotation.x += (targetRotationX.current - (reactorGroup.rotation.x % (Math.PI * 2))) * 0.05;
        reactorGroup.rotation.y += (targetRotationY.current - (reactorGroup.rotation.y % (Math.PI * 2))) * 0.05;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      
      // Cleanup all objects in scene
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        } else if (object instanceof THREE.Points) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      
      barGeo.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, [visualizerStyle]);

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
