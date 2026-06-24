import { Component } from 'react';

/**
 * App-level error boundary. Catches render/runtime errors anywhere in the tree
 * so a single page bug shows a recoverable fallback instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hook for an error-reporting service (Sentry, etc.) in production.
    if (import.meta.env.DEV) console.error('Uncaught UI error:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Something went wrong</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            An unexpected error interrupted this page. Your data is safe — please head back and try again.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }
}
