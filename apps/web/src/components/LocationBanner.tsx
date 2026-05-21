import { MapPin, Crosshair, XCircle } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLocationStore } from '../stores/location';
import { useEffect } from 'react';

export function LocationBanner() {
  const { position, loading, error, permission } = useGeolocation();
  const { lat, lng, setLocation, clear } = useLocationStore();

  /* Sync watchPosition results into Zustand store */
  useEffect(() => {
    if (position && (position.lat !== lat || position.lng !== lng)) {
      setLocation(position.lat, position.lng);
    }
  }, [position, lat, lng, setLocation]);

  if (permission === 'denied') {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
        <XCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1">{error}</span>
        <button
          onClick={() => {
            clear();
            window.location.reload();
          }}
          className="shrink-0 font-semibold underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!position && !loading && !error) return null;

  return (
    <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
      {loading ? (
        <>
          <Crosshair className="h-4 w-4 shrink-0 animate-spin" />
          <span>Localisation en cours…</span>
        </>
      ) : position ? (
        <>
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            Localisé à lat {position.lat.toFixed(4)}, lng {position.lng.toFixed(4)}{' '}
            (±{Math.round(position.accuracy)} m)
          </span>
          <button
            onClick={clear}
            className="shrink-0 text-brand-500 hover:text-brand-700"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </>
      )}
    </div>
  );
}
