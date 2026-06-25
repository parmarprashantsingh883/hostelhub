import { Toaster as HotToaster } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Quarters toaster — themed wrapper over react-hot-toast.
 *  • Dark-mode aware: the card surface flips via CSS vars (--toast-*), the
 *    status icons via Tailwind dark: variants. No JS theme watching needed.
 *  • Soft elevated card matching the app's Card + shadow-pop language.
 *  • Muted lucide status icons in tinted chips (same vocabulary as StatCards).
 */
const chip =
  'grid h-7 w-7 shrink-0 place-items-center rounded-lg';

export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={10}
      containerStyle={{ top: 72, right: 20 }}
      toastOptions={{
        duration: 3200,
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--toast-fg)',
          border: '1px solid var(--toast-border)',
          boxShadow: 'var(--toast-shadow)',
          borderRadius: '14px',
          padding: '10px 14px',
          fontSize: '13.5px',
          fontWeight: 500,
          lineHeight: '1.35',
          maxWidth: '380px',
          gap: '10px',
        },
        success: {
          duration: 2800,
          icon: (
            <span className={`${chip} bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400`}>
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
            </span>
          ),
        },
        error: {
          duration: 5000,
          icon: (
            <span className={`${chip} bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400`}>
              <AlertCircle className="h-4 w-4" strokeWidth={2.4} />
            </span>
          ),
        },
        loading: {
          icon: (
            <span className={`${chip} bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400`}>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
            </span>
          ),
        },
      }}
    />
  );
}
