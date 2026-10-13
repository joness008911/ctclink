import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    console.error("[CRITICAL_CLIENT_ERROR] Uncaught error in React component tree:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">Application Error</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected issue occurred while rendering the page. You can reload or return to the main dashboard.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl text-left font-mono text-[11px] overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoHome}
                className="h-9 text-xs border-slate-200 text-slate-700 gap-1.5 rounded-lg"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Go to Home</span>
              </Button>

              <Button
                size="sm"
                onClick={this.handleReload}
                className="h-9 text-xs bg-[#0A5C48] hover:bg-[#07382D] text-white gap-1.5 rounded-lg font-bold shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
