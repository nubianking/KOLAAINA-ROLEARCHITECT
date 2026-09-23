import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error("Uncaught rendering error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear storage:", e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black font-sans">
          <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-lg p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-800/50 text-red-400 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Application Encountered an Error</h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                An unexpected rendering issue occurred. You can reload the app or clear cached local state to recover.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/60 border border-neutral-800/80 rounded p-3 text-left overflow-x-auto max-h-32 text-xs font-mono text-red-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-white text-black font-medium text-sm rounded hover:bg-neutral-200 transition-colors shadow-sm"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleResetState}
                className="flex-1 py-3 px-4 bg-neutral-800 text-red-400 border border-red-900/40 font-medium text-sm rounded hover:bg-red-950/30 hover:border-red-800/60 transition-colors"
              >
                Reset State & Clear Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
