import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Stethoscope, ArrowRight } from 'lucide-react';
import { useProviders } from '../hooks/api';
import { Card, LoadingScreen, EmptyState, ErrorBanner } from '../components/ui';

export function Providers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [day, setDay] = useState('');

  const { data, isLoading, error, refetch } = useProviders({
    search: search || undefined,
    role: role || undefined,
    dayOfWeek: day || undefined,
    limit: 20,
  });

  if (isLoading) return <LoadingScreen />;

  const roles = [
    { value: '', label: 'Tous' },
    { value: 'doctor', label: 'Médecins' },
    { value: 'pharmacist', label: 'Pharmaciens' },
    { value: 'nurse', label: 'Infirmiers' },
  ];

  const days = [
    { value: '', label: 'Tous les jours' },
    { value: 'monday', label: 'Lundi' },
    { value: 'tuesday', label: 'Mardi' },
    { value: 'wednesday', label: 'Mercredi' },
    { value: 'thursday', label: 'Jeudi' },
    { value: 'friday', label: 'Vendredi' },
    { value: 'saturday', label: 'Samedi' },
    { value: 'sunday', label: 'Dimanche' },
  ];

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">Annuaire soignant</h1>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-2 text-xs outline-none"
        >
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <select
        value={day}
        onChange={(e) => setDay(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none"
      >
        {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>

      {error && <ErrorBanner error={error} onRetry={refetch} />}

      <div className="space-y-2 pb-6">
        {data?.data?.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
              <span className="text-sm font-bold text-brand-600">{(p.displayName ?? '?').slice(0, 1).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">{p.displayName ?? 'Sans nom'}</h3>
              <p className="text-xs text-gray-500">{p.specialty ? `${p.specialty} · ` : ''}{p.role}</p>
              {p.facilityName && <p className="text-[10px] text-gray-400">{p.facilityName}</p>}
            </div>
            <button
              onClick={() => navigate(`/provider/${p.id}`)}
              className="rounded-full p-2 text-brand-600 hover:bg-brand-50"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </Card>
        ))}
        {!data?.data?.length && <EmptyState icon={Stethoscope} title="Aucun soignant trouvé" subtitle="Essayez d'autres filtres" />}
      </div>
    </div>
  );
}
