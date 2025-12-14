
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon,
  className = '',
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-95 select-none";
  
  const variants = {
    primary: "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:to-brand-700 border border-transparent",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 focus:ring-red-500",
    success: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    glass: "bg-white/40 backdrop-blur-md border border-white/50 text-brand-700 hover:bg-white/60 shadow-sm"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5"
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.96 }}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props as any}
    >
      {Icon && <Icon className={size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      {children}
    </motion.button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    whileHover={onClick ? { y: -2, boxShadow: "0 12px 30px -8px rgba(0, 0, 0, 0.08)" } : {}}
    className={`bg-white rounded-2xl shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden ${className} ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'gray' | 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'brand' | 'purple' }> = ({ children, color = 'gray' }) => {
  const colors = {
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
    red: 'bg-rose-50 text-rose-700 border-rose-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
    yellow: 'bg-amber-50 text-amber-700 border-amber-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border ${colors[color]}`}>
      {children}
    </span>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          />
          <motion.div 
            // Mobile: Slide up from bottom, Desktop: Fade & Scale center
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white w-full sm:rounded-3xl rounded-t-3xl shadow-2xl sm:max-w-md max-h-[90vh] flex flex-col relative z-10"
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
               <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto overscroll-contain pb-safe">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Input text size 16px to prevent IOS zoom
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <input 
      className={`block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-brand-500 focus:ring-brand-500 focus:bg-white transition-all text-base sm:text-sm py-3 px-4 placeholder:text-slate-400 ${className}`} 
      {...props} 
    />
  </div>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <textarea 
      className={`block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-brand-500 focus:ring-brand-500 focus:bg-white transition-all text-base sm:text-sm py-3 px-4 placeholder:text-slate-400 ${className}`} 
      {...props} 
    />
  </div>
);
