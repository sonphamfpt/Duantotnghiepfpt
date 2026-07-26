import React from 'react';
import { Icon } from './Icon';

export type ConfirmType = 'error' | 'warning' | 'success' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  type?: ConfirmType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TYPE_CONFIG: Record<ConfirmType, { icon: string; iconBg: string; iconColor: string; titleColor: string; btnClass: string; borderColor: string }> = {
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

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  isConfirm = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG['error'];


  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className={`relative bg-white rounded-3xl shadow-2xl max-w-sm w-full border ${cfg.borderColor} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'confirmModalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <style>{`
          @keyframes confirmModalIn {
            from { opacity: 0; transform: scale(0.85) translateY(20px); }
            to   { opacity: 1; transform: scale(1)   translateY(0); }
          }
        `}</style>

        {/* Top accent strip */}
        <div className={`h-1.5 w-full ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-400' : type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

        <div className="p-8 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full ${cfg.iconBg} flex items-center justify-center shadow-md`}>
            <Icon name={cfg.icon} className={`text-[36px] ${cfg.iconColor}`} />
          </div>

          {/* Texts */}
          <div className="space-y-2">
            <h3 className={`text-lg font-extrabold ${cfg.titleColor}`}>{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 w-full mt-2">
            {isConfirm && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer border-none"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm border-none ${cfg.btnClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
