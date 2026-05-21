import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Phone, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { Card } from '../components/ui';

export function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest, logout } = useAuthStore();

  if (isGuest) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-sm space-y-4">
          <Card className="text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">Vous naviguez en mode invité</h2>
            <p className="mt-1 text-sm text-gray-500">
              Connectez-vous pour prendre rendez-vous, consulter votre historique et accéder au chat.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Se connecter / Créer un compte
            </button>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-sm space-y-4">
          <Card className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Non connecté</h2>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Se connecter
            </button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-sm space-y-4">
        {/* Profile header */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <span className="text-xl font-bold">{(user.displayName ?? user.phone).slice(0, 1).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.displayName ?? 'Utilisateur'}</h2>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="h-3 w-3" />
                {user.phone}
              </div>
              <span className="mt-0.5 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] capitalize text-gray-600">
                {user.role}
              </span>
            </div>
          </div>
        </Card>

        {/* Actions list */}
        <Card className="space-y-1">
          <button
            onClick={() => navigate('/appointments')}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Mes rendez-vous</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Conversations</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </Card>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
