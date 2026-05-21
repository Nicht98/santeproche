import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Stethoscope, Building2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAppointment, useCancelAppointment, useUpdateAppointmentStatus } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { Card, LoadingScreen, ErrorBanner } from '../components/ui';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'En attente' },
    confirmed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Confirmé' },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'En cours' },
    completed: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Terminé' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Annulé' },
    no_show: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Absent' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userRole = useAuthStore((s) => s.user?.role);
  const { data, isLoading, error, refetch } = useAppointment(id!);
  const cancel = useCancelAppointment();
  const update = useUpdateAppointmentStatus();

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <div className="p-4"><ErrorBanner message={(error as Error)?.message} onRetry={refetch} /></div>;

  const a = data.data;
  const date = new Date(a.scheduledAt);
  const isPast = date < new Date();
  const canCancel = ['pending', 'confirmed'].includes(a.status) && !isPast;
  const isProvider = userRole === 'doctor' || userRole === 'clinic_admin';

  const handleCancel = () => {
    const reason = prompt('Motif d\'annulation (optionnel) :');
    if (reason === null) return;
    cancel.mutate({ id: a.id, reason: reason || undefined }, { onSuccess: () => refetch() });
  };

  const handleReschedule = () => {
    const newDate = prompt('Nouvelle date et heure (YYYY-MM-DD HH:MM) :');
    if (!newDate) return;
    const iso = newDate.replace(' ', 'T') + ':00Z';
    update.mutate(
      { id: a.id, status: a.status, newScheduledAt: iso, rescheduleReason: 'Demande de reprogrammation' },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <div className="space-y-3">
      <div className="bg-brand-600 px-4 py-4">
        <button onClick={() => navigate(-1)} className="mb-2 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-white">Rendez-vous</h1>
        <div className="mt-2"><StatusBadge status={a.status} /></div>
      </div>

      <div className="px-4 space-y-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm font-medium">{date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Heure</p>
              <p className="text-sm font-medium">{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          {a.durationMinutes && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Durée</p>
                <p className="text-sm font-medium">{a.durationMinutes} minutes</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Professionnel</p>
              <p className="text-sm font-medium">{a.providerName || 'Non assigné'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Établissement</p>
              <p className="text-sm font-medium">{a.facilityName || 'Non précisé'}</p>
            </div>
          </div>
        </Card>

        {a.reason && (
          <Card>
            <p className="text-xs text-gray-500">Motif</p>
            <p className="text-sm text-gray-800">{a.reason}</p>
          </Card>
        )}

        {a.notes && (
          <Card>
            <p className="text-xs text-gray-500">Notes</p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{a.notes}</p>
          </Card>
        )}

        {a.rescheduleReason && (
          <Card className="bg-amber-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Reprogrammation</p>
                <p className="text-xs text-amber-700">{a.rescheduleReason}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        {canCancel && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleCancel}
              disabled={cancel.isPending}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Annuler
            </button>
            <button
              onClick={handleReschedule}
              disabled={update.isPending}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reprogrammer
            </button>
          </div>
        )}

        {isProvider && a.status === 'pending' && (
          <button
            onClick={() => update.mutate({ id: a.id, status: 'confirmed' }, { onSuccess: () => refetch() })}
            disabled={update.isPending}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Confirmer le rendez-vous
          </button>
        )}
      </div>
    </div>
  );
}
