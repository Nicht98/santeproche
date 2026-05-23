import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationStore {
  lat: number | null;
  lng: number | null;
  city: string | null;
  setLocation: (lat: number, lng: number) => void;
  setCity: (city: string) => void;
  clear: () => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      lat: null,
      lng: null,
      city: null,
      setLocation: (lat, lng) =>
        set((state) => {
          const EPS = 1e-4;
          if (
            state.lat !== null &&
            state.lng !== null &&
            Math.abs(state.lat - lat) < EPS &&
            Math.abs(state.lng - lng) < EPS
          ) {
            return state; // ignore micro-jitter
          }
          return { lat, lng };
        }),
      setCity: (city) => set({ city }),
      clear: () => set({ lat: null, lng: null, city: null }),
    }),
    { name: 'sp-location' }
  )
);
