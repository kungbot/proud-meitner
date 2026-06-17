import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Check, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  details: string;
  onConfirm: (approved: boolean) => void;
}

export default function ConfirmModal({ isOpen, details, onConfirm }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-panel-heavy p-6 rounded-2xl max-w-md w-full border border-cyan-500 shadow-2xl flex flex-col space-y-4"
          >
            <div className="flex items-center space-x-3 text-cyan-400">
              <ShieldAlert className="w-8 h-8 shrink-0 text-cyan-400 animate-pulse" />
              <div>
                <h3 className="high-tech-font text-sm font-bold uppercase tracking-wider">Access Authorization</h3>
                <p className="text-[10px] text-slate-400 font-mono">User prompt confirmation required.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-300 font-mono break-all max-h-48 overflow-y-auto">
              {details}
            </div>

            <div className="flex space-x-3 text-xs">
              <button
                onClick={() => onConfirm(false)}
                className="flex-1 py-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition font-mono uppercase text-slate-400 flex items-center justify-center space-x-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Action</span>
              </button>
              <button
                onClick={() => onConfirm(true)}
                className="flex-1 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 text-white transition font-mono uppercase font-bold flex items-center justify-center space-x-1.5 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Task</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
