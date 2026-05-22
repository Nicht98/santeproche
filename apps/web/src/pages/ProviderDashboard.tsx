import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarCheck, Phone, MapPin, Stethoscope, Clock, CheckCircle2, XCircle, User } from 'lucide-react';
import { useProviderAppointments, useUpdateAppointmentStatus } from '../hooks/api';
import { Card, LoadingScreen, EmptyState } from '../components/ui';
import { formatError } from '../lib/errors';
import type { Appointment } from '../lib/api';
import { useAuthStore } from '../stores/auth';

function StatusBadge({ status }: { status: Appointment['status'] }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'En attente' },
    confirmed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Confirmé' },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'En cours' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Terminé' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Annulé' },
    no_show: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Absent' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>
      {status === 'pending' && <Clock className="h-3 w-3" />}
      {status === 'confirmed' && <CalendarCheck className="h-3 w-3" />}
      {status === 'in_progress' && <Stethoscope className="h-3 w-3" />}
      {status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'cancelled' && <XCircle className="h-3 w-3" />}
      {status === 'no_show' && <User className="h-3 w-3" />}
      {s.label}
    </span>
  );
}

export function ProviderDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useProviderAppointments();
  const update = useUpdateAppointmentStatus();
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('today');

  if (isLoading) return <LoadingScreen />;

  const list = data?.data ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = list
    .filter((apt) => {
      const aptDate = apt.scheduledAt.slice(0, 10);
      if (filter === 'today') return aptDate === todayStr;
      if (filter === 'upcoming') return aptDate >= todayStr && !['completed', 'cancelled', 'no_show'].includes(apt.status);
      if (filter === 'past') return aptDate < todayStr || ['completed', 'cancelled', 'no_show'].includes(apt.status);
      return true;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-xs text-gray-500">
            {user?.displayName ?? 'Agent de santé'} · {list.length} rendez-vous
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['today', 'upcoming', 'past', 'all'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              filter === k ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {k === 'today' ? "Aujourd'hui" : k === 'upcoming' ? 'À venir' : k === 'past' ? 'Passés' : 'Tous'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{formatError(error)}</div>}

      <div className="space-y-2 pb-6">
        {filtered.map((apt) => {
          const date = new Date(apt.scheduledAt);
          const isToday = apt.scheduledAt.slice(0, 10) === todayStr;
          return (
            <Card key={apt.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">AUJ.</span>
                    )}
                    <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-900">
                      {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={apt.status} />
                    {apt.durationMinutes && <span className="text-[10px] text-gray-400">{apt.durationMinutes} min</span>}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 truncate">{apt.patientName ?? 'Patient'}</span>
                    </div>
                    {apt.patientPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <a href={`tel:${apt.patientPhone}`} className="text-[11px] text-brand-600 underline">
                          {apt.patientPhone}
                        </a>
                      </div>
                    )}
                    {apt.facilityName && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-[11px] text-gray-500 truncate">{apt.facilityName}</span>
                      </div>
                    )}
                    {apt.reason && (
                      <p className="line-clamp-1 text-[11px] italic text-gray-400">« {apt.reason} »</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {apt.status === 'pending' && (
                    <>
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: apt.id, status: 'confirmed' })}
                        className="rounded-md bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirmer
                      </button>
                      <button
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: apt.id,
                            status: 'cancelled',
                            notes: 'Annulé par le fournisseur',
                          })
                        }
                        className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Refuser
                      </button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => navigate(`/appointment/${apt.id}`)}
                        className="rounded-md bg-brand-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-brand-700"
                      >
                        Voir
                      </button>
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: apt.id, status: 'completed' })}
                        className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Terminer
                      </button>
                    </>
                  )}
                  {apt.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/appointment/${apt.id}`)}
                      className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Voir
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {!filtered.length && (
          <EmptyState icon={CalendarDays} title="Aucun rendez-vous" subtitle="Les rendez-vous apparaîtront ici" />
        )}
      </div>
    </div>
  );
}
