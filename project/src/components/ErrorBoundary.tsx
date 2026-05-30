import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'שגיאה לא צפויה' };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0f1a] p-8" dir="rtl">
        <div className="bg-[#141929] border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">
            {this.props.fallbackLabel ?? 'משהו השתבש'}
          </h3>
          <p className="text-slate-500 text-sm mb-4 leading-relaxed">
            אירעה שגיאה בטעינת הדף. ניתן לרענן ולנסות שוב.
          </p>
          {this.state.errorMessage && (
            <p className="text-red-400/70 text-xs font-mono mb-6 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 text-right break-all">
              {this.state.errorMessage}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            רענן דף
          </button>
        </div>
      </div>
    );
  }
}
