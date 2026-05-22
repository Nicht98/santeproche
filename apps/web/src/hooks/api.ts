import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { auth, patients, providers, facilities, appointments, chat } from '../lib/api';
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

/* ---------- Providers ---------- */
export function useProviders(params?: Parameters<typeof providers.list>[0]) {
  return useQuery({
    queryKey: ['providers', params],
    queryFn: () => providers.list(params),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ['provider', id],
    queryFn: () => providers.get(id),
    enabled: !!id,
  });
}

/* ---------- Facilities ---------- */
export function useFacilities(params?: Parameters<typeof facilities.list>[0]) {
  return useQuery({
    queryKey: ['facilities', params],
    queryFn: () => facilities.list(params),
  });
}

export function useFacility(id: string) {
  return useQuery({
    queryKey: ['facility', id],
    queryFn: () => facilities.get(id),
    enabled: !!id,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
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
