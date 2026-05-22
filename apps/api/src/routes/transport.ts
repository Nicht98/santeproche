import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

const OSRM_URL = process.env.OSRM_URL || 'http://osrm-routed:5000';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface OsrmRouteResponse {
  routes?: Array<{
    distance: number;       // meters
    duration: number;       // seconds
    legs?: Array<{ distance: number; duration: number }>;
  }>;
}

// Cameroon transport cost estimates (very rough, in XAF)
function estimateTransportCost(distanceMeters: number, mode: string): {
  mode: string;
  costXaf: number;
  durationMin: number;
  description: string;
}[] {
  const distanceKm = distanceMeters / 1000;
  const results = [];

  if (mode === 'all' || mode === 'taxi') {
    // Motorcycle taxi in Cameroon: roughly 150-300 XAF/km in cities, ~24 km/h
    const motoCost = Math.round(distanceKm * 200);
    const motoDur = Math.max(1, Math.round(distanceKm / 24 * 60)); // 24 km/h avg, min 1 min
    results.push({
      mode: 'mototaxi',
      costXaf: Math.max(200, motoCost),
      durationMin: motoDur,
      description: 'Motorcycle taxi — fastest in traffic',
    });
  }

  if (mode === 'all' || mode === 'bus') {
    // Bus: very cheap, fixed routes, slower ~12 km/h
    const busCost = Math.max(150, Math.round(distanceKm * 50));
    const busDur = Math.max(1, Math.round(distanceKm / 12 * 60));
    results.push({
      mode: 'bus',
      costXaf: busCost,
      durationMin: busDur,
      description: 'Shared bus — cheapest but fixed routes',
    });
  }

  if (mode === 'all' || mode === 'car') {
    // Car taxi / ride-hail ~18 km/h
    const carCost = Math.max(500, Math.round(distanceKm * 300));
    const carDur = Math.max(1, Math.round(distanceKm / 18 * 60));
    results.push({
      mode: 'car',
      costXaf: carCost,
      durationMin: carDur,
      description: 'Private car taxi — most comfortable',
    });
  }

  if (mode === 'all' || mode === 'walk') {
    const walkDur = Math.max(1, Math.round(distanceKm / 5 * 60)); // ~5 km/h, min 1 min
    if (walkDur <= 60) { // Only if under 1 hour
      results.push({
        mode: 'walk',
        costXaf: 0,
        durationMin: walkDur,
        description: 'Walking — free and healthy',
      });
    }
  }

  return results;
}

// Node 20+ global fetch
declare const fetch: typeof globalThis.fetch;

