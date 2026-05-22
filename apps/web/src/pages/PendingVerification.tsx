import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, CheckCircle, LogOut, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

export function PendingVerification() {
  const navigate = useNavigate();
  const { isAuthenticated, isProvider, kycStatus, logout } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Must be authenticated + provider with pending kyc status
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isProvider) {
      navigate('/', { replace: true });
      return;
    }
    if (kycStatus === 'verified') {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [isAuthenticated, isProvider, kycStatus, navigate]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      // Re-hydrate auth from localStorage on each check
      const raw = localStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.kycStatus === 'verified') {
          // Admin approved! redirect to dashboard
          window.location.href = '/dashboard';
          return;
        }
      }
      // No-op — still pending
    } catch {
      // If any error, stay on page
    } finally {
      setChecking(false);
      setLastCheck(new Date());
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        {/* Status icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Demande en attente de validation
        </h1>
        
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Votre inscription de professionnel de santé a été soumise à l'équipe SantéProche. 
          Un administrateur examinera votre dossier et vous enverra un SMS une fois validé.
        </p>

        {/* Steps */}
        <div className="mt-8 space-y-3 text-left">
          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-slate-100">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Inscription envoyée</p>
              <p className="text-xs text-slate-500">Votre profil est complet</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-slate-100">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Revue en cours</p>
              <p className="text-xs text-slate-500">L'administrateur examine votre dossier</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-slate-100 opacity-60">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <ShieldAlert className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Accès dashboard</p>
              <p className="text-xs text-slate-400">Vous pourrez utiliser full-feature</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Vérification…' : 'Vérifier mon statut'}
          </button>

          {lastCheck && (
            <p className="text-xs text-slate-400">
              Dernière vérification : {lastCheck.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>

        {/* Reassurance */}
        <p className="mt-6 text-xs text-slate-400">
          Cela peut prendre jusqu'à 24 h ouvrables. En cas de refus, vous recevrez un SMS avec la raison.
        </p>
      </div>
    </div>
  );
}
