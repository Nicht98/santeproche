/// <reference types="vite/client" />
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export interface ApiError {
  code: string;
  message: string;
}

class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(status: number, data: ApiError) {
    super(data.message);
    this.name = 'ApiClientError';
    this.code = data.code;
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({ message: res.statusText }))) as ApiError;
    throw new ApiClientError(res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ---------- Auth ---------- */
export interface RequestOtpBody { phone: string }
export interface VerifyOtpBody { phone: string; code: string; role?: string }
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  isProfileComplete: boolean;
  user: {
    id: string;
    phone: string;
    role: string;
    displayName: string | null;
  };
}
export const auth = {
  requestOtp: (body: RequestOtpBody) =>
    api<{ message: string; expiresInSeconds: number }>('/auth/otp/request', { method: 'POST', body: JSON.stringify(body) }),
  verifyOtp: (body: VerifyOtpBody) =>
    api<AuthResponse>('/auth/otp/verify', { method: 'POST', body: JSON.stringify(body) }),
};

/* ---------- Patients ---------- */
export interface PatientRegisterBody {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth?: string;
  bloodType?: string;
  address?: string;
  cityId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
}
export interface PatientProfile {
  id: string;
  phone: string;
  displayName: string;
  role: string;
  status: string;
  profile: {
    dateOfBirth: string | null;
    gender: string;
    bloodType: string | null;
    address: string | null;
    cityId: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    allergies: string | null;
  };
}
export const patients = {
  register: (body: PatientRegisterBody) =>
    api<{ status: string; message: string; user: PatientProfile }>('/patients/register', {
      method: 'POST', body: JSON.stringify(body),
    }),
};

/* ---------- Providers ---------- */
export interface Provider {
  id: string;
  displayName: string | null;
  phone: string;
  role: string;
  specialty: string | null;
  jobTitle: string | null;
  bio: string | null;
  facilityId: string | null;
  facilityName: string | null;
  facilityAddress: string | null;
  facilityPhone: string | null;
  facilityLat: number | null;
  facilityLng: number | null;
  schedule?: Record<string, unknown[]>;
  schedules?: Array<{
    id: number;
    providerId: string;
    facilityId: string | null;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    slotDurationMin: number;
    isActive: boolean;
  }>;
}
export interface ProvidersQuery {
  role?: string;
  facilityId?: string;
  search?: string;
  dayOfWeek?: string;
  page?: number;
  limit?: number;
}
export const providers = {
  list: (params?: ProvidersQuery) =>
    api<{ data: Provider[]; total: number; page: number; limit: number }>(`/providers?${qs(params)}`),
  get: (id: string) =>
    api<{ data: Provider }>(`/providers/${id}`),
  register: (body: unknown) =>
    api<{ status: string; message: string; user: unknown }>('/providers/register', { method: 'POST', body: JSON.stringify(body) }),
  linkFacility: (body: { providerId: string; facilityId: string }) =>
    api<unknown>('/providers/facility', { method: 'POST', body: JSON.stringify(body) }),
};

/* ---------- Facilities ---------- */
export interface Facility {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  distanceKm?: number;
  is24h?: boolean;
  hasEmergency?: boolean;
}
export interface FacilitiesQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  search?: string;
  kind?: string;
}
export const facilities = {
  list: (params?: FacilitiesQuery) =>
    api<{ data: Facility[]; total: number }>(`/facilities?${qs(params)}`),
  get: (id: string) =>
    api<{ data: Facility }>(`/facilities/${id}`),
  stock: (id: string, q?: string) =>
    api<{ data: any[]; pagination: { limit: number; offset: number; count: number } }>(`/facilities/${id}/stock?${q ? 'q=' + encodeURIComponent(q) : ''}`),
};

/* ---------- Appointments ---------- */
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  facilityId?: string;
  scheduledAt: string;
  durationMinutes?: number;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  providerName?: string | null;
  facilityName?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  rescheduleRequestedBy?: string | null;
  rescheduleRequestedAt?: string | null;
  rescheduleReason?: string | null;
  rescheduledFrom?: string | null;
  rescheduledAt?: string | null;
}
export interface AppointmentsByDay {
  date: string;
  appointments: Appointment[];
}
export interface CreateAppointmentBody {
  providerId: string;
  facilityId?: string;
  scheduledAt: string;
  reason?: string;
}
export interface UpdateStatusBody {
  status: AppointmentStatus;
  notes?: string;
  newScheduledAt?: string;
  rescheduleReason?: string;
}
export interface RescheduleBody {
  newScheduledAt: string;
  reason?: string;
}
export const appointments = {
  create: (body: CreateAppointmentBody) =>
    api<{ status: string; message: string; data: Appointment }>('/appointments', { method: 'POST', body: JSON.stringify(body) }),
  mine: () =>
    api<{ data: Appointment[] }>('/appointments/me'),
  listForProvider: () =>
    api<{ data: Appointment[]; pagination: { limit: number; offset: number; count: number } }>('/appointments/provider'),
  get: (id: string) =>
    api<{ data: Appointment }>(`/appointments/${id}`),
  availableSlots: (providerId: string, date: string) =>
    api<{ date: string; dayOfWeek: string; slots: { time: string; available: boolean }[] }>(`/appointments/available-slots?providerId=${providerId}&date=${date}`),
  updateStatus: (id: string, body: UpdateStatusBody) =>
    api<{ status: string; message: string; data: Appointment }>(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancel: (id: string, reason?: string) =>
    api<{ status: string; message: string; data: Appointment }>(`/appointments/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reschedule: (id: string, body: RescheduleBody) =>
    api<{ status: string; message: string; data: Appointment }>(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ newScheduledAt: body.newScheduledAt, rescheduleReason: body.reason }) }),
};

/* ---------- Chat ---------- */
export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: string;
  patientId?: string;
  providerId?: string;
}
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}
export const chat = {
  conversations: () =>
    api<{ data: Conversation[] }>('/conversations'),
  messages: (conversationId: string) =>
    api<{ data: Message[] }>(`/conversations/${conversationId}/messages`),
  send: (body: { conversationId: string; content: string }) =>
    api<{ data: Message }>(`/conversations/${body.conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: body.content, type: 'text' }),
    }),
  start: (body: { receiverId: string; title?: string }) =>
    api<{ status: string; conversation: Conversation }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ receiverId: body.receiverId, title: body.title }),
    }),
};

/* ---------- Helpers ---------- */
function qs(params?: any): string {
  if (!params) return '';
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)]);
  return new URLSearchParams(filtered).toString();
}

export { api, ApiClientError };
