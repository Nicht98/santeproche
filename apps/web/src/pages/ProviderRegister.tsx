import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { Card, ErrorBanner } from '../components/ui';
import { api } from '../lib/api';

interface ProviderRegisterBody {
  phone: string;
  displayName: string;
  kind: 'doctor' | 'pharmacist';
  jobTitle: string;
  licenseNumber: string;
}

export function ProviderRegister() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isPatient = useAuthStore((s) => s.isPatient);

  const [step, setStep] = useState<'form' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ProviderRegisterBody>({
    phone: '+237',
    displayName: '',
    kind: 'doctor',
    jobTitle: '',
    licenseNumber: '',
  });

  // If already a provider with complete profile, redirect to dashboard
  // If already a patient with complete profile, let them continue (creating a new provider account)
  if (isAuthenticated && isPatient) {
    return (
      <div className="p-4">
        <Card>
          <h1 className="text-lg font-bold text-gray-900">Inscription professionnel santé</h1>
          <p className="mt-2 text-sm text-gray-600">
            Votre compte patient existe déjà. Créez un compte séparé pour exercer en tant que professionnel de santé.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Connectez-vous avec un autre numéro
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
      await api<{ userId: string; status: string }>('/providers/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.data?.message ?? 'Erreur lors de l\'inscription. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm text-center">
          <h1 className="text-lg font-bold text-gray-900">Inscription réussie</h1>
          <p className="mt-2 text-sm text-gray-600">
            Votre compte professionnel est créé avec le statut « en attente de vérification ».
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Connectez-vous avec votre numéro de téléphone pour accéder au tableau de bord.
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
        <p className="mt-1 text-xs text-gray-500">Créez un compte pour recevoir des rendez-vous.</p>

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Numéro de téléphone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={change('phone')}
              pattern="^\+237[0-9]{9}$"
              placeholder="+2376XXXXXXXX"
              required
              className={inputCls}
            />
          </label>

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
            <span className="text-sm font-medium text-gray-700">Type de professionnel</span>
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
            {loading ? 'Création…' : 'Créer le compte'}
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
