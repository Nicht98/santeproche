# SanteProche 🇨🇲

Healthcare access platform for Cameroon. Connects patients, parents, elderly, healthcare workers, and tourists with nearby open pharmacies, hospitals, and clinics — with real-time drug stock lookup, appointment booking, chat with providers, transport cost estimates, and emergency SOS.

**Deployed on Dokploy** — `docker compose up -d --build` on every push to `main`.

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│  API (3000) │────▶│ PostgreSQL  │
│   (React)   │     │  (Fastify)  │     │  + PostGIS  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │  Redis  │      │  OSRM   │      │ Nominatim
    │ (OTP/cache)│    │ (Routing)│    │ (Geocoding)
    └─────────┘      └─────────┘      └─────────┘
         │
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │  MinIO  │      │ Kannel  │      │Prometheus
    │ (Files) │      │  (SMS)  │      │+ Grafana
    └─────────┘      └─────────┘      └─────────┘
```

---

## Tech Stack

- **Backend**: Node.js 20 + Fastify 4 + TypeScript
- **ORM**: Drizzle ORM + raw SQL fallback for complex geo queries
- **Database**: PostgreSQL 15 + PostGIS (geospatial)
- **Cache/OTP**: Redis 7
- **Auth**: JWT access tokens (15min) + refresh tokens (7d) + OTP via Kannel SMS
- **Routing**: OSRM (self-hosted OpenStreetMap routing for Cameroon)
- **Search**: Nominatim (self-hosted geocoding)
- **Files**: MinIO (S3-compatible object storage)
- **Monitoring**: Prometheus + Grafana + `/metrics` health endpoint
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Package Manager**: pnpm + Turborepo

---

## Quick Start

```bash
# Clone
git clone https://github.com/Nicht98/santeproche.git
cd santeproche

# Install dependencies
pnpm install

# Start locally (requires Docker)
docker compose up -d

# API runs on http://localhost:3000
# Web runs on http://localhost:5173
```

---

## API Reference

Base URL: `https://api.santeproche.com/api/v1` (or `http://localhost:3000/api/v1` locally)

### Authentication

All protected endpoints require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/otp/request` | ❌ | Request SMS OTP to phone |
| `POST` | `/auth/otp/verify` | ❌ | Verify OTP → returns accessToken + refreshToken |
| `POST` | `/auth/refresh` | ❌ | Refresh access token using refreshToken |
| `POST` | `/auth/logout` | ✅ | Invalidate refresh token |
| `GET`  | `/auth/me` | ✅ | Get current user profile |

#### OTP Request
```bash
curl -X POST "$API/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+237612345678"}'
# → {"message":"OTP sent","expiresInSeconds":300}
```

#### OTP Verify
```bash
curl -X POST "$API/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+237612345678","code":"123456"}'
# → {"accessToken":"...","refreshToken":"...","user":{"id":"...","phone":"...","role":"patient"}}
```

---

### Patients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/patients/register` | ✅ | Register patient profile (firstName, lastName, gender, etc.) |
| `GET`  | `/patients/me` | ✅ | Get my patient profile |
| `PATCH`| `/patients/me` | ✅ | Update patient profile |

---

### Providers (Doctors, Nurses, Pharmacists)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/providers/register` | ✅ | Register as healthcare provider |
| `POST` | `/providers/facility` | ✅ | Link provider to a facility |

---

### Facilities (Pharmacies, Hospitals, Clinics)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/facilities` | ❌ | List/search facilities |
| `GET`  | `/facilities/:id` | ❌ | Get facility details with schedules |
| `GET`  | `/facilities/:id/available-slots` | ❌ | Get available appointment slots |

#### Query Parameters for `/facilities`
- `search` — text search on name and address
- `kind` — filter by type: `pharmacy`, `hospital`, `clinic`, `laboratory`, `health_center` (comma-separated for multiple)
- `cityId` — filter by city
- `lat` + `lng` + `radiusKm` — geo search with distance sorting
- `openNow=true` — only facilities currently open
- `hasEmergency=true` — only facilities with emergency services
- `limit` / `offset` — pagination (default 20, max 100)

```bash
# Search pharmacies in Douala
curl "$API/facilities?search=pharmacie&kind=pharmacy&limit=10"

# Nearby hospitals
curl "$API/facilities?kind=hospital&lat=4.0511&lng=9.7677&radiusKm=5"

# Open now
curl "$API/facilities?openNow=true&limit=5"
```

---

### Appointments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/appointments/available-slots` | ❌ | Query available slots by provider + date |
| `POST` | `/appointments` | ✅ | Book an appointment |
| `GET`  | `/appointments/me` | ✅ | List my appointments (patient view) |
| `GET`  | `/appointments/provider` | ✅ | List appointments where I'm the provider |
| `GET`  | `/appointments/:id` | ✅ | Get appointment details |
| `PATCH`| `/appointments/:id` | ✅ | Update status (provider: confirm/complete; patient/provider: cancel) |
| `POST` | `/appointments/:id/cancel` | ✅ | Cancel with reason (2h advance policy) |

