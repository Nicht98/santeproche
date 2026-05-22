import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarCheck, Phone, MapPin, Stethoscope, Clock, CheckCircle2, XCircle, User, ChevronRight } from 'lucide-react';
import { useProviderAppointments, useUpdateAppointmentStatus } from '../hooks/api';
import { Card, LoadingScreen, EmptyState } from '../components/ui';
import { formatError } from '../lib/errors';
import type { Appointment } from '../lib/api';
import { useAuthStore } from '../stores/auth';

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string; icon: typeof Clock }> = {
  pending:    { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  label: 'En attente', icon: Clock },
  confirmed:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Confirmé', icon: CalendarCheck },
  in_progress:{ bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   label: 'En cours', icon: Stethoscope },
  completed:  { bg: 'bg-slate-100',  border: 'border-slate-200',  text: 'text-slate-600',  label: 'Terminé', icon: CheckCircle2 },
  cancelled:  { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',    label: 'Annulé', icon: XCircle },
  no_show:    { bg: 'bg-slate-100',  border: 'border-slate-200',  text: 'text-slate-500',  label: 'Absent', icon: User },
};

function StatusBadge({ status }: { status: Appointment['status'] }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${s.border} ${s.bg} px-2.5 py-0.5 text-[11px] font-semibold ${s.text}`}>
      <Icon className="h-3 w-3" /> {s.label}
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
      if (filter === 'upcoming') return aptDate >= todayStr && !['completed','cancelled','no_show'].includes(apt.status);
      if (filter === 'past') return aptDate < todayStr || ['completed','cancelled','no_show'].includes(apt.status);
      return true;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Tableau de bord</h1>
          <p className="text-xs text-slate-500">{user?.displayName ?? 'Agent de santé'} · {list.length} rendez-vous</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {(['today','upcoming','past','all'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
              filter === k ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {k === 'today' ? "Aujourd'hui" : k === 'upcoming' ? 'À venir' : k === 'past' ? 'Passés' : 'Tous'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">{formatError(error)}</div>}

      <div className="space-y-3 pb-6">
        {filtered.map((apt) => {
          const date = new Date(apt.scheduledAt);
          const isToday = apt.scheduledAt.slice(0, 10) === todayStr;
          return (
            <Card key={apt.id} className="!p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isToday && (
                      <span className="badge bg-red-100 text-red-700 border border-red-200">AUJ.</span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={apt.status} />
                    {apt.durationMinutes && <span className="text-[10px] text-slate-400">{apt.durationMinutes} min</span>}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900 truncate">{apt.patientName ?? 'Patient'}</span>
                    </div>
                    {apt.patientPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <a href={`tel:${apt.patientPhone}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">{apt.patientPhone}</a>
                      </div>
                    )}
                    {apt.facilityName && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[11px] text-slate-500 truncate">{apt.facilityName}</span>
                      </div>
                    )}
                    {apt.reason && <p className="line-clamp-1 text-[11px] italic text-slate-400">« {apt.reason} »</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {apt.status === 'pending' && (
                    <>
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: apt.id, status: 'confirmed' })}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Confirmer
                      </button>
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: apt.id, status: 'cancelled', notes: 'Annulé par le soignant' })}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" /> Refuser
                      </button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => navigate(`/appointment/${apt.id}`)}
                        className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-95"
                      >
                        Voir <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: apt.id, status: 'completed' })}
                        className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50"
                      >
                        Terminer <CheckCircle2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {apt.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/appointment/${apt.id}`)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
                    >
                      Voir <ChevronRight className="h-3 w-3" />
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
