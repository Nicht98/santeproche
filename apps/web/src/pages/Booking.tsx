import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarPlus, ArrowLeft } from 'lucide-react';
import { useProvider } from '../hooks/api';
import { useAvailableSlots, useCreateAppointment } from '../hooks/api';
import { Card, LoadingScreen, ErrorBanner } from '../components/ui';

export function Booking() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const providerId = params.get('provider') || '';

  const { data: providerData, isLoading: pLoading } = useProvider(providerId);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const { data: slotsData, isLoading: sLoading, error: sError } = useAvailableSlots(providerId, date);
  const create = useCreateAppointment();

  if (pLoading) return <LoadingScreen />;

  const provider = providerData?.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    const scheduledAt = new Date(`${date}T${time}:00`);
    create.mutate(
      {
        providerId,
        facilityId: provider?.facilityId || undefined,
        scheduledAt: scheduledAt.toISOString(),
        reason: reason || undefined,
      },
      {
        onSuccess: () => navigate('/appointments'),
      }
    );
  };

  const inputCls = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500';

  return (
    <div className="space-y-3 p-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <h1 className="text-lg font-bold text-gray-900">Prendre un rendez-vous</h1>

      {provider && (
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <span className="text-sm font-bold">{(provider.displayName ?? '?').slice(0, 1).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{provider.displayName ?? 'Sans nom'}</p>
            <p className="text-xs text-gray-500">{provider.specialty ?? provider.role}{provider.facilityName ? ` · ${provider.facilityName}` : ''}</p>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Date</span>
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => { setDate(e.target.value); setTime(''); }}
                required
              />
            </label>
          </div>

          {/* Slot picker */}
          {date && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Créneaux disponibles</p>
              {sLoading && <p className="text-xs text-gray-400">Chargement…</p>}
              {sError && <ErrorBanner message={(sError as Error)?.message} />}
              {slotsData && (
                <div className="grid grid-cols-3 gap-2">
                  {slotsData.slots.filter((s) => s.available).map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => setTime(s.time)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium ${
                        time === s.time
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                  {slotsData.slots.filter((s) => s.available).length === 0 && (
                    <p className="col-span-3 text-center text-xs text-gray-400">Aucun créneau disponible ce jour.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Motif</span>
            <textarea
              className={inputCls}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Consultation, contrôle, etc."
            />
          </label>

          <button
            type="submit"
            disabled={create.isPending || !time}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" />
            {create.isPending ? 'Création…' : 'Confirmer le rendez-vous'}
          </button>
          {create.isError && <p className="text-xs text-red-600">{(create.error as Error)?.message}</p>}
        </form>
      </Card>
    </div>
  );
}
