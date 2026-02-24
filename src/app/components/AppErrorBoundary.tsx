import React from "react";
import { track } from "@/lib/analytics";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("AppErrorBoundary caught render error:", error, info);
    track("ui_crash_boundary_caught", {
      message: error?.message ?? "unknown_error",
      stack: error?.stack ? "present" : "missing",
      component_stack: info?.componentStack ? "present" : "missing",
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-400">
            We hit an unexpected app error. Reload to recover.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-3 font-semibold"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