export const transportRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /transport/route — route between two points with cost estimates
  fastify.post('/transport/route', async (request, reply) => {
    const { fromLat, fromLng, toLat, toLng, mode = 'all' } = request.body as Record<string, any>;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return reply.code(400).send({
        error: { code: 'MISSING_COORDS', message: 'Coordonnées de départ et d\'arrivée requises.' },
      });
    }

    try {
      const osrmUrl = `${OSRM_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
      const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(3000) });

      let distanceMeters: number;
      let durationSeconds: number;

      if (osrmRes.ok) {
        const osrmData = (await osrmRes.json()) as OsrmRouteResponse;
        const route = osrmData.routes?.[0];
        if (route) {
          distanceMeters = route.distance;
          durationSeconds = route.duration;
        } else {
          // Fallback to haversine
          distanceMeters = haversine(fromLat, fromLng, toLat, toLng);
          durationSeconds = (distanceMeters / 1000 / 40) * 3600; // ~40 km/h avg
        }
      } else {
        // OSRM unavailable — use haversine estimate
        distanceMeters = haversine(fromLat, fromLng, toLat, toLng);
        durationSeconds = (distanceMeters / 1000 / 40) * 3600;
      }

      const options = estimateTransportCost(distanceMeters, mode);

      return {
        status: 'success',
        route: {
          distanceKm: Number((distanceMeters / 1000).toFixed(2)),
          durationMin: Math.round(durationSeconds / 60),
        },
        options: options.map((o) => ({
          ...o,
          costXaf: o.costXaf,
          durationMin: o.durationMin,
        })),
      };
    } catch (_err) {
      // OSRM error — haversine fallback
      const distanceMeters = haversine(fromLat, fromLng, toLat, toLng);
      const options = estimateTransportCost(distanceMeters, mode);
      return {
        status: 'success',
        route: {
          distanceKm: Number((distanceMeters / 1000).toFixed(2)),
          durationMin: Math.round((distanceMeters / 1000 / 40) * 60),
        },
        options: options.map((o) => ({
          ...o,
          costXaf: o.costXaf,
          durationMin: o.durationMin,
        })),
      };
    }
  });

  // POST /transport/nearby — route from user location to nearest facilities of a type
  fastify.post('/transport/nearby', async (request, reply) => {
    const { fromLat, fromLng, kind, radiusKm = '5', limit = '5' } = request.body as Record<string, any>;

    if (!fromLat || !fromLng) {
      return reply.code(400).send({
        error: { code: 'MISSING_COORDS', message: 'Latitude et longitude de départ requises.' },
      });
    }

    // Find nearby facilities
    const R = 6371;
    const facilitiesList = await query(
      `SELECT *,
        (${R} * acos(LEAST(1, GREATEST(-1,
          cos(radians($1)) * cos(radians(lat::float)) *
          cos(radians(lng::float) - radians($2)) +
          sin(radians($1)) * sin(radians(lat::float))
        )))) as distance_km
      FROM facilities
      WHERE is_active = true AND deleted_at IS NULL
        ${kind ? "AND kind = '" + kind + "'" : ''}
        AND (${R} * acos(LEAST(1, GREATEST(-1,
          cos(radians($1)) * cos(radians(lat::float)) *
          cos(radians(lng::float) - radians($2)) +
          sin(radians($1)) * sin(radians(lat::float))
        )))) <= $3
      ORDER BY distance_km
      LIMIT $4`,
      [parseFloat(fromLat), parseFloat(fromLng), parseFloat(radiusKm), parseInt(limit, 10)]
    );

    // Get routing + cost for each facility
    const results = await Promise.all(
      facilitiesList.map(async (f: Record<string, any>) => {
        try {
          const osrmUrl = `${OSRM_URL}/route/v1/driving/${fromLng},${fromLat};${f.lng},${f.lat}?overview=false`;
          const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(2000) });

          let distanceKmHaversine = Number(f.distance_km);
          let options: any[] = [];

          if (osrmRes.ok) {
            const osrmData = (await osrmRes.json()) as OsrmRouteResponse;
            const route = osrmData.routes?.[0];
            if (route) {
              options = estimateTransportCost(route.distance, 'all').slice(0, 3);
            } else {
              options = estimateTransportCost(distanceKmHaversine * 1000, 'all').slice(0, 3);
            }
          } else {
            // OSRM down — use haversine distance
            options = estimateTransportCost(distanceKmHaversine * 1000, 'all').slice(0, 3);
          }

          return {
            facility: {
              id: f.id,
              name: f.name,
              kind: f.kind,
              address: f.address,
              phone: f.phone,
              lat: f.lat,
              lng: f.lng,
              is24h: f.is_24h,
              hasEmergency: f.has_emergency,
            },
            distanceKm: distanceKmHaversine,
            options: options,
          };
        } catch (_err) {
          const dkm = Number(f.distance_km);
          return {
            facility: { id: f.id, name: f.name, kind: f.kind, address: f.address, phone: f.phone, lat: f.lat, lng: f.lng, is24h: f.is_24h, hasEmergency: f.has_emergency },
            distanceKm: dkm,
            options: estimateTransportCost(dkm * 1000, 'all').slice(0, 3),
          };
        }
      })
    );

    return { status: 'success', data: results };
  });

  // GET /transport/stats — simple overview for admin/metrics
  fastify.get('/transport/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { role } = request.user;
    if (role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Réservé aux administrateurs.' } });
    }

    return {
      status: 'success',
      message: 'Statistiques bientôt disponibles.',
    };
  });
};
