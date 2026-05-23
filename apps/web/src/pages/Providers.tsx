import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Stethoscope, ArrowRight, X, Loader2 } from 'lucide-react';
import { useProviders } from '../hooks/api';
import { Card, EmptyState, ErrorBanner } from '../components/ui';

export function Providers() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [day, setDay] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error, refetch } = useProviders({
    search: debouncedSearch || undefined,
    role: role || undefined,
    dayOfWeek: day || undefined,
    limit: 20,
  });

  const suggestions = data?.data ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !dropdownRef.current?.contains(target) &&
        !inputRef.current?.contains(target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [debouncedSearch]);

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
          const p = suggestions[highlightIndex];
          setSearch(p.displayName || '');
          setDebouncedSearch(p.displayName || '');
          setShowDropdown(false);
          navigate(`/provider/${p.id}`);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  }

  function selectProvider(p: typeof suggestions[number]) {
    setSearch(p.displayName || '');
    setDebouncedSearch(p.displayName || '');
    setShowDropdown(false);
    navigate(`/provider/${p.id}`);
  }

  if (isLoading && !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm">Chargement de l'annuaire…</p>
      </div>
    );
  }

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

      {/* Search + Autocomplete */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (search.trim()) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un soignant…"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm outline-none focus:border-brand-500"
          autoComplete="off"
        />
        {search && (
          <button
            onClick={() => {
              setSearch('');
              setDebouncedSearch('');
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
      {showDropdown && search.trim() && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {search.trim() !== debouncedSearch || isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              Recherche en cours…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Aucun résultat pour « {debouncedSearch} »
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {suggestions.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => selectProvider(p)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                      i === highlightIndex ? 'bg-brand-50' : ''
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                      {(p.displayName ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {p.displayName || 'Sans nom'}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {p.jobTitle || p.specialty || p.role}
                        {p.facilityName && ` · ${p.facilityName}`}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      </div>

      {/* Role / Day filters */}
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-2 text-xs outline-none"
        >
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none"
        >
          {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      {error && <ErrorBanner error={error} onRetry={refetch} />}

      {/* Loading overlay on refetch (doesn't blank page) */}
      {isLoading && data && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Recherche en cours…
        </div>
      )}

      <div className="space-y-2 pb-6">
        {data?.data?.filter(Boolean)?.map((p) => (
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
