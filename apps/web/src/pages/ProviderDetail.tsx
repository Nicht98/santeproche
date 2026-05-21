import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, CalendarPlus } from 'lucide-react';
import { useProvider } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { Card, LoadingScreen, ErrorBanner } from '../components/ui';

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, error, refetch } = useProvider(id!);

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <div className="p-4"><ErrorBanner message={(error as Error)?.message} onRetry={refetch} /></div>;

  const p = data.data;

  const handleBook = () => {
    if (isAuthenticated) navigate(`/book?provider=${id}`);
    else navigate('/login');
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
            <p className="text-sm text-brand-100">{p.specialty ?? p.role}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {p.facilityName && (
          <Card className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium">{p.facilityName}</p>
              <p className="text-xs text-gray-500">Adresse complète indisponible</p>
            </div>
          </Card>
        )}

        {p.bio && (
          <Card>
            <h3 className="text-sm font-semibold">À propos</h3>
            <p className="mt-1 text-xs text-gray-600">{p.bio}</p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleBook}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
          >
            <CalendarPlus className="h-4 w-4" />
            Prendre RDV
          </button>
          <a
            href={`tel:${p.phone}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm border"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </a>
        </div>
      </div>
    </div>
  );
}