#### Book Appointment
```bash
curl -X POST "$API/appointments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "11111111-1111-1111-1111-111111111111",
    "facilityId": "550e8400-e29b-41d4-a716-446655440002",
    "scheduledAt": "2026-05-26T10:00:00Z",
    "reason": "General consultation"
  }'
```

#### Provider Actions
```bash
# Confirm appointment (provider only)
curl -X PATCH "$API/appointments/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"confirmed"}'

# Mark completed (provider only)
curl -X PATCH "$API/appointments/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"completed","notes":"Patient responded well to treatment"}'

# Cancel with reason (patient or provider)
curl -X POST "$API/appointments/$ID/cancel" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"Need to reschedule"}'
```

---

### Chat Messaging

Patient ↔ Provider real-time messaging with unread counts.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/conversations` | ✅ | List my conversations |
| `POST` | `/conversations` | ✅ | Start a new conversation |
| `GET`  | `/conversations/:id` | ✅ | Get conversation details |
| `GET`  | `/conversations/:id/messages` | ✅ | List messages (auto-marks as read) |
| `POST` | `/conversations/:id/messages` | ✅ | Send a message |
| `GET`  | `/conversations/unread-count` | ✅ | Total unread messages |

```bash
# Start conversation with a doctor
curl -X POST "$API/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"providerId":"11111111-1111-1111-1111-111111111111","subject":"Consultation"}'

# Send message
curl -X POST "$API/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Hello doctor, I need a prescription refill"}'

# Get messages (returns in chronological order, marks as read)
curl "$API/conversations/$CONV_ID/messages?limit=50"
```

---

### Drug Catalog & Pharmacy Stock

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/drugs` | ❌ | List drugs with pagination |
| `GET`  | `/drugs?q=paracetamol` | ❌ | Search drugs by name/generic |
| `GET`  | `/drugs/:id` | ❌ | Drug details + nearby stock |
| `GET`  | `/drugs/stock?drugId=` | ❌ | Find which facilities have a drug |

#### Query Parameters
- `q` — search by name or generic name
- `category` — filter: `painkiller`, `antibiotic`, `antimalarial`, `vitamin`, etc.
- `lat` + `lng` + `radiusKm` — geo search for nearby stock

```bash
# Search paracetamol
curl "$API/drugs?q=para"

# Drug detail with nearby pharmacies that stock it
curl "$API/drugs/40948330-e1ba-43ca-b4e1-3011343f8625?lat=4.0511&lng=9.7677&radiusKm=5"

# Find stock for a specific drug
curl "$API/drugs/stock?drugId=40948330-e1ba-43ca-b4e1-3011343f8625&lat=4.0511&lng=9.7677&limit=5"
```

---

### Transport & Routing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/transport/route` | ❌ | Route between two points with cost estimates |
| `POST` | `/transport/nearby` | ❌ | Find nearest facilities with transport options |
| `GET`  | `/transport/stats` | ✅ (admin) | Transport analytics placeholder |

#### Route Between Points
```bash
curl -X POST "$API/transport/route" \
  -H "Content-Type: application/json" \
  -d '{
    "fromLat": 4.0511, "fromLng": 9.7677,
    "toLat": 4.0891, "toLng": 9.7358,
    "mode": "all"
  }'
# → {
#   "status": "success",
#   "route": { "distanceKm": 5.51, "durationMin": 8 },
#   "options": [
#     { "mode": "mototaxi", "costXaf": 1102, "durationMin": 14, "description": "..." },
#     { "mode": "bus", "costXaf": 276, "durationMin": 28, "description": "..." },
#     { "mode": "car", "costXaf": 1653, "durationMin": 18, "description": "..." }
#   ]
# }
```

**Cameroon transport cost estimates (XAF):**
- Mototaxi: 200 XAF base + ~200 XAF/km
- Bus: 150 XAF base + ~50 XAF/km
- Car taxi: 500 XAF base + ~300 XAF/km
- Walk: 0 XAF (shown if under 1 hour)

#### Nearby Facilities with Transport
```bash
curl -X POST "$API/transport/nearby" \
  -H "Content-Type: application/json" \
  -d '{
    "fromLat": 4.0511, "fromLng": 9.7677,
    "kind": "pharmacy",
    "radiusKm": 5,
    "limit": 3
  }'
```

---

### Prescriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/prescriptions` | ✅ (provider) | Create prescription |
| `GET`  | `/prescriptions/me` | ✅ | List my prescriptions |
| `GET`  | `/prescriptions/:id` | ✅ | Get prescription details |
| `PATCH`| `/prescriptions/:id/status` | ✅ | Update status (dispensed, etc.) |

---

### Medical Records

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/consultation-records` | ✅ (provider) | Create consultation record |
| `GET`  | `/consultation-records/me` | ✅ | Get my records |
| `GET`  | `/consultation-records/:id` | ✅ | Get specific record |
| `PATCH`| `/consultation-records/:id` | ✅ | Update record |

---

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/reviews` | ✅ | Submit review for provider/facility |
| `GET`  | `/reviews/provider/:id` | ❌ | Get provider reviews |
| `GET`  | `/reviews/facility/:id` | ❌ | Get facility reviews |
| `DELETE`| `/reviews/:id` | ✅ | Delete my review |

