import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface GeoState {
  position: GeoPosition | null;
  loading: boolean;
  error: string | null;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
}

/*
 * Small in-memory cache so multiple components share one
 * `watchPosition` handle.
 */
let sharedId: number | null = null;
const sharedCallbacks = new Set<(s: GeoState) => void>();

function push(s: GeoState) {
  sharedCallbacks.forEach((cb) => cb(s));
}

function startWatching(): number | null {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    push({
      position: null,
      loading: false,
      error: 'Géolocalisation non supportée sur cet appareil.',
      permission: 'unknown',
    });
    return null;
  }

  return navigator.geolocation.watchPosition(
    (pos) =>
      push({
        position: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
        loading: false,
        error: null,
        permission: 'granted',
      }),
    (err) => {
      let msg = "Impossible d'obtenir votre position.";
      if (err.code === err.PERMISSION_DENIED)
        msg =
          'Permission de géolocalisation refusée. Activez-la dans les paramètres de votre navigateur.';
      else if (err.code === err.POSITION_UNAVAILABLE)
        msg = 'Position indisponible (pas de signal GPS).';
      else if (err.code === err.TIMEOUT)
        msg = "Délai d'attente GPS dépassé.";
      push({
        position: null,
        loading: false,
        error: msg,
        permission: err.code === err.PERMISSION_DENIED ? 'denied' : 'unknown',
      });
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

export function useGeolocation(): GeoState & {
  refresh: () => void;
} {
  const [state, setState] = useState<GeoState>({
    position: null,
    loading: true,
    error: null,
    permission: 'unknown',
  });
  const firstRef = useRef(true);

  useEffect(() => {
    const cb = (s: GeoState) => setState(s);
    sharedCallbacks.add(cb);

    if (firstRef.current) {
      firstRef.current = false;
      if (sharedId == null) {
        sharedId = startWatching();
      } else {
        // already running — check permission via Permissions API
        if ('permissions' in navigator) {
          (navigator as any).permissions
            ?.query({ name: 'geolocation' })
            ?.then((r: any) => {
              if (r.state === 'denied')
                setState((prev) => ({
                  ...prev,
                  loading: false,
                  error:
                    'Permission de géolocalisation refusée. Activez-la dans les paramètres de votre navigateur.',
                  permission: 'denied',
                }));
            })
            .catch(() => {});
        }
      }
    }

    return () => {
      sharedCallbacks.delete(cb);
      if (sharedCallbacks.size === 0 && sharedId != null) {
        navigator.geolocation.clearWatch(sharedId);
        sharedId = null;
      }
    };
  }, []);

  const refresh = useCallback(() => {
    setState((p) => ({ ...p, loading: true, error: null }));
    if (sharedId != null) {
      navigator.geolocation.clearWatch(sharedId);
      sharedId = null;
    }
    sharedId = startWatching();
  }, []);

  return { ...state, refresh };
}
