import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, description: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, title: string, description: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertOctagon className="w-5 h-5 text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-cyan-400" />,
  };

  const borderClass = {
    success: 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    error: 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    warning: 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    info: 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.25 }}
      className={`glass-panel p-4 rounded-xl flex items-start space-x-3 pointer-events-auto border ${borderClass[toast.type]} backdrop-blur-md`}
    >
      <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 high-tech-font">
          {toast.title}
        </h4>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-mono">
          {toast.description}
        </p>
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 hover:bg-slate-900 rounded text-slate-500 hover:text-slate-300 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};
