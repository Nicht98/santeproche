import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, XCircle, CheckCircle2, Loader } from 'lucide-react';
import { Card } from '../components/ui';

interface PendingProvider {
  id: string;
  displayName: string;
  phone: string;
  role: string;
  status: string;
  jobTitle: string | null;
  licenseNumber: string | null;
  kycStatus: string;
  kycSubmittedAt: string | null;
}

function usePendingProviders(secret: string) {
  return useQuery({
    queryKey: ['admin', 'providers', 'pending', secret],
    queryFn: async () => {
      if (!secret) return { data: [] };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/providers/pending`, {
        headers: { 'x-admin-secret': secret },
      });
      if (!res.ok) throw new Error('Auth error');
      return res.json();
    },
    enabled: !!secret,
  });
}

function useValidateProvider(secret: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verdict, reason }: { id: string; verdict: string; reason?: string }) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/providers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ verdict, reason }),
      });
      if (!res.ok) throw new Error('Validation error');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'providers', 'pending'] });
    },
  });
}

export function AdminPanel() {
  const [secret, setSecret] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { data, isLoading, isError } = usePendingProviders(secret);
  const validate = useValidateProvider(secret);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const handleValidate = (id: string) => {
    validate.mutate({ id, verdict: 'verified' });
  };

  const handleReject = (id: string) => {
    validate.mutate({ id, verdict: 'rejected', reason });
    setRejectId(null);
    setReason('');
  };

  if (!submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <div className="text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-brand-600" />
            <h1 className="mt-3 text-lg font-bold text-gray-900">Espace admin</h1>
            <p className="mt-1 text-sm text-gray-500">Entrez la clé admin pour continuer.</p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
            className="mt-4 space-y-3"
          >
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Clé admin"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Accéder
            </button>
          </form>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Card>
          <p className="text-sm text-red-600">Clé admin invalide ou erreur réseau.</p>
          <button onClick={() => setSubmitted(false)} className="mt-2 text-sm text-brand-600 underline">Reessayer</button>
        </Card>
      </div>
    );
  }

  const providers: PendingProvider[] = data?.data || [];

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Demandes en attente</h1>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">{providers.length} en attente</span>
      </div>

      {isLoading && <Loader className="mx-auto h-6 w-6 animate-spin text-brand-600" />}

      {providers.length === 0 && !isLoading && (
        <p className="text-center text-sm text-gray-500">Aucune demande en attente.</p>
      )}

      {providers.map((p) => (
        <Card key={p.id} className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{p.displayName || 'Sans nom'}</p>
              <p className="text-xs text-gray-500">{p.phone} · {p.role} · {p.jobTitle || '—'}</p>
              <p className="text-xs text-gray-400">Licence: {p.licenseNumber || '—'}</p>
            </div>
            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{p.kycStatus}</span>
          </div>

          {rejectId === p.id ? (
            <div className="space-y-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motif du refus"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(p.id)}
                  disabled={validate.isPending}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Confirmer le refus
                </button>
                <button
                  onClick={() => { setRejectId(null); setReason(''); }}
                  className="rounded-lg border px-3 py-1.5 text-xs text-gray-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleValidate(p.id)}
                disabled={validate.isPending}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Valider
              </button>
              <button
                onClick={() => setRejectId(p.id)}
                className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
              >
                <XCircle className="h-3.5 w-3.5" /> Refuser
              </button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
