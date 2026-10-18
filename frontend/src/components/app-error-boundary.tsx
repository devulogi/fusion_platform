import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Frontend render error', error, errorInfo);
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  private readonly reload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.error !== null) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f3f5f2] px-5 text-[#19251f]">
          <section
            className="w-full max-w-lg border border-[#d9dfd9] bg-white p-6 shadow-sm"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-xs font-semibold uppercase text-[#8a5b35]">Application error</p>
            <h1 className="mt-2 text-2xl font-semibold">This view could not be displayed</h1>
            <p className="mt-3 text-sm text-[#58665e]">
              Try rendering the view again. If the problem continues, reload the application.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-blue-500 active:scale-[0.98] active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={this.retry}
                type="button"
              >
                Try again
              </button>
              <button
                className="min-h-11 rounded-md border border-[#cdd5ce] px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out hover:bg-[#f3f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={this.reload}
                type="button"
              >
                Reload application
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
