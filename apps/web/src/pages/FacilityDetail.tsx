import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Stethoscope, Pill, Navigation } from 'lucide-react';
import { useFacility } from '../hooks/api';
import { Card, LoadingScreen, ErrorBanner } from '../components/ui';

export function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useFacility(id!);

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <div className="p-4"><ErrorBanner message={(error as Error)?.message} onRetry={refetch} /></div>;

  const f = data.data;
  const iconMap: Record<string, typeof Pill> = { pharmacy: Pill, hospital: Stethoscope, clinic: Stethoscope };
  const Icon = iconMap[f.type] || MapPin;

  return (
    <div className="space-y-3">
      <div className="bg-brand-600 px-4 py-4">
        <button onClick={() => navigate(-1)} className="mb-2 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{f.name}</h1>
            <p className="text-sm text-brand-100 capitalize">{f.type === 'pharmacy' ? 'Pharmacie' : f.type === 'hospital' ? 'Hôpital' : f.type === 'clinic' ? 'Clinique' : f.type}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        <Card className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium">{f.address ?? 'Adresse non précisée'}</p>
            <p className="text-xs text-gray-500">{f.city ?? ''}</p>
          </div>
        </Card>

        {f.phone && (
          <Card className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <a href={`tel:${f.phone}`} className="text-sm font-medium text-brand-600">{f.phone}</a>
          </Card>
        )}

        {f.lat && f.lng && (
          <a
            href={`https://maps.google.com/?q=${f.lat},${f.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm border"
          >
            <Navigation className="h-4 w-4" />
            Ouvrir dans Maps
          </a>
        )}
      </div>
    </div>
  );
}
