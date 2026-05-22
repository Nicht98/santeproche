import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { Card, ErrorBanner } from '../components/ui';
import { api } from '../lib/api';

interface ProviderRegisterBody {
  displayName: string;
  kind: 'doctor' | 'pharmacist';
  jobTitle: string;
  licenseNumber: string;
}

export function ProviderRegister() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const completeProfile = useAuthStore((s) => s.completeProfile);

  const [step, setStep] = useState<'doc' | 'form' | 'done'>('doc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ProviderRegisterBody>({
    displayName: '',
    kind: 'doctor',
    jobTitle: '',
    licenseNumber: '',
  });

  // Unauthenticated users must log in first
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm text-center">
          <p className="text-sm text-gray-700">Connectez-vous d'abord pour inscrire un compte professionnel.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Connexion
          </button>
        </Card>
      </div>
    );
  }

  const change = (field: keyof ProviderRegisterBody) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api<Record<string, unknown>>('/providers/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      completeProfile();
      setStep('done');
    } catch (err: any) {
      setError(err?.data?.message ?? 'Erreur lors de l\'inscription. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'doc') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <div className="text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
            <h1 className="mt-3 text-lg font-bold text-gray-900">Validation requise</h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Les professionnels de santé doivent être vérifiés avant de pouvoir recevoir des patients.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Attendez-vous à recevoir un SMS une fois votre compte validé.
            </p>
            <button
              onClick={() => setStep('form')}
              className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Continuer
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
          <h1 className="mt-3 text-lg font-bold text-gray-900">Inscription réussie</h1>
          <p className="mt-2 text-sm text-gray-600">
            Votre demande est en cours de vérification.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Vous recevrez un SMS lorsque votre compte sera activé.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Aller à la connexion
          </button>
        </Card>
      </div>
    );
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-bold text-gray-900">Inscription professionnel santé</h1>
        <p className="mt-1 text-xs text-gray-500">Remplissez vos informations pour validation.</p>

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Nom complet</span>
            <input
              value={form.displayName}
              onChange={change('displayName')}
              placeholder="Dr. Awa Mbarga"
              required
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select className={inputCls} value={form.kind} onChange={change('kind')} required>
              <option value="doctor">Médecin</option>
              <option value="pharmacist">Pharmacien(ne)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Fonction / Spécialité</span>
            <input
              value={form.jobTitle}
              onChange={change('jobTitle')}
              placeholder="Médecin généraliste"
              required
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Numéro de licence</span>
            <input
              value={form.licenseNumber}
              onChange={change('licenseNumber')}
              placeholder="CM-12345"
              required
              className={inputCls}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Envoi…' : 'Soumettre pour validation'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Déjà un compte ?{' '}
            <a onClick={() => navigate('/login')} className="cursor-pointer text-brand-600 underline">
              Connectez-vous
            </a>
          </p>
        </form>
      </Card>
    </div>
  );
}
