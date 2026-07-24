import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Icon name="warning" className="text-[36px]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Đã xảy ra sự cố không mong muốn</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hệ thống vừa phát hiện sự cố nhỏ khi tải giao diện. Vui lòng bấm làm mới trang để tiếp tục sử dụng.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-600 text-left overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Icon name="refresh" className="text-[18px]" />
              <span>Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
