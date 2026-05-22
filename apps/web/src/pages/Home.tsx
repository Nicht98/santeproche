import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Pill, Stethoscope, CalendarCheck, ArrowRight, ShieldAlert, Navigation } from 'lucide-react';
import { useFacilities, useProviders } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { useLocationStore } from '../stores/location';
import { Card, LoadingScreen } from '../components/ui';
import { LocationBanner } from '../components/LocationBanner';

export function Home() {
  const navigate = useNavigate();
  const isGuest = useAuthStore((s) => s.isGuest);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isProvider = useAuthStore((s) => s.isProvider);
  const [q, setQ] = useState('');
  const { lat, lng } = useLocationStore();

  // Redirect providers to dashboard
  useEffect(() => {
    if (isAuthenticated && isProvider) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isProvider, navigate]);

  const { data: nearbyFacilities, isLoading: facLoading } = useFacilities({
    limit: 5,
    ...(lat && lng ? { lat, lng, radiusKm: 5 } : {}),
  });
  const { data: nearbyProviders, isLoading: provLoading } = useProviders({
    limit: 4,
    ...(lat && lng ? { lat, lng, radiusKm: 5 } : {}),
  });

  if (facLoading || provLoading) return <LoadingScreen />;

  const icons: Record<string, any> = {
    pharmacy: Pill,
    hospital: Stethoscope,
    clinic: Stethoscope,
  };

  return (
    <div className="space-y-5">
      {/* Header + Search */}
      <div className="bg-brand-600 px-4 pb-6 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">SantéProche</h1>
            <p className="text-sm text-brand-100">Trouvez des soins près de chez vous</p>
          </div>
          {isGuest && (
            <button
              onClick={() => navigate('/profile')}
              className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            >
              <ShieldAlert className="h-5 w-5" />
            </button>
          )}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`); }}
          className="mt-3 flex rounded-xl bg-white p-1 shadow-sm"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un médecin, pharmacie…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-400"
          />
          <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-white">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      <LocationBanner />

      {/* Guest banner */}
      {isGuest && (
        <div className="px-4">
          <Card className="flex items-center gap-3 bg-amber-50">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-xs text-amber-800">
                Vous naviguez en mode invité. Pour prendre rendez-vous ou accéder au chat,
                <span className="font-semibold"> connectez-vous</span>.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Connexion
            </button>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 px-4">
        <button onClick={() => navigate('/providers')} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <Stethoscope className="h-6 w-6 text-brand-600" />
          <span className="text-xs font-medium text-gray-700">Médecins</span>
        </button>
        <button onClick={() => navigate('/nearby')} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <Navigation className="h-6 w-6 text-brand-600" />
          <span className="text-xs font-medium text-gray-700">À proximité</span>
        </button>
        <button onClick={() => navigate('/facilities')} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <MapPin className="h-6 w-6 text-brand-600" />
          <span className="text-xs font-medium text-gray-700">Pharmacies</span>
        </button>
        <button onClick={() => navigate(isAuthenticated ? '/appointments' : '/login')} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <CalendarCheck className="h-6 w-6 text-brand-600" />
          <span className="text-xs font-medium text-gray-700">Rendez-vous</span>
        </button>
      </div>

      {/* Nearby facilities */}
      <section className="px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {lat && lng ? 'Pharmacies à proximité' : 'Pharmacies'}
          </h2>
          <button onClick={() => navigate('/facilities')} className="text-xs text-brand-600">Voir tout</button>
        </div>
        <div className="space-y-2">
          {nearbyFacilities?.data?.slice(0, 5).map((f) => (
            <Card key={f.id} className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-brand-50 p-2">
                {(() => {
                  const Icon = (icons[f.kind] || Pill) as React.ComponentType<{ className?: string }>;
                  return <Icon className="h-5 w-5 text-brand-600" />;
                })()}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{f.name}</h3>
                <p className="text-xs text-gray-500">{f.city ?? f.address ?? 'Adresse non précisée'}</p>
                {f.distanceKm != null && (
                  <span className="mt-0.5 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                    {Math.round(f.distanceKm * 10) / 10} km
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate(`/facility/${f.id}`)}
                className="self-center rounded-full p-1.5 text-brand-600 hover:bg-brand-50"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          ))}
          {(!nearbyFacilities?.data?.length) && <p className="text-center text-xs text-gray-400">Aucune pharmacie trouvée.</p>}
        </div>
      </section>

      {/* Providers */}
      <section className="px-4 pb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {lat && lng ? 'Professionnels à proximité' : 'Professionnels de santé'}
          </h2>
          <button onClick={() => navigate('/providers')} className="text-xs text-brand-600">Voir tout</button>
        </div>
        <div className="space-y-2">
          {nearbyProviders?.data?.slice(0, 4).map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <span className="text-sm font-bold">{(p.displayName ?? p.role ?? '').slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{p.displayName || 'Sans nom'}</h3>
                <p className="text-xs text-gray-500">{p.specialty ? `${p.specialty} · `: ''}{p.role}</p>
                {p.facilityName && <p className="text-[10px] text-gray-400">{p.facilityName}</p>}
              </div>
              <button
                onClick={() => navigate(`/provider/${p.id}`)}
                className="self-center rounded-full p-1.5 text-brand-600 hover:bg-brand-50"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          ))}
          {(!nearbyProviders?.data?.length) && <p className="text-center text-xs text-gray-400">Aucun professionnel trouvé.</p>}
        </div>
      </section>
    </div>
  );
}
