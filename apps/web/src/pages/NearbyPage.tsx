import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Pill, Stethoscope, Building2, FlaskConical, HeartPulse,
  Loader2, Phone, ArrowRight, Crosshair, Navigation, AlertCircle,
} from 'lucide-react';
import { useFacilities } from '../hooks/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLocationStore } from '../stores/location';
import { Card, EmptyState } from '../components/ui';
import { formatError } from '../lib/errors';

type Kind = 'all' | 'pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'health_center';

const kindConfig: Record<Kind, { label: string; icon: typeof Pill; color: string }> = {
  all:           { label: 'Tout',          icon: HeartPulse,  color: 'text-brand-600' },
  pharmacy:      { label: 'Pharmacies',    icon: Pill,        color: 'text-emerald-600' },
  hospital:      { label: 'Hôpitaux',      icon: Stethoscope, color: 'text-rose-600' },
  clinic:        { label: 'Cliniques',     icon: Building2,   color: 'text-blue-600' },
  laboratory:    { label: 'Laboratoires',  icon: FlaskConical,color: 'text-violet-600' },
  health_center: { label: 'Centres',       icon: HeartPulse,  color: 'text-amber-600' },
};

export function NearbyPage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind>('all');
  const [radiusKm, setRadiusKm] = useState(5);
  const geo = useGeolocation();
  const store = useLocationStore();

  // Sync geolocation into store so other pages benefit — guard against identical values
  useEffect(() => {
    if (geo.position) {
      const EPS = 1e-6;
      if (
        Math.abs((geo.position.lat ?? 0) - (store.lat ?? 0)) > EPS ||
        Math.abs((geo.position.lng ?? 0) - (store.lng ?? 0)) > EPS
      ) {
        store.setLocation(geo.position.lat, geo.position.lng);
      }
    }
  }, [geo.position, store.lat, store.lng]);

  const lat = geo.position?.lat ?? store.lat ?? null;
  const lng = geo.position?.lng ?? store.lng ?? null;
  const hasCoords = lat != null && lng != null;

  const params = useMemo(() => {
    if (!hasCoords) return undefined;
    return {
      lat,
      lng,
      radiusKm,
      limit: 20,
      ...(kind !== 'all' ? { type: kind } : {}),
    };
  }, [hasCoords, lat, lng, radiusKm, kind]);

  const { data, isLoading, error } = useFacilities(params);
  const list = data?.data ?? [];

  const header = (
    <div className="space-y-2 px-4 pt-4">
      <div className="flex items-center gap-2">
        <Navigation className="h-5 w-5 text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">À proximité</h1>
      </div>
      <p className="text-xs text-gray-500">
        {hasCoords
          ? `${list.length} résultat(s) dans un rayon de ${radiusKm} km`
          : 'Activez votre position pour découvrir les établissements les plus proches.'}
      </p>
    </div>
  );

  // Loading
  if (geo.loading || isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm">Localisation en cours…</p>
        </div>
      </div>
    );
  }

  // Denied permission
  if (!hasCoords && (geo.permission === 'denied' || geo.error)) {
    return (
      <div className="space-y-4">
        {header}
        <div className="mx-4 rounded-xl bg-amber-50 p-4 text-center">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">Géolocalisation refusée</p>
          <p className="mt-1 text-xs text-amber-700">
            Activez la localisation dans vos paramètres ou utilisez la recherche manuelle.
          </p>
          <button
            onClick={() => navigate('/facilities')}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Rechercher manuellement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {header}

      {/* Radius picker */}
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
          {[2, 5, 10, 20].map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
                radiusKm === r ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Kind filter */}
      <div className="flex gap-2 overflow-x-auto px-4">
        {(Object.keys(kindConfig) as Kind[]).map((k) => {
          const { label, icon: Icon } = kindConfig[k];
          const active = kind === k;
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">
          {formatError(error)}
        </div>
      )}

      {/* Results */}
      <div className="space-y-2 px-4">
        {list.filter(Boolean)?.map((f) => {
          const cfg = kindConfig[((f?.kind ?? "all") as Kind) ?? 'all'] ?? kindConfig.all;
          const Icon = cfg.icon;
          return (
            <Card key={f.id} className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-lg bg-gray-50 p-2 ${cfg.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{f.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{f.address ?? f.city ?? 'Adresse inconnue'}</span>
                </div>
                {f.phone && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="h-3 w-3 shrink-0" />
                    <a href={`tel:${f.phone}`} className="text-brand-600 hover:underline">{f.phone}</a>
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  {f.distanceKm != null && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                      <Crosshair className="h-3 w-3" />
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
                  {f.is24h && (
                    <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      24h/24
                    </span>
                  )}
                  {f.hasEmergency && (
                    <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      Urgence
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/facility/${f.id}`)}
                className="self-center shrink-0 rounded-full p-2 text-brand-600 hover:bg-brand-50"
                title="Voir détails"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          );
        })}

        {!list.length && !isLoading && (
          <EmptyState
            icon={MapPin}
            title="Aucun établissement trouvé"
            subtitle={`Essayez d'augmenter le rayon ou changer de catégorie.`}
          />
        )}
      </div>
    </div>
  );
}
