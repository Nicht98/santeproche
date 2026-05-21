import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Stethoscope, ArrowRight, Pill } from 'lucide-react';
import { useProviders, useFacilities } from '../hooks/api';
import { Card, LoadingScreen, EmptyState } from '../components/ui';

export function SearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQ = params.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<'all' | 'providers' | 'facilities'>('all');

  const { data: providers, isLoading: pLoading } = useProviders({
    search: q || undefined,
    limit: 20,
  });
  const { data: facilities, isLoading: fLoading } = useFacilities({
    search: q || undefined,
    limit: 20,
  });

  const isLoading = pLoading || fLoading;
  const providerList = providers?.data ?? [];
  const facilityList = facilities?.data ?? [];

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">Recherche</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un médecin, pharmacie, clinique…"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        {([
          { key: 'all', label: `Tous (${providerList.length + facilityList.length})` },
          { key: 'providers', label: `Médecins (${providerList.length})` },
          { key: 'facilities', label: `Établissements (${facilityList.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeTab === t.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 pb-6">
        {/* Providers */}
        {(activeTab === 'all' || activeTab === 'providers') && providerList.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <span className="text-sm font-bold">{(p.displayName ?? p.role ?? '').slice(0, 1).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">{p.displayName || 'Sans nom'}</h3>
              <p className="text-xs text-gray-500">{p.specialty ? `${p.specialty} · ` : ''}{p.role}</p>
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

        {/* Facilities */}
        {(activeTab === 'all' || activeTab === 'facilities') && facilityList.map((f) => (
          <Card key={f.id} className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-brand-50 p-2">
              {f.type === 'pharmacy' ? (
                <Pill className="h-5 w-5 text-brand-600" />
              ) : (
                <Stethoscope className="h-5 w-5 text-brand-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">{f.name}</h3>
              <p className="text-xs text-gray-500">{f.city ?? f.address ?? 'Adresse inconnue'}</p>
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

        {providerList.length === 0 && facilityList.length === 0 && (
          <EmptyState icon={Search} title="Aucun résultat" subtitle={`Aucun résultat pour "${q}"`} />
        )}
      </div>
    </div>
  );
}
