import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Calendar, Circle } from 'lucide-react';
import { useMyAppointments, useCancelAppointment } from '../hooks/api';
import { Card, LoadingScreen, EmptyState } from '../components/ui';
import { formatError } from '../lib/errors';
import type { Appointment } from '../lib/api';

function StatusBadge({ status }: { status: Appointment['status'] }) {
  const map: Record<Appointment['status'], { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'En attente' },
    confirmed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Confirmé' },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'En cours' },
    completed: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Terminé' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Annulé' },
    no_show: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Absent' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
      <Circle className="mr-1 h-2 w-2" />
      {s.label}
    </span>
  );
}

export function Appointments() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useMyAppointments();
  const cancel = useCancelAppointment();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'past'>('all');

  if (isLoading) return <LoadingScreen />;

  const list = data?.data ?? [];
  const now = new Date();

  const filtered = list.filter((a) => {
    if (filter === 'pending') return a.status === 'pending' || a.status === 'confirmed';
    if (filter === 'past') return a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show';
    return true;
  }).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());


  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Mes rendez-vous</h1>
        <button
          onClick={() => navigate('/book')}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Nouveau
        </button>
      </div>

      <div className="flex gap-2">
        {(['all','pending','past'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === k ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {k === 'all' ? 'Tous' : k === 'pending' ? 'À venir' : 'Passés'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{formatError(error)}</div>}

      <div className="space-y-2 pb-6">
        {filtered.map((apt) => {
          const date = new Date(apt.scheduledAt);
          const isPast = date < now;
          return (
            <Card
              key={apt.id}
              className={`${isPast && apt.status === 'confirmed' ? 'opacity-60' : ''}`}
              onClick={() => navigate(`/appointment/${apt.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-900">
                      {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs text-gray-500">{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={apt.status} />
                    {apt.reason && <span className="text-[10px] text-gray-400 truncate">{apt.reason}</span>}
                  </div>
                  {apt.rescheduleReason && (
                    <p className="mt-1 text-[10px] text-amber-600">Reprogrammé : {apt.rescheduleReason}</p>
                  )}
                </div>

                {['pending','confirmed'].includes(apt.status) && !isPast && (
                  <button
                    disabled={cancel.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Annuler ce rendez-vous ?')) cancel.mutate({ id: apt.id });
                    }}
                    className="ml-2 rounded border px-2 py-1 text-[10px] text-red-600 hover:bg-red-50"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </Card>
          );
        })}
        {!filtered.length && <EmptyState icon={CalendarPlus} title="Aucun rendez-vous" subtitle="Prenez votre premier rendez-vous" />}
      </div>
    </div>
  );
}
