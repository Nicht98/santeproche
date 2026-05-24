# SanteProche Web 🇨🇲

Frontend for the SanteProche healthcare access platform in Cameroon. Built with React 18, TypeScript, Tailwind CSS, and Vite.

Deployed on Dokploy from the `frontend` branch.

---

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Maps**: MapLibre GL (open-source, self-hosted)
- **State**: Zustand (auth, location)
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Package Manager**: pnpm

---

## Project Structure

```
apps/web/
├── src/
│   ├── components/         # Reusable UI components
│   ├── components/ui/      # Card, Button, Input, EmptyState, SkeletonGrid
│   ├── hooks/
│   │   ├── api.ts          # TanStack Query wrappers
│   │   └── useGeolocation.ts
│   ├── lib/
│   │   ├── api.ts          # REST client + endpoint helpers
│   │   └── errors.ts       # Error formatting
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── NearbyPage.tsx      # Geo-based facility filters
│   │   ├── Facilities.tsx      # Search + kind filter tabs
│   │   ├── FacilityDetail.tsx
│   │   ├── Providers.tsx
│   │   ├── ProviderDetail.tsx
│   │   ├── Booking.tsx
│   │   ├── Appointments.tsx
│   │   ├── Chat.tsx
│   │   ├── Transport.tsx
│   │   ├── SOS.tsx
│   │   ├── Login.tsx
│   │   ├── PatientRegister.tsx
│   │   ├── ProviderRegister.tsx
│   │   ├── ProviderDashboard.tsx
│   │   └── Profile.tsx
│   ├── stores/
│   │   ├── auth.ts
│   │   └── location.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Facility Kinds (UI Filter Categories)

The app displays and filters all 12 facility kinds found on the backend:

| Kind | Label | Icon | Color |
|---|---|---|---|
| `pharmacy` | Pharmacies | `Pill` | emerald |
| `hospital` | Hôpitaux | `Stethoscope` | rose |
| `clinic` | Cliniques | `Building2` | blue |
| `laboratory` | Laboratoires | `FlaskConical` | violet |
| `health_center` | Centres de santé | `HeartPulse` | amber |
| `dispensary` | Dispensaires | `MapPin` | orange |
| `maternity` | Maternités | `Baby` | pink |
| `dental` | Dentaires | `Smile` | cyan |
| `optical` | Optiques | `Glasses` | indigo |
| `mental_health` | Mental / Psy | `Brain` | teal |
| `vaccination` | Vaccinations | `Syringe` | lime |
| `other` | Autres | `MapPin` | gray |

These kinds are rendered as scrollable filter chips on:
- **Home** page — quick-action grid
- **NearbyPage** — geo-filtered nearby results
- **Facilities** — search + kind tabs
- **FacilityDetail** — header icon + label

---

## Getting Started

```bash
# From repo root
cp apps/web
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:5173`.

---

## Build

```bash
cp apps/web
pnpm run build
```

Produces a static bundle in `dist/` served via nginx in the Docker image.

---

## Environment

The frontend expects these build-time args in the Dockerfile:

```dockerfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
```

This is injected at **build time**, not runtime. The API client reads from `import.meta.env.VITE_API_URL`.

---

## API Consumption

All backend calls go through `lib/api.ts` using a lightweight `fetch` wrapper. Key endpoints consumed:

| Endpoint | Page(s) |
|---|---|
| `GET /facilities?kind=...&lat=...&lng=...` | Home, Nearby, Facilities |
| `GET /facilities/:id` | FacilityDetail |
| `GET /drugs` + `/drugs/:id` | Search, FacilityDetail stock |
| `GET /providers` | Home, Providers |
| `POST /appointments` | Booking |
| `GET /appointments/me` | Appointments |
| `GET /conversations` | Chat |
| `POST /sos` | SOS |
| `POST /transport/nearby` | Transport |

---

## Branch Convention

- **`frontend`** → This branch. UI/web only.
- **`main`** → Backend (API, DB, migrations, shared-types). Separate Dokploy app.

Never mix backend files into `frontend`, or frontend files into `main`.

---

Build for Cameroon. Built open-source.
