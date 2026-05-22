import { Loader2 } from 'lucide-react';
import { formatError } from '../lib/errors';

export function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
        <p className="mt-2 text-sm text-gray-500">Chargement…</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof Loader2; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon className="mx-auto h-10 w-10 text-gray-300" />}
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

export function ErrorBanner({ message, error, onRetry }: { message?: string; error?: unknown; onRetry?: () => void }) {
  const display = message ?? formatError(error ?? null);
  return (
    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
      <p className="font-medium">Erreur</p>
      <p className="mt-1">{display}</p>
      {onRetry && (
        <button className="mt-2 text-sm font-medium text-red-700 underline" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}
