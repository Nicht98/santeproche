import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle, MapPin, FileText, Briefcase, Building2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { Card, ErrorBanner } from '../components/ui';
import { api } from '../lib/api';

interface ProviderRegisterBody {
  displayName: string;
  kind: 'doctor' | 'pharmacist';
  jobTitle: string;
  licenseNumber: string;
  resume: string;
  experience: string;
  workplaceName: string;
  workplaceAddress: string;
  workplaceLat?: string;
  workplaceLng?: string;
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
    resume: '',
    experience: '',
    workplaceName: '',
    workplaceAddress: '',
    workplaceLat: '',
    workplaceLng: '',
  });

  // Unauthenticated users must log in first
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-sm text-center">
          <p className="text-sm text-slate-700">Connectez-vous d'abord pour inscrire un compte professionnel.</p>
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((f) => ({
            ...f,
            workplaceLat: String(pos.coords.latitude),
            workplaceLng: String(pos.coords.longitude),
          }));
        },
        () => {
          setError("Impossible d'obtenir la localisation. Veuillez la saisir manuellement.");
        }
      );
    } else {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
    }
  };

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
      setError(err?.data?.message ?? "Erreur lors de l'inscription. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'doc') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
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
    'mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100';
  const labelCls = 'text-sm font-semibold text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-6 pb-24">
      <div className="mx-auto max-w-sm">
        <h1 className="text-lg font-extrabold text-slate-900">Inscription professionnel</h1>
        <p className="mt-1 text-xs text-slate-500">Remplissez vos informations pour validation.</p>

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Identity */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Identité</h2>

            <label className="block">
              <span className={labelCls}>Nom complet</span>
              <input value={form.displayName} onChange={change('displayName')} placeholder="Dr. Awa Mbarga" required className={inputCls} />
            </label>

            <label className="block">
              <span className={labelCls}>Type</span>
              <select className={inputCls} value={form.kind} onChange={change('kind')} required>
                <option value="doctor">Médecin</option>
                <option value="pharmacist">Pharmacien(ne)</option>
              </select>
            </label>

            <label className="block">
              <span className={labelCls}>Fonction / Spécialité</span>
              <input value={form.jobTitle} onChange={change('jobTitle')} placeholder="Médecin généraliste, Cardiologue…" required className={inputCls} />
            </label>

            <label className="block">
              <span className={labelCls}>Numéro de licence</span>
              <input value={form.licenseNumber} onChange={change('licenseNumber')} placeholder="CM-12345" required className={inputCls} />
            </label>
          </div>

          {/* Professional info */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Profil professionnel</h2>

            <label className="block">
              <span className={`${labelCls} flex items-center gap-1.5`}><FileText className="h-3.5 w-3.5 text-slate-400" /> CV / Résumé</span>
              <textarea
                value={form.resume}
                onChange={change('resume')}
                placeholder="Diplômes, formations, certifications…"
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </label>

            <label className="block">
              <span className={`${labelCls} flex items-center gap-1.5`}><Briefcase className="h-3.5 w-3.5 text-slate-400" /> Expérience</span>
              <textarea
                value={form.experience}
                onChange={change('experience')}
                placeholder="Années d'expérience, domaines d'expertise, précédents établissements…"
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </label>
          </div>

          /* Workplace */
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Lieu de travail</h2>

            <label className="block">
              <span className={`${labelCls} flex items-center gap-1.5`}><Building2 className="h-3.5 w-3.5 text-slate-400" /> Établissement</span>
              <input value={form.workplaceName} onChange={change('workplaceName')} placeholder="Clinique du Soleil, Hôpital Général…" className={inputCls} />
            </label>

            <label className="block">
              <span className={`${labelCls} flex items-center gap-1.5`}><MapPin className="h-3.5 w-3.5 text-slate-400" /> Adresse</span>
              <input value={form.workplaceAddress} onChange={change('workplaceAddress')} placeholder="Rue, ville, quartier…" className={inputCls} />
            </label>

            <div className="flex gap-2">
              <label className="block flex-1">
                <span className={labelCls}>Latitude</span>
                <input value={form.workplaceLat} onChange={change('workplaceLat')} placeholder="4.0511" className={inputCls} />
              </label>
              <label className="block flex-1">
                <span className={labelCls}>Longitude</span>
                <input value={form.workplaceLng} onChange={change('workplaceLng')} placeholder="9.7679" className={inputCls} />
              </label>
            </div>

            <button
              type="button"
              onClick={handleGetLocation}
              className="flex items-center gap-2 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              <MapPin className="h-3.5 w-3.5" />
              Utiliser ma position actuelle
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Envoi…' : 'Soumettre pour validation'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Déjà un compte ?{' '}
            <a onClick={() => navigate('/login')} className="cursor-pointer text-brand-600 underline underline-offset-2">
              Connectez-vous
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
