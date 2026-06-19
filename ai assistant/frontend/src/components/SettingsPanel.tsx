import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Eye, EyeOff, Settings, RefreshCw } from 'lucide-react';
import { useToast } from './NotificationToast';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { showToast } = useToast();
  
  const [provider, setProvider] = useState('openai');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [ttsRate, setTtsRate] = useState(185);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [ollamaHost, setOllamaHost] = useState('http://127.0.0.1:11434');
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [showElevenlabsApiKey, setShowElevenlabsApiKey] = useState(false);
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Fetch settings on mount/open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Fetch models when provider changes
  useEffect(() => {
    if (isOpen) {
      loadAvailableModels();
    }
  }, [provider, isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings');
      if (res.ok) {
        const data = await res.json();
        setProvider(data.model_provider || 'openai');
        setModelName(data.model_name || 'gpt-4o-mini');
        setApiKey(data.openai_api_key || '');
        setTtsRate(parseInt(data.tts_rate) || 185);
        setTtsVolume(parseFloat(data.tts_volume) || 1.0);
        setOllamaHost(data.ollama_host || 'http://127.0.0.1:11434');
        setElevenlabsApiKey(data.elevenlabs_api_key || '');
        setElevenlabsVoiceId(data.elevenlabs_voice_id || '21m00Tcm4TlvDq8ikWAM');
      }
    } catch (e) {
      showToast('error', 'Configuration Load Failure', 'Unable to fetch current settings from FastAPI core.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/models');
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data.models || []);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_provider: provider,
          model_name: modelName,
          openai_api_key: apiKey,
          tts_rate: ttsRate.toString(),
          tts_volume: ttsVolume.toString(),
          ollama_host: ollamaHost,
          elevenlabs_api_key: elevenlabsApiKey,
          elevenlabs_voice_id: elevenlabsVoiceId,
        }),
      });
      if (res.ok) {
        showToast('success', 'Configuration Synchronized', 'J.A.R.V.I.S. settings have been live reloaded.');
        onClose();
      } else {
        showToast('error', 'Update Failed', 'Server rejected settings update payload.');
      }
    } catch (e) {
      showToast('error', 'Network Error', 'FastAPI backend settings endpoint is unreachable.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-96 glass-panel-heavy border-l border-cyan-500/30 z-50 p-6 flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
                <span className="high-tech-font font-bold text-cyan-400 flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                  <span className="text-sm tracking-wider uppercase">J.A.R.V.I.S. Configuration</span>
                </span>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
                  <span className="text-[10px] text-slate-500 font-mono">Loading Core Preferences...</span>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
                  {/* Model Provider */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      Model Provider
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="openai">OpenAI / OpenRouter</option>
                      <option value="ollama">Ollama (Offline Local)</option>
                      <option value="mock">Simulation Mode (Mock)</option>
                    </select>
                  </div>

                  {/* API Key */}
                  {provider === 'openai' && (
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        API Key (OpenAI / OpenRouter)
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="w-full bg-slate-950 border border-slate-800 rounded pl-3 pr-10 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder-slate-650"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-350 transition"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ollama Host */}
                  {provider === 'ollama' && (
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        Ollama Service Endpoint
                      </label>
                      <input
                        type="text"
                        value={ollamaHost}
                        onChange={(e) => setOllamaHost(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  )}

                  {/* Model Name */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex justify-between">
                      <span>Reasoning Model Name</span>
                      {isLoadingModels && <span className="text-cyan-500 animate-pulse text-[8px]">Syncing...</span>}
                    </label>
                    
                    <div className="flex space-x-1.5">
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                        list="model-suggestions"
                      />
                      <datalist id="model-suggestions">
                        {availableModels.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* ElevenLabs Settings */}
                  <div className="flex flex-col space-y-1.5 border-t border-slate-900/60 pt-3">
                    <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      ElevenLabs Voice Engine
                    </label>
                    <div className="relative">
                      <input
                        type={showElevenlabsApiKey ? 'text' : 'password'}
                        value={elevenlabsApiKey}
                        onChange={(e) => setElevenlabsApiKey(e.target.value)}
                        placeholder="ElevenLabs API Key"
                        className="w-full bg-slate-950 border border-slate-800 rounded pl-3 pr-10 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder-slate-650"
                      />
                      <button
                        type="button"
                        onClick={() => setShowElevenlabsApiKey(!showElevenlabsApiKey)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-350 transition"
                      >
                        {showElevenlabsApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={elevenlabsVoiceId}
                      onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                      placeholder="Voice ID (e.g. 21m00Tcm4TlvDq8ikWAM)"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder-slate-650"
                    />
                  </div>

                  {/* TTS Rate */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <span>Speech Synthesis Rate</span>
                      <span className="text-cyan-400">{ttsRate} wpm</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="250"
                      value={ttsRate}
                      onChange={(e) => setTtsRate(parseInt(e.target.value))}
                      className="accent-cyan-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer border border-slate-800"
                    />
                  </div>

                  {/* TTS Volume */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <span>Speech Synthesis Volume</span>
                      <span className="text-cyan-400">{(ttsVolume * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={ttsVolume}
                      onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                      className="accent-cyan-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer border border-slate-800"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Save Action */}
            <div className="border-t border-slate-900 pt-4 mt-6">
              <button
                type="submit"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-900 disabled:text-slate-650 text-white rounded-lg transition font-mono uppercase font-bold flex items-center justify-center space-x-1.5 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Commit Settings</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
