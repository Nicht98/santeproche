import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, CalendarPlus, MessageCircle, Clock } from 'lucide-react';
import { useProvider, useStartConversation } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { Card, LoadingScreen, ErrorBanner } from '../components/ui';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, error, refetch } = useProvider(id!);
  const startChat = useStartConversation();

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <div className="p-4"><ErrorBanner error={error} onRetry={refetch} /></div>;

  const p = data.data;

  const handleBook = () => {
    if (isAuthenticated) navigate(`/book?provider=${id}`);
    else navigate('/login');
  };

  const handleChat = () => {
    if (!isAuthenticated || !id) return navigate('/login');
    startChat.mutate(
      { receiverId: id, title: p.displayName || 'Conversation' },
      {
        onSuccess: (res) => {
          navigate(`/chat?conversation=${res.conversation.id}`);
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="bg-brand-600 px-4 py-4">
        <button onClick={() => navigate(-1)} className="mb-2 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white">
            <span className="text-xl font-bold">{(p.displayName ?? '?').slice(0, 1).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{p.displayName ?? 'Sans nom'}</h1>
            <p className="text-sm text-brand-100">{p.jobTitle ?? p.role}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {p.facilityName && (
          <Card className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium">{p.facilityName}</p>
              <p className="text-xs text-gray-500">{p.facilityAddress || 'Adresse non précisée'}</p>
              {p.facilityPhone && <p className="text-[10px] text-gray-400">📞 {p.facilityPhone}</p>}
            </div>
          </Card>
        )}

        {/* Weekly Schedule */}
        {p.schedules && p.schedules.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold">Horaires de consultation</h3>
            </div>
            <div className="space-y-1">
              {p.schedules.map((sched) => (
                <div key={sched.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 w-24">{DAY_LABELS[sched.dayOfWeek] ?? sched.dayOfWeek}</span>
                  <span className="text-gray-600">
                    {sched.startTime} → {sched.endTime}
                    <span className="ml-1 text-[10px] text-gray-400">({sched.slotDurationMin} min)</span>
                  </span>
                  {sched.isActive ? (
                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                  ) : (
                    <span className="inline-flex h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {p.bio && (
          <Card>
            <h3 className="text-sm font-semibold">À propos</h3>
            <p className="mt-1 text-xs text-gray-600">{p.bio}</p>
          </Card>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleBook}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-brand-600 px-2 py-3 text-xs font-semibold text-white"
          >
            <CalendarPlus className="h-4 w-4" />
            Prendre RDV
          </button>
          <button
            onClick={handleChat}
            disabled={startChat.isPending}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white px-2 py-3 text-xs font-semibold text-gray-700 shadow-sm border border-gray-200 disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            {startChat.isPending ? '…' : 'Message'}
          </button>
          <a
            href={`tel:${p.phone}`}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white px-2 py-3 text-xs font-semibold text-gray-700 shadow-sm border border-gray-200"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </a>
        </div>
      </div>
    </div>
  );
}
