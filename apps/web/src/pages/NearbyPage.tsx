import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Pill, Stethoscope, Building2, FlaskConical, HeartPulse,
  Baby, Smile, Glasses, Brain, Syringe, MapPin as MapPinIcon, Star,
  Loader2, Phone, ArrowRight, Crosshair, Navigation, AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { facilities } from '../lib/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLocationStore } from '../stores/location';
import { Card, EmptyState } from '../components/ui';
import { formatError } from '../lib/errors';
import type { Facility } from '../lib/api';

type Kind = 'all' | 'pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'health_center' | 'dispensary' | 'maternity' | 'dental' | 'optical' | 'mental_health' | 'vaccination' | 'other';

const kindConfig: Record<Kind, { label: string; icon: typeof Pill; color: string }> = {
  all:           { label: 'Tout',              icon: HeartPulse,    color: 'text-brand-600' },
  pharmacy:      { label: 'Pharmacies',        icon: Pill,          color: 'text-emerald-600' },
  hospital:      { label: 'Hôpitaux',          icon: Stethoscope,   color: 'text-rose-600' },
  clinic:        { label: 'Cliniques',         icon: Building2,     color: 'text-blue-600' },
  laboratory:    { label: 'Laboratoires',      icon: FlaskConical,  color: 'text-violet-600' },
  health_center: { label: 'Centres de santé',  icon: HeartPulse,    color: 'text-amber-600' },
  dispensary:    { label: 'Dispensaires',      icon: MapPinIcon,    color: 'text-orange-600' },
  maternity:     { label: 'Maternités',        icon: Baby,          color: 'text-pink-600' },
  dental:        { label: 'Dentaires',         icon: Smile,         color: 'text-cyan-600' },
  optical:       { label: 'Optiques',          icon: Glasses,       color: 'text-indigo-600' },
  mental_health: { label: 'Mental / Psy',      icon: Brain,         color: 'text-teal-600' },
  vaccination:   { label: 'Vaccinations',      icon: Syringe,       color: 'text-lime-600' },
  other:         { label: 'Autres',            icon: MapPinIcon,    color: 'text-gray-500' },
};

const PAGE_SIZE = 20;

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

  const getNextPageParam = useCallback((lastPage: { pagination: { limit: number; offset: number; count: number; total: number } }) => {
    const p = lastPage.pagination;
    const nextOffset = p.offset + p.count;
    return nextOffset < p.total ? nextOffset : undefined;
  }, []);

  const queryKeyBase = useMemo(() => {
    return [
      'facilities',
      'nearby',
      { lat, lng, radiusKm, kind: kind !== 'all' ? kind : undefined },
    ];
  }, [lat, lng, radiusKm, kind]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeyBase,
    queryFn: ({ pageParam = 0 }) =>
      facilities.list({
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        radiusKm,
        limit: PAGE_SIZE,
        offset: pageParam,
        kind: kind !== 'all' ? kind : undefined,
      }),
    getNextPageParam,
    enabled: hasCoords,
    initialPageParam: 0,
  });

  const total = data?.pages[0]?.pagination?.total ?? 0;

  const header = (
    <div className="space-y-2 px-4 pt-4">
      <div className="flex items-center gap-2">
        <Navigation className="h-5 w-5 text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">À proximité</h1>
      </div>
      <p className="text-xs text-gray-500">
        {hasCoords
          ? `${total} résultat(s) dans un rayon de ${radiusKm} km`
          : 'Activez votre position pour découvrir les établissements les plus proches.'}
      </p>
    </div>
  );

  // Geo loading only — not data refetch
  if (geo.loading) {
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

  // Render card for a single facility
  const renderCard = (f: Facility) => {
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
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {f.reviewCount && f.reviewCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {f.averageRating?.toFixed(1)} ({f.reviewCount})
              </span>
            )}
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
  };

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

      {/* Results — render by page to avoid duplicate keys */}
      <div className="space-y-2 px-4">
        {data?.pages.map((page, pageIdx) => (
          <React.Fragment key={pageIdx}>
            {page.data?.filter(Boolean).map(renderCard)}
          </React.Fragment>
        ))}

        {/* Load more */}
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-brand-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Voir plus
              </span>
            )}
          </button>
        )}

        {/* Empty state */}
        {((data?.pages.length ?? 0) === 0 || (data?.pages[0]?.data?.length ?? 0) === 0) && !isLoading && (
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
