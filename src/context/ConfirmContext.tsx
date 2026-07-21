import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal, ConfirmType } from '../components/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  type?: ConfirmType;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmContextType {
  showAlert: (options: ConfirmOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface DialogState {
  isOpen: boolean;
  type: ConfirmType;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isConfirm: boolean;
  resolve?: (value: any) => void;
}

const initialDialogState: DialogState = {
  isOpen: false,
  type: 'info',
  title: '',
  message: '',
  confirmLabel: 'Đã hiểu',
  cancelLabel: 'Hủy',
  isConfirm: false,
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState>(initialDialogState);

  const showAlert = useCallback((options: ConfirmOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        type: options.type || 'info',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'Đã hiểu',
        cancelLabel: '',
        isConfirm: false,
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        type: options.type || 'warning',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'Xác nhận',
        cancelLabel: options.cancelLabel || 'Hủy',
        isConfirm: true,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (dialog.resolve) {
      dialog.resolve(true);
    }
    setDialog(initialDialogState);
  };

  const handleCancel = () => {
    if (dialog.resolve) {
      dialog.resolve(false);
    }
    setDialog(initialDialogState);
  };

  return (
    <ConfirmContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <ConfirmModal
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
        isConfirm={dialog.isConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
