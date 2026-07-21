import React from 'react';
import { Icon } from './Icon';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: AlertType;
  title: string;
  message: string;
  confirmLabel?: string;
}

const TYPE_CONFIG: Record<AlertType, { icon: string; iconBg: string; iconColor: string; titleColor: string; btnClass: string; borderColor: string }> = {
  error: {
    icon: 'cancel',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-700',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
    borderColor: 'border-red-200',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-700',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    borderColor: 'border-amber-200',
  },
  success: {
    icon: 'check_circle',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-700',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    borderColor: 'border-emerald-200',
  },
  info: {
    icon: 'info',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-700',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    borderColor: 'border-blue-200',
  },
};

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  type = 'error',
  title,
  message,
  confirmLabel = 'Đã hiểu',
}) => {
  if (!isOpen) return null;

  const cfg = TYPE_CONFIG[type];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`relative bg-white rounded-3xl shadow-2xl max-w-sm w-full border ${cfg.borderColor} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'alertModalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <style>{`
          @keyframes alertModalIn {
            from { opacity: 0; transform: scale(0.85) translateY(20px); }
            to   { opacity: 1; transform: scale(1)   translateY(0); }
          }
        `}</style>

        {/* Top accent strip */}
        <div className={`h-1.5 w-full ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-400' : type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

        <div className="p-8 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full ${cfg.iconBg} flex items-center justify-center shadow-md`}>
            <Icon name={cfg.icon} className={`text-[42px] ${cfg.iconColor}`} />
          </div>

          {/* Texts */}
          <div className="space-y-2">
            <h3 className={`text-xl font-extrabold ${cfg.titleColor}`}>{title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>

          {/* Action button */}
          <button
            id="alert-modal-confirm-btn"
            onClick={onClose}
            className={`w-full py-3 px-6 rounded-2xl font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-md ${cfg.btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
