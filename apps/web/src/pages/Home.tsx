import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Stethoscope, CalendarCheck, ArrowRight, ShieldAlert, Navigation, Clock, ChevronRight } from 'lucide-react';
import { useFacilities, useProviders } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { useLocationStore } from '../stores/location';
import { Card, LoadingScreen, SkeletonGrid } from '../components/ui';
import { LocationBanner } from '../components/LocationBanner';

export function Home() {
  const navigate = useNavigate();
  const isGuest = useAuthStore((s) => s.isGuest);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isProvider = useAuthStore((s) => s.isProvider);
  const [q, setQ] = useState('');
  const { lat, lng } = useLocationStore();

  useEffect(() => {
    if (isAuthenticated && isProvider) navigate('/dashboard');
  }, [isAuthenticated, isProvider, navigate]);

  const { data: nearbyFacilities, isLoading: facLoading } = useFacilities({
    limit: 5,
    ...(lat && lng ? { lat, lng, radiusKm: 5 } : {}),
  });
  const { data: nearbyProviders, isLoading: provLoading } = useProviders({
    limit: 4,
    ...(lat && lng ? { lat, lng, radiusKm: 5 } : {}),
  });

  if (facLoading && provLoading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 px-5 pb-8 pt-5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white" />
          <div className="absolute -left-4 bottom-4 h-20 w-20 rounded-full bg-white" />
        </div>

        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">SantéProche</h1>
              <p className="mt-1 text-sm text-brand-100">Trouvez des soins près de chez vous</p>
            </div>
            {isGuest && (
              <button onClick={() => navigate('/profile')} className="rounded-xl bg-white/15 p-2 backdrop-blur-sm transition-colors hover:bg-white/25">
                <ShieldAlert className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`); }}
            className="mt-4 flex rounded-2xl bg-white/95 p-1.5 shadow-lg backdrop-blur-sm transition-shadow focus-within:shadow-brand-500/20"
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un médecin, pharmacie…" className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
            <button type="submit" className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700 active:scale-95">
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="px-4 space-y-5">
        <LocationBanner />

        {isGuest && (
          <div className="animate-slide-up rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-900 leading-relaxed">
                  Vous naviguez en mode invité. <span className="font-bold">Connectez-vous</span> pour prendre rendez-vous.
                </p>
              </div>
              <button onClick={() => navigate('/login')} className="shrink-0 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95">
                Connexion
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Stethoscope, label: 'Médecins', route: '/providers' },
            { icon: Navigation, label: "À proximité", route: '/nearby' },
            { icon: MapPin, label: 'Pharmacies', route: '/facilities' },
            { icon: CalendarCheck, label: 'RDV', route: isAuthenticated ? '/appointments' : '/login' },
          ].map((item) => (
            <button key={item.label} onClick={() => navigate(item.route)} className="group flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-95">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100">
                <item.icon className="h-5 w-5 text-brand-600" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">{lat && lng ? 'Pharmacies à proximité' : 'Pharmacies'}</h2>
            <button onClick={() => navigate('/facilities')} className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700">
              Voir tout <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {facLoading ? <SkeletonGrid count={3} /> : nearbyFacilities?.data?.filter(Boolean)?.slice(0, 5).map((f) => (
              <Card key={f.id} className="group flex items-start gap-3.5 !p-3.5" onClick={() => navigate(`/facility/${f.id}`)}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-emerald-50 text-xl">🏥</div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-brand-700">{f.name}</h3>
                  <p className="text-xs text-slate-500">{f.city ?? f.address ?? 'Adresse non précisée'}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {f.distanceKm != null && <span className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"><MapPin className="h-2.5 w-2.5" />{Math.round(f.distanceKm * 10) / 10} km</span>}
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><Clock className="h-2.5 w-2.5" />Ouvert</span>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Card>
            ))}
            {(!nearbyFacilities?.data?.length && !facLoading) && <p className="py-8 text-center text-xs text-slate-400">Aucune pharmacie trouvée</p>}
          </div>
        </section>

        <section className="pb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">{lat && lng ? 'Professionnels à proximité' : 'Professionnels de santé'}</h2>
            <button onClick={() => navigate('/providers')} className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700">
              Voir tout <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {provLoading ? <SkeletonGrid count={3} /> : nearbyProviders?.data?.filter(Boolean)?.slice(0, 4).map((p) => (
              <Card key={p.id} className="group flex items-center gap-3 !py-3.5" onClick={() => navigate(`/provider/${p.id}`)}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-emerald-100 text-sm font-bold text-brand-700">
                  {(p.displayName ?? p.role ?? '').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-brand-700">{p.displayName || 'Sans nom'}</h3>
                  <p className="text-xs text-slate-500">{p.specialty ? `${p.specialty} · ` : ''}{p.role}</p>
                  {p.facilityName && <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-slate-400"><MapPin className="h-2.5 w-2.5" />{p.facilityName}</span>}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Card>
            ))}
            {(!nearbyProviders?.data?.length && !provLoading) && <p className="py-8 text-center text-xs text-slate-400">Aucun professionnel trouvé</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
