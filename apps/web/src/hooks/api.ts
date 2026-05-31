import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { auth, patients, providers, facilities, appointments, chat, reviews, sos } from '../lib/api';
import type { UpdateStatusBody } from '../lib/api';

/* ---------- Auth ---------- */
export function useRequestOtp() {
  return useMutation({
    mutationFn: auth.requestOtp,
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: auth.verifyOtp,
  });
}

/* ---------- Patients ---------- */
export function useRegisterPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patients.register,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function usePatientProfile() {
  return useQuery({
    queryKey: ['patients', 'me'],
    queryFn: patients.me,
    placeholderData: keepPreviousData,
  });
}

/* ---------- Providers ---------- */
export function useProviders(params?: Parameters<typeof providers.list>[0]) {
  return useQuery({
    queryKey: ['providers', params],
    queryFn: () => providers.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ['provider', id],
    queryFn: () => providers.get(id),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

/* ---------- Facilities ---------- */
export function useFacilities(params?: Parameters<typeof facilities.list>[0]) {
  return useQuery({
    queryKey: ['facilities', params],
    queryFn: () => facilities.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useFacility(id: string) {
  return useQuery({
    queryKey: ['facility', id],
    queryFn: () => facilities.get(id),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

export function useFacilityStock(id: string, q?: string) {
  return useQuery({
    queryKey: ['facility-stock', id, q],
    queryFn: () => facilities.stock(id, q),
    enabled: !!id,
  });
}

/* ---------- Appointments ---------- */
export function useMyAppointments() {
  return useQuery({
    queryKey: ['appointments', 'me'],
    queryFn: appointments.mine,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointments.get(id),
    enabled: !!id,
  });
}

export function useProviderAppointments() {
  return useQuery({
    queryKey: ['appointments', 'provider'],
    queryFn: appointments.listForProvider,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: appointments.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => appointments.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateStatusBody) =>
      appointments.updateStatus(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useAvailableSlots(providerId: string, date: string) {
  return useQuery({
    queryKey: ['slots', providerId, date],
    queryFn: () => appointments.availableSlots(providerId, date),
    enabled: !!providerId && !!date,
  });
}

/* ---------- Chat ---------- */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: chat.conversations,
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chat.messages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chat.send,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chat.start,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/* ---------- Reviews ---------- */
export function useFacilityReviews(facilityId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['reviews', 'facility', facilityId, params],
    queryFn: () => reviews.facility(facilityId, params),
    enabled: !!facilityId,
    placeholderData: keepPreviousData,
  });
}

export function useProviderReviews(providerId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['reviews', 'provider', providerId, params],
    queryFn: () => reviews.provider(providerId, params),
    enabled: !!providerId,
    placeholderData: keepPreviousData,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviews.create,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['reviews', 'facility', variables.facilityId] });
      qc.invalidateQueries({ queryKey: ['reviews', 'provider', variables.providerId] });
      qc.invalidateQueries({ queryKey: ['facility', variables.facilityId] });
      qc.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviews.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

/* ---------- SOS ---------- */
export function useCreateSOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sos.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sos', 'me'] });
    },
  });
}

export function useMySOS() {
  return useQuery({
    queryKey: ['sos', 'me'],
    queryFn: () => sos.mine(),
  });
}

export function useResolveSOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sos.resolve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sos', 'me'] });
    },
  });
}
