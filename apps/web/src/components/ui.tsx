import { Loader2 } from 'lucide-react';
import { formatError } from '../lib/errors';

export function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 shadow-card">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
        <p className="text-sm font-medium text-slate-500">Chargement en cours…</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }: { icon: typeof Loader2; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        {Icon && <Icon className="h-8 w-8 text-slate-400" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-1.5 max-w-[240px] text-sm text-slate-500 leading-relaxed">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, error, onRetry }: { message?: string; error?: unknown; onRetry?: () => void }) {
  const display = message ?? formatError(error ?? null);
  return (
    <div className="animate-fade-in rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
      <div className="flex items-start gap-2">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <p className="font-semibold">{display}</p>
          {onRetry && (
            <button
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 underline underline-offset-2 transition-colors hover:text-red-800"
              onClick={onRetry}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7" />
              </svg>
              Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`card-surface p-4 ${onClick ? 'cursor-pointer active:scale-[0.99] hover:bg-slate-50' : ''} ${className}`}>
      {children}
    </div>
  );
}
