import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle, MapPin, FileText, Briefcase, Building2, AlertCircle } from 'lucide-react';
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

type FieldError = Record<string, string>;

const FIELD_LABELS: Record<string, string> = {
  displayName: 'Nom complet',
  kind: 'Type',
  jobTitle: 'Fonction / Spécialité',
  licenseNumber: 'Numéro de licence',
  resume: 'CV / Résumé',
  experience: 'Expérience',
  workplaceName: "Établissement de travail",
  workplaceAddress: "Adresse de l'établissement",
  workplaceLat: 'Latitude',
  workplaceLng: 'Longitude',
};

function parseApiError(err: any): { summary: string; fieldErrors: FieldError } {
  if (!err) return { summary: "Une erreur est survenue.", fieldErrors: {} };

  // If error comes from Zod details array
  if (err?.data?.details && Array.isArray(err.data.details)) {
    const fieldErrors: FieldError = {};
    for (const item of err.data.details) {
      const match = item.match(/^(.+?)\s*:\s*(.+)$/);
      if (match) {
        const label = match[1].trim();
        const message = match[2].trim();
        // Find field key by label
        const key = Object.keys(FIELD_LABELS).find((k) => FIELD_LABELS[k] === label) || label;
        fieldErrors[key] = message;
      }
    }
    return { summary: err.data.message || 'Veuillez corriger les erreurs ci-dessous.', fieldErrors };
  }

  // If error has a message directly
  if (err?.data?.message) {
    return { summary: err.data.message, fieldErrors: {} };
  }

  // If error is a string
  if (typeof err === 'string') {
    return { summary: err, fieldErrors: {} };
  }

  return { summary: "Une erreur est survenue. Réessayez.", fieldErrors: {} };
}

export function ProviderRegister() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const completeProfile = useAuthStore((s) => s.completeProfile);

  const [step, setStep] = useState<'doc' | 'form' | 'done'>('doc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
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
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 text-sm text-slate-700">Connectez-vous d'abord pour inscrire un compte professionnel.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 active:scale-[0.98]"
          >
            Connexion
          </button>
        </Card>
      </div>
    );
  }

  const change = (field: keyof ProviderRegisterBody) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      // clear field error when user types
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };

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
    setFieldErrors({});
    try {
      await api<Record<string, unknown>>('/providers/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      completeProfile();
      setStep('done');
    } catch (err: any) {
      const { summary, fieldErrors: fe } = parseApiError(err);
      setError(summary);
      setFieldErrors(fe);
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
              className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
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
            className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
          >
            Aller à la connexion
          </button>
        </Card>
      </div>
    );
  }

  const inputCls =
    'mt-1 w-full rounded-xl border-2 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-4 focus:ring-brand-100';
  const labelCls = 'text-sm font-semibold text-slate-700';

  function fieldWrapper(
    label: string,
    fieldKey: string,
    children: React.ReactNode,
    icon?: React.ReactNode
  ) {
    const errorMsg = fieldErrors[fieldKey];
    return (
      <label className="block">
        <span className={`${labelCls} flex items-center gap-1.5 ${errorMsg ? 'text-red-600' : ''}`}>
          {icon}
          {label}
        </span>
        <div className={errorMsg ? 'mt-1' : 'mt-0.5'}>{children}</div>
        {errorMsg && (
          <div className="mt-1 flex items-start gap-1 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </label>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-6 pb-24">
      <div className="mx-auto max-w-sm">
        <h1 className="text-lg font-extrabold text-slate-900">Inscription professionnel</h1>
        <p className="mt-1 text-xs text-slate-500">Remplissez vos informations pour validation.</p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {/* Field-level error count summary */}
        {Object.keys(fieldErrors).length > 0 && !error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {Object.keys(fieldErrors).length === 1 ? (
              <>'1 champ à corriger. Voir ci-dessous.'</>
            ) : (
              <>{Object.keys(fieldErrors).length} champs à corriger. Voir ci-dessous.</>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Identity */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Identité</h2>

            {fieldWrapper(
              'Nom complet',
              'displayName',
              <input
                value={form.displayName}
                onChange={change('displayName')}
                placeholder="Dr. Awa Mbarga"
                required
                className={`${inputCls} ${fieldErrors.displayName ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
              />
            )}

            {fieldWrapper(
              'Type',
              'kind',
              <select
                className={`${inputCls} ${fieldErrors.kind ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
                value={form.kind}
                onChange={change('kind')}
                required
              >
                <option value="doctor">Médecin</option>
                <option value="pharmacist">Pharmacien(ne)</option>
              </select>
            )}

            {fieldWrapper(
              'Fonction / Spécialité',
              'jobTitle',
              <input
                value={form.jobTitle}
                onChange={change('jobTitle')}
                placeholder="Médecin généraliste, Cardiologue…"
                required
                className={`${inputCls} ${fieldErrors.jobTitle ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
              />
            )}

            {fieldWrapper(
              'Numéro de licence',
              'licenseNumber',
              <input
                value={form.licenseNumber}
                onChange={change('licenseNumber')}
                placeholder="CM-12345"
                required
                className={`${inputCls} ${fieldErrors.licenseNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
              />
            )}
          </div>

          {/* Professional info */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Profil professionnel</h2>

            {fieldWrapper(
              'CV / Résumé',
              'resume',
              <textarea
                value={form.resume}
                onChange={change('resume')}
                placeholder="Diplômes, formations, certifications… (min. 50 caractères)"
                rows={4}
                className={`${inputCls} resize-none ${fieldErrors.resume ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
              />,
              <FileText className="h-3.5 w-3.5 text-slate-400" />
            )}

            {fieldWrapper(
              'Expérience',
              'experience',
              <textarea
                value={form.experience}
                onChange={change('experience')}
                placeholder="Années d'expérience, domaines d'expertise, précédents établissements… (min. 20 caractères)"
                rows={4}
                className={`${inputCls} resize-none ${fieldErrors.experience ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
              />,
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>

          {/* Workplace */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Lieu de travail</h2>

            {fieldWrapper(
              "Établissement",
              'workplaceName',
              <input
                value={form.workplaceName}
                onChange={change('workplaceName')}
                placeholder="Clinique du Soleil, Hôpital Général…"
                className={`${inputCls} ${fieldErrors.workplaceName ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
              />,
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
            )}

            {fieldWrapper(
              "Adresse",
              'workplaceAddress',
              <input
                value={form.workplaceAddress}
                onChange={change('workplaceAddress')}
                placeholder="Rue, ville, quartier…"
                className={`${inputCls} ${fieldErrors.workplaceAddress ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
              />,
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
            )}

            <div className="flex gap-2">
              {fieldWrapper(
                'Latitude',
                'workplaceLat',
                <input
                  value={form.workplaceLat || ''}
                  onChange={change('workplaceLat')}
                  placeholder="4.0511"
                  className={`${inputCls} ${fieldErrors.workplaceLat ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
                />
              )}
              {fieldWrapper(
                'Longitude',
                'workplaceLng',
                <input
                  value={form.workplaceLng || ''}
                  onChange={change('workplaceLng')}
                  placeholder="9.7679"
                  className={`${inputCls} ${fieldErrors.workplaceLng ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand-400'}`}
                />
              )}
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
