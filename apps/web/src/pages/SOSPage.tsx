import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Phone, MapPin, HeartPulse, ShieldAlert,
  ChevronRight, Crosshair, ArrowLeft, Clock, Activity,
  CheckCircle2, Loader2, Stethoscope, Navigation,
} from 'lucide-react';
import { useCreateSOS, usePatientProfile, useFacilities } from '../hooks/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLocationStore } from '../stores/location';
import { useAuthStore } from '../stores/auth';
import { Card, EmptyState, ErrorBanner } from '../components/ui';
import { formatError } from '../lib/errors';
import type { Facility } from '../lib/api';

/* ------------------------------------------------------------------ */
/* Emergency numbers (Cameroon)                                        */
/* ------------------------------------------------------------------ */
const EMERGENCY_NUMBERS = [
  { label: 'SAMU', number: '1515', color: 'bg-rose-600', icon: HeartPulse },
  { label: 'Police', number: '117', color: 'bg-blue-600', icon: ShieldAlert },
  { label: 'Pompiers', number: '118', color: 'bg-orange-600', icon: AlertTriangle },
];

/* ------------------------------------------------------------------ */
/* SOS Page                                                            */
/* ------------------------------------------------------------------ */
export function SOSPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);

  const geo = useGeolocation();
  const store = useLocationStore();

  // Sync geo into store
  useEffect(() => {
    if (geo.position) {
      store.setLocation(geo.position.lat, geo.position.lng);
    }
  }, [geo.position]);

  const lat = geo.position?.lat ?? store.lat ?? null;
  const lng = geo.position?.lng ?? store.lng ?? null;
  const hasCoords = lat != null && lng != null;

  const { data: profileData } = usePatientProfile();
  const profile = profileData?.profile;

  // Nearby emergency facilities (hasEmergency = true)
  const { data: emergencyFacilities, isLoading: efLoading } = useFacilities({
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radiusKm: 10,
    limit: 5,
  });

  const emergencyList = (emergencyFacilities?.data ?? []).filter(
    (f: Facility) => f.hasEmergency
  );

  // Trigger states
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'sending' | 'sent' | 'error'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createSOS = useCreateSOS();

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Start countdown
  const handleStart = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
    setErrorMsg(null);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearCountdown();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  // Auto-send when countdown hits 0
  useEffect(() => {
    if (phase === 'countdown' && countdown === 0) {
      setPhase('sending');
      createSOS
        .mutateAsync({
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          address: profile?.address ?? undefined,
          description: 'Urgence déclenchée depuis l\'application SOS',
          phone: profile?.emergencyContactPhone ?? undefined,
          bloodType: profile?.bloodType ?? undefined,
          allergies: profile?.allergies ?? undefined,
          emergencyContactName: profile?.emergencyContactName ?? undefined,
          emergencyContactPhone: profile?.emergencyContactPhone ?? undefined,
        })
        .then(() => {
          setPhase('sent');
          setSentAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        })
        .catch((err) => {
          setPhase('error');
          setErrorMsg(formatError(err));
        });
    }
  }, [phase, countdown, createSOS, lat, lng, profile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  const handleCancel = () => {
    clearCountdown();
    setPhase('idle');
    setCountdown(3);
  };

  const handleRetry = () => {
    setPhase('idle');
    setErrorMsg(null);
  };

  // Build a reverse-geocoded-ish address display
  const locationLabel = (() => {
    if (!hasCoords) return 'Localisation non disponible';
    return `${lat?.toFixed(4)}°, ${lng?.toFixed(4)}°`;
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 px-5 pb-6 pt-5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
          <div className="absolute -left-6 bottom-6 h-24 w-24 rounded-full bg-white" />
        </div>
        <div className="relative flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">SOS Urgence</h1>
            <p className="text-xs text-red-100">Assistance médicale d\'urgence</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 pt-5 pb-24">
        {/* Location pill */}
        <div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-card">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${hasCoords ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <MapPin className={`h-4 w-4 ${hasCoords ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-700">{hasCoords ? 'Position détectée' : 'Position indisponible'}</p>
            <p className="text-[11px] text-slate-500 truncate">{locationLabel}</p>
          </div>
          {!hasCoords && (
            <button onClick={() => geo.refresh()} className="shrink-0 rounded-lg bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-brand-100">
              Actualiser
            </button>
          )}
        </div>

        {/* Main trigger button */}
        {phase === 'idle' && (
          <div className="animate-slide-up space-y-4">
            <button
              onClick={handleStart}
              className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 p-1 shadow-glow-brand transition-all duration-300 active:scale-[0.98]"
            >
              <div className="rounded-[20px] bg-white/5 p-8 backdrop-blur-sm">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 shadow-inner-light transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                  <HeartPulse className="h-12 w-12 text-white animate-pulse-soft" />
                </div>
                <p className="mt-4 text-center text-lg font-extrabold text-white">
                  APPUYEZ POUR ALERTER
                </p>
                <p className="mt-1 text-center text-xs text-red-100">
                  Un compte à rebours de 3 secondes vous laisse le temps d\'annuler
                </p>
              </div>
              {/* Pulsing ring */}
              <span className="absolute inset-0 rounded-3xl ring-2 ring-white/20 animate-ping opacity-30" />
            </button>

            {/* Quick dial grid */}
            <div className="grid grid-cols-3 gap-3">
              {EMERGENCY_NUMBERS.map((em) => (
                <a
                  key={em.number}
                  href={`tel:${em.number}`}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover active:scale-95"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${em.color}`}>
                    <em.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800">{em.label}</p>
                    <p className="text-[11px] font-mono font-semibold text-slate-500">{em.number}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Countdown */}
        {phase === 'countdown' && (
          <div className="animate-fade-in flex flex-col items-center py-8">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-700 shadow-glow-brand">
              <span className="text-6xl font-extrabold text-white">{countdown}</span>
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                <circle
                  cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (countdown / 3)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
            </div>
            <p className="mt-5 text-center text-sm font-semibold text-slate-700">
              Envoi de l\'alerte d\'urgence…
            </p>
            <button
              onClick={handleCancel}
              className="mt-4 rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200 active:scale-95"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Sending */}
        {phase === 'sending' && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-rose-600" />
            <p className="mt-4 text-sm font-semibold text-slate-700">Envoi de l\'alerte en cours…</p>
          </div>
        )}

        {/* Sent confirmation */}
        {phase === 'sent' && (
          <div className="animate-slide-up space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="mt-3 text-lg font-extrabold text-emerald-900">Alerte envoyée</h2>
              <p className="mt-1 text-xs text-emerald-700">
                Votre demande d\'urgence a été transmise aux services concernés à {sentAt}.
              </p>
              <p className="mt-2 text-[11px] text-emerald-600">
                Restez sur place si possible. Un professionnel de santé va vous contacter.
              </p>
            </div>

            <button
              onClick={() => { setPhase('idle'); setSentAt(null); }}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-700 shadow-card transition-all hover:bg-slate-50 active:scale-95"
            >
              Retour
            </button>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="space-y-3">
            <ErrorBanner message={errorMsg ?? 'Erreur lors de l\'envoi'} onRetry={handleRetry} />
            <button
              onClick={handleRetry}
              className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-card transition-all hover:bg-rose-700 active:scale-95"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Nearby emergency facilities */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">Établissements d\'urgence à proximité</h2>
            </div>
            <button
              onClick={() => navigate('/nearby')}
              className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Voir carte <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {efLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            )}

            {!efLoading && emergencyList.length === 0 && (
              <EmptyState
                icon={Navigation}
                title="Aucun établissement d\'urgence trouvé"
                subtitle="Essayez d\'augmenter le rayon de recherche dans l\'onglet À proximité."
                action={
                  <button
                    onClick={() => navigate('/facilities')}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    Tous les établissements
                  </button>
                }
              />
            )}

            {emergencyList.map((f: Facility) => (
              <Card
                key={f.id}
                className="group flex items-start gap-3"
                onClick={() => navigate(`/facility/${f.id}`)}
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                  <HeartPulse className="h-5 w-5 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 truncate transition-colors group-hover:text-brand-700">
                    {f.name}
                  </h3>
                  <p className="text-xs text-slate-500">{f.address ?? f.city ?? 'Adresse non précisée'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {f.distanceKm != null && (
                      <span className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        <Crosshair className="h-2.5 w-2.5" />
                        {Math.round(f.distanceKm * 10) / 10} km
                      </span>
                    )}
                    {f.phone && (
                      <a
                        href={`tel:${f.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 rounded-lg bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        <Phone className="h-2.5 w-2.5" />
                        {f.phone}
                      </a>
                    )}
                    {f.is24h && (
                      <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        24h/24
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Card>
            ))}
          </div>
        </section>

        {/* Medical info card (only if logged in) */}
        {(isAuthenticated || isGuest) && profile && (
          <section className="animate-slide-up">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Informations médicales</h2>
            <div className="rounded-2xl bg-white p-4 shadow-card space-y-2.5">
              {profile.bloodType && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                    <Activity className="h-4 w-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Groupe sanguin</p>
                    <p className="text-sm font-bold text-slate-800">{profile.bloodType}</p>
                  </div>
                </div>
              )}
              {profile.allergies && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Allergies</p>
                    <p className="text-sm font-medium text-slate-800">{profile.allergies}</p>
                  </div>
                </div>
              )}
              {profile.emergencyContactName && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <Phone className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500">Contact d\'urgence</p>
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {profile.emergencyContactName}
                      {profile.emergencyContactPhone && (
                        <a href={`tel:${profile.emergencyContactPhone}`} className="ml-1 text-brand-600 hover:underline">
                          ({profile.emergencyContactPhone})
                        </a>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {!profile.bloodType && !profile.allergies && !profile.emergencyContactName && (
                <div className="text-center py-2">
                  <p className="text-xs text-slate-400">Aucune information médicale enregistrée</p>
                  <button
                    onClick={() => navigate('/profile')}
                    className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Compléter mon profil →
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-[11px] leading-relaxed text-slate-500">
              En cas d\'urgence vitale, appelez directement le <a href="tel:1515" className="font-semibold text-rose-600">1515</a> (SAMU).
              SantéProche facilite la mise en relation mais ne remplace pas les services d\'urgence officiels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
