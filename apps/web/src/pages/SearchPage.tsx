import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Stethoscope, ArrowRight, Pill, X, Loader2 } from 'lucide-react';
import { useProviders, useFacilities } from '../hooks/api';
import { Card, EmptyState } from '../components/ui';

export function SearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQ = params.get('q') || '';

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<'all' | 'providers' | 'facilities'>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: providersData, isLoading: pLoading } = useProviders({
    search: debouncedQ || undefined,
    limit: 20,
  });
  const { data: facilitiesData, isLoading: fLoading } = useFacilities({
    search: debouncedQ || undefined,
    limit: 20,
  });

  const isLoading = pLoading || fLoading;
  const providerList = providersData?.data ?? [];
  const facilityList = facilitiesData?.data ?? [];

  // Combine suggestions for autocomplete dropdown
  const suggestions: Array<
    | (typeof providerList[number] & { _type: 'provider' })
    | (typeof facilityList[number] & { _type: 'facility' })
  > = [
    ...providerList.slice(0, 5).map((p) => ({ ...p, _type: 'provider' as const })),
    ...facilityList.slice(0, 5).map((f) => ({ ...f, _type: 'facility' as const })),
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!dropdownRef.current?.contains(target) && !inputRef.current?.contains(target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [debouncedQ]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && suggestions[highlightIndex]) {
          const item = suggestions[highlightIndex];
          setQ(item._type === 'provider' ? item.displayName || '' : item.name || '');
          setDebouncedQ(item._type === 'provider' ? item.displayName || '' : item.name || '');
          setShowDropdown(false);
          navigate(item._type === 'provider' ? `/provider/${item.id}` : `/facility/${item.id}`);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  }

  function selectItem(
    item: typeof suggestions[number]
  ) {
    const text = item._type === 'provider' ? item.displayName || '' : item.name || '';
    setQ(text);
    setDebouncedQ(text);
    setShowDropdown(false);
    navigate(item._type === 'provider' ? `/provider/${item.id}` : `/facility/${item.id}`);
  }

  if (isLoading && !providersData && !facilitiesData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">Recherche</h1>
      </div>

      {/* Search + Autocomplete */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (q.trim()) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un médecin, pharmacie, clinique…"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm outline-none focus:border-brand-500"
          autoFocus
          autoComplete="off"
        />
        {q && (
          <button
            onClick={() => {
              setQ('');
              setDebouncedQ('');
              setShowDropdown(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
            aria-label="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Autocomplete dropdown */}
        {showDropdown && debouncedQ && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            {suggestions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                Aucun résultat pour « {debouncedQ} »
              </div>
            ) : (
              <ul className="max-h-60 overflow-y-auto py-1">
                {suggestions.map((item, i) => {
                  const isProvider = item._type === 'provider';
                  const icon = isProvider ? (
                    <Stethoscope className="h-4 w-4 text-brand-600" />
                  ) : (
                    <Pill className="h-4 w-4 text-brand-600" />
                  );
                  const title = isProvider
                    ? item.displayName || 'Sans nom'
                    : item.name;
                  const subtitle = isProvider
                    ? `${item.jobTitle || item.specialty || item.role}${item.facilityName ? ` · ${item.facilityName}` : ''}`
                    : `${item.city ?? item.address ?? ''}`;

                  return (
                    <li key={`${item._type}-${item.id}`}>
                      <button
                        onClick={() => selectItem(item)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                          i === highlightIndex ? 'bg-brand-50' : ''
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50">
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{title}</p>
                          <p className="truncate text-xs text-gray-500">{subtitle}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
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
        {(activeTab === 'all' || activeTab === 'providers') && providerList.filter(Boolean).map((p) => (
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
        {(activeTab === 'all' || activeTab === 'facilities') && facilityList.filter(Boolean).map((f) => (
          <Card key={f.id} className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-brand-50 p-2">
              {f?.kind === 'pharmacy' ? (
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
