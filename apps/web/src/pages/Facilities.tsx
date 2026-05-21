import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Pill, Stethoscope, Search, ArrowRight } from 'lucide-react';
import { useFacilities } from '../hooks/api';
import { Card, LoadingScreen, EmptyState } from '../components/ui';

export function Facilities() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading, error } = useFacilities({
    search: search || undefined,
    type: type || undefined,
    limit: 20,
  });

  if (isLoading) return <LoadingScreen />;

  const iconMap: Record<string, typeof Pill> = { pharmacy: Pill, hospital: Stethoscope, clinic: Stethoscope };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">Établissements</h1>
      </div>

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
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {['Tous', 'pharmacy', 'hospital', 'clinic'].map((t) => (
          <button
            key={t}
            onClick={() => setType(t === 'Tous' ? '' : t)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              (type === t || (t === 'Tous' && !type))
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t === 'pharmacy' ? 'Pharmacies' : t === 'hospital' ? 'Hôpitaux' : t === 'clinic' ? 'Cliniques' : 'Tous'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{(error as Error)?.message}</div>}

      <div className="space-y-2 pb-6">
        {data?.data?.map((f) => {
          const Icon = iconMap[f.type] || MapPin;
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
        {!data?.data?.length && <EmptyState icon={MapPin} title="Aucun établissement" subtitle="Essayez d'autres filtres" />}
      </div>
    </div>
  );
}
