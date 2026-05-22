import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, CalendarPlus, MessageCircle, Clock, Building2, FileText, Briefcase } from 'lucide-react';
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
  if (error || !data || !data.data) return <div className="p-4"><ErrorBanner error={error} onRetry={refetch} /></div>;

  const p = data.data;

  const handleBook = () => {
    if (isAuthenticated) navigate(`/book?provider=${id}`);
    else navigate('/login');
  };

  const handleChat = () => {
    if (!isAuthenticated || !id) return navigate('/login');
    startChat.mutate(
      { providerId: id, title: p.displayName || 'Conversation' },
      {
        onSuccess: (res) => {
          navigate(`/chat?conversation=${res.conversation.id}`);
        },
        onError: (err: any) => {
          if (err?.code === 'CONVERSATION_EXISTS' && err?.extra?.conversationId) {
            navigate(`/chat?conversation=${err.extra.conversationId}`);
          }
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
          <Card className="flex items-start gap-3 !py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              <MapPin className="h-5 w-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{p.facilityName}</p>
              <p className="text-xs text-slate-500">{p.facilityAddress || 'Adresse non précisée'}</p>
              {p.facilityPhone && <p className="mt-0.5 text-[10px] text-slate-400">📞 {p.facilityPhone}</p>}
            </div>
          </Card>
        )}

        {/* Workplace (new fields) */}
        {(p.workplaceName || p.workplaceAddress) && (
          <Card className="flex items-start gap-3 !py-3.5 border-l-4 border-l-brand-400">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              {p.workplaceName && <p className="text-sm font-semibold text-slate-900">{p.workplaceName}</p>}
              {p.workplaceAddress && <p className="text-xs text-slate-500">{p.workplaceAddress}</p>}
              {(p.workplaceLat && p.workplaceLng) && (
                <p className="mt-0.5 text-[10px] text-slate-400">🌐 {Number(p.workplaceLat).toFixed(4)}, {Number(p.workplaceLng).toFixed(4)}</p>
              )}
            </div>
          </Card>
        )}

        {p.resume && (
          <Card className="!p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">CV / Résumé</h3>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{p.resume}</p>
          </Card>
        )}

        {p.experience && (
          <Card className="!p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">Expérience</h3>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{p.experience}</p>
          </Card>
        )}

        {/* Weekly Schedule */}
        {p.schedules && p.schedules.length > 0 && (
          <Card className="!p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">Horaires de consultation</h3>
            </div>
            <div className="space-y-1">
              {p.schedules.filter(Boolean).map((sched) => (
                <div key={sched.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 w-24">{DAY_LABELS[sched.dayOfWeek] ?? sched.dayOfWeek}</span>
                  <span className="text-slate-600">
                    {sched.startTime} → {sched.endTime}
                    <span className="ml-1 text-[10px] text-slate-400">({sched.slotDurationMin} min)</span>
                  </span>
                  {sched.isActive ? (
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {p.bio && (
          <Card className="!p-4">
            <h3 className="text-sm font-semibold text-slate-900">À propos</h3>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{p.bio}</p>
          </Card>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleBook}
            className="btn-primary flex flex-col items-center justify-center gap-1 py-3"
          >
            <CalendarPlus className="h-4 w-4" />
            Prendre RDV
          </button>
          <button
            onClick={handleChat}
            disabled={startChat.isPending}
            className="btn-secondary flex flex-col items-center justify-center gap-1 py-3 disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            {startChat.isPending ? '…' : 'Message'}
          </button>
          <a
            href={`tel:${p.phone}`}
            className="btn-secondary flex flex-col items-center justify-center gap-1 py-3"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </a>
        </div>
      </div>
    </div>
  );
}
