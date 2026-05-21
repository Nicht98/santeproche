import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useCreateAppointment } from '../hooks/api';
import { Card } from '../components/ui';

export function Booking() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const providerId = params.get('provider');

  const create = useCreateAppointment();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [facilityId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    const scheduledAt = new Date(`${date}T${time}:00`);
    create.mutate(
      { providerId: providerId || '', facilityId: facilityId || undefined, scheduledAt: scheduledAt.toISOString(), reason: reason || undefined },
      {
        onSuccess: () => {
          navigate('/appointments');
        },
      }
    );
  };

  const inputCls = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-lg font-bold text-gray-900">Prendre un rendez-vous</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Date</span>
            <input type="date" className={inputCls} value={date} onChange={e=>setDate(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Heure</span>
            <input type="time" className={inputCls} value={time} onChange={e=>setTime(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Motif</span>
            <textarea
              className={inputCls}
              rows={3}
              value={reason}
              onChange={e=>setReason(e.target.value)}
              placeholder="Consultation, contrôle, etc."
            />
          </label>

          <button
            type="submit"
            disabled={create.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {create.isPending ? 'Création…' : 'Confirmer'}
          </button>
          {create.isError && <p className="text-xs text-red-600">{(create.error as Error)?.message}</p>}
        </form>
      </Card>
    </div>
  );
}
