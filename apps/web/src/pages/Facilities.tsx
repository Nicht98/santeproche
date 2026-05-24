import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Pill, Stethoscope, FlaskConical, HeartPulse, Baby, Smile, Glasses, Brain, Syringe, Search, ArrowRight, Crosshair, Loader2 } from 'lucide-react';
import { useFacilities } from '../hooks/api';
import { useLocationStore } from '../stores/location';
import { Card, EmptyState } from '../components/ui';
import { formatError } from '../lib/errors';
import { LocationBanner } from '../components/LocationBanner';

export function Facilities() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const { lat, lng } = useLocationStore();

  const kindTabs = [
    { key: '',         label: 'Tous' },
    { key: 'pharmacy', label: 'Pharmacies' },
    { key: 'hospital', label: 'Hôpitaux' },
    { key: 'clinic',   label: 'Cliniques' },
    { key: 'laboratory',      label: 'Labos' },
    { key: 'health_center',   label: 'Centres de santé' },
    { key: 'dispensary',      label: 'Dispensaires' },
    { key: 'maternity',       label: 'Maternités' },
    { key: 'dental',          label: 'Dentaires' },
    { key: 'optical',         label: 'Optiques' },
    { key: 'mental_health',   label: 'Mental / Psy' },
    { key: 'vaccination',     label: 'Vaccinations' },
  ];

  const useGeo = nearbyOnly && lat && lng;

  const { data, isLoading, error } = useFacilities({
    search: search || undefined,
    kind: kind || undefined,
    limit: 20,
    ...(useGeo ? { lat, lng, radiusKm: 10 } : {}),
  });

  if (isLoading && !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm">Chargement des établissements…</p>
      </div>
    );
  }

  const iconMap: Record<string, typeof Pill> = {
    pharmacy: Pill,
    hospital: Stethoscope,
    clinic: Stethoscope,
    laboratory: FlaskConical,
    health_center: HeartPulse,
    dispensary: MapPin,
    maternity: Baby,
    dental: Smile,
    optical: Glasses,
    mental_health: Brain,
    vaccination: Syringe,
    other: MapPin,
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">Établissements</h1>
      </div>

      <LocationBanner />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une pharmacie, clinique…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={() => setNearbyOnly((v) => !v)}
          className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${
            nearbyOnly
              ? 'bg-brand-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700'
          }`}
          title="Filtrer les établissements à proximité"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Proximité
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {kindTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setKind(t.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              (kind === t.key || (t.key === '' && !kind))
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{formatError(error)}</div>}

      {isLoading && data && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Recherche en cours…
        </div>
      )}

      <div className="space-y-2 pb-6">
        {data?.data?.filter(Boolean)?.map((f) => {
          const Icon = iconMap[f?.kind ?? ''] || MapPin;
          return (
            <Card key={f.id} className="flex items-start gap-3">
              <div className="rounded-lg bg-brand-50 p-2">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{f.name}</h3>
                <div className="mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500">{f.city ?? f.address ?? 'Adresse inconnue'}</p>
                </div>
                {f.phone && <p className="text-[10px] text-gray-400">📞 {f.phone}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {f.distanceKm != null && (
                    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {Math.round(f.distanceKm * 10) / 10} km
                    </span>
                  )}
                  {f.travelTimeWalkMinutes != null && f.travelTimeWalkMinutes <= 60 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700" title="À pied">
                      🚶 {f.travelTimeWalkMinutes} min
                    </span>
                  )}
                  {f.travelTimeDriveMinutes != null && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700" title="En voiture">
                      🚗 {f.travelTimeDriveMinutes} min
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/facility/${f.id}`)}
                className="self-center rounded-full p-2 text-brand-600 hover:bg-brand-50"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          );
        })}
        {!data?.data?.length && (
          <EmptyState icon={MapPin} title="Aucun établissement" subtitle="Essayez d'autres filtres ou activez la géolocalisation" />
        )}
      </div>
    </div>
  );
}