---

### SOS / Emergency

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/sos` | ✅ | Create emergency request |
| `GET`  | `/sos/nearby` | ✅ | Find nearby SOS requests |
| `GET`  | `/sos/me` | ✅ | My SOS requests |
| `PATCH`| `/sos/:id/assign` | ✅ | Assign facility/provider to SOS |
| `PATCH`| `/sos/:id/resolve` | ✅ | Mark SOS as resolved |

---

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/notifications` | ✅ | List my notifications |
| `POST` | `/notifications/:id/read` | ✅ | Mark notification as read |
| `POST` | `/notifications/mark-all-read` | ✅ | Mark all as read |
| `POST` | `/notifications/send` | ✅ (admin) | Send notification |

---

### Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/upload/avatar` | ✅ | Upload user avatar |
| `POST` | `/upload/facility/:id/avatar` | ✅ | Upload facility avatar |

---

### Admin / Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/health` | ❌ | Health check → `{"status":"ok"}` |
| `GET`  | `/metrics` | ❌ | Prometheus metrics for monitoring |
| `GET`  | `/admin/health/db` | ❌ | Database health check |
| `POST` | `/admin/migrate` | ❌ | Run pending migrations |

---

## Database Schema

### Core Tables
- `users` — accounts (patient, doctor, admin, pharmacist, nurse)
- `patient_profiles` — patient medical details
- `provider_profiles` — provider credentials + linked facility
- `facilities` — pharmacies, hospitals, clinics with geo coords
- `cities` — Cameroon cities with coordinates

### Scheduling & Booking
- `provider_schedules` — weekly availability slots
- `appointments` — bookings with status (pending → confirmed → completed)

### Medical
- `drugs` — catalog of 10+ common Cameroon medicines
- `drug_stock` — per-facility stock levels, pricing (XAF), shelf location
- `prescriptions` — digital prescriptions linked to drugs
- `consultation_records` — visit notes, diagnosis, vitals
- `medical_records` — consolidated patient records

### Communication
- `conversations` — patient ↔ provider chat threads
- `messages` — chat messages with read tracking
- `notifications` — system + user notifications

### Reviews & Emergency
- `reviews` — star ratings + text for providers/facilities
- `sos_requests` — emergency alerts with location + status
- `refresh_tokens` — JWT refresh token storage

### Geo / Routing
- PostGIS extensions on PostgreSQL
- Haversine distance for nearest-facility queries
- OSRM for road-network routing (with haversine fallback)

---

## Migrations

All migrations run automatically on container startup via `startup.sh`.

| File | Description |
|------|-------------|
| `0000_init.sql` | Core tables: users, cities, providers, schedules, appointments |
| `0001_patient_fields.sql` | Extended patient profile fields |
| `0002_facilities_schedules_appointments.sql` | Facilities, schedules, appointments with enums |
| `0003_seed_facilities.sql` | 5 seed facilities (Douala, Yaoundé, Bamenda) |
| `0004_fix_provider_fk.sql` | Provider profile FK fix |
| `0005_seed_test_provider.sql` | Test provider: Dr. Amadou Biya |
| `0006_chat.sql` | Conversations + messages tables |
| `0007_reviews_records_prescriptions_notifications_sos.sql` | Full medical + emergency schema |
| `0008_drugs_drug_stock.sql` | Drug catalog + stock tracking |
| `0009_seed_drug_stock.sql` | Seeded stock at pharmacies/hospitals |

---

## Environment Variables

```env
# Required
DATABASE_URL=postgres://sante:secret@db:5432/santeproche
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret-here

# Optional
NODE_ENV=production
OSRM_URL=http://osrm-routed:5000
NOMINATIM_URL=http://nominatim:8080
KANNEL_URL=http://kannel:13013
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

---

## Deployment

### Dokploy (Current)

1. Push to `main` branch on GitHub
2. Dokploy auto-pulls and runs `docker compose up -d --build`
3. Migrations auto-run on API container startup
4. Health check at `GET /health`
5. Metrics at `GET /metrics`

### Docker Compose (Self-Hosted)

```bash
docker compose up -d
```

Services:
- API: `localhost:3000`
- Web: `localhost:5173`
- DB: `localhost:5432`
- Redis: `localhost:6379`
- MinIO Console: `localhost:9001`
- Prometheus: `localhost:9090`
- Grafana: `localhost:3001` (admin/grafana-secret)

---

## Open Source Philosophy

SanteProche avoids proprietary APIs:
- **Maps/Routing**: OSRM (OpenStreetMap) + Nominatim (self-hosted)
- **SMS**: Kannel (open-source SMS gateway)
- **File Storage**: MinIO (S3-compatible, self-hosted)
- **Monitoring**: Prometheus + Grafana

---

## Contributors

Built by the SanteProche team for healthcare access in Cameroon.
