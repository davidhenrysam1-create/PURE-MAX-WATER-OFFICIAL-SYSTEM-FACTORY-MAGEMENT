import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const GlobalToast: React.FC = () => {
  const { toast, hideToast } = useApp();

  if (!toast) return null;

  const typeStyles = {
    success: {
      bg: 'bg-emerald-950/95 dark:bg-emerald-950/95',
      border: 'border-emerald-500/80',
      text: 'text-emerald-100',
      iconColor: 'text-emerald-400',
      shadow: 'shadow-emerald-950/50',
      icon: CheckCircle2,
      badge: 'bg-emerald-800 text-emerald-200',
    },
    info: {
      bg: 'bg-indigo-950/95 dark:bg-indigo-950/95',
      border: 'border-indigo-500/80',
      text: 'text-indigo-100',
      iconColor: 'text-indigo-400',
      shadow: 'shadow-indigo-950/50',
      icon: Info,
      badge: 'bg-indigo-800 text-indigo-200',
    },
    warning: {
      bg: 'bg-amber-950/95 dark:bg-amber-950/95',
      border: 'border-amber-500/80',
      text: 'text-amber-100',
      iconColor: 'text-amber-400',
      shadow: 'shadow-amber-950/50',
      icon: AlertTriangle,
      badge: 'bg-amber-800 text-amber-200',
    },
    error: {
      bg: 'bg-rose-950/95 dark:bg-rose-950/95',
      border: 'border-rose-500/80',
      text: 'text-rose-100',
      iconColor: 'text-rose-400',
      shadow: 'shadow-rose-950/50',
      icon: AlertCircle,
      badge: 'bg-rose-800 text-rose-200',
    },
  }[toast.type || 'success'];

  const IconComponent = typeStyles.icon;

  return (
    <aside
      id="global-toast-notification-banner"
      aria-label="System notification"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[400] max-w-md w-[calc(100vw-2rem)] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div
        className={`p-4 rounded-2xl border-2 ${typeStyles.bg} ${typeStyles.border} ${typeStyles.text} shadow-2xl ${typeStyles.shadow} backdrop-blur-md flex items-start gap-3.5`}
      >
        <div className="p-1 rounded-xl bg-black/30 shrink-0 mt-0.5">
          <IconComponent className={`w-5 h-5 ${typeStyles.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          {toast.title && (
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                {toast.title}
              </h4>
              <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${typeStyles.badge}`}>
                Confirmed
              </span>
            </div>
          )}
          <p className="text-xs font-medium leading-relaxed opacity-95 text-slate-100">
            {toast.message}
          </p>
        </div>

        <button
          id="btn-dismiss-global-toast"
          onClick={hideToast}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition shrink-0"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
