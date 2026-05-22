import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Stethoscope, Pill, Search, AlertTriangle, Check, XCircle, Package } from 'lucide-react';
import { useFacility, useFacilityStock } from '../hooks/api';
import { Card, LoadingScreen, ErrorBanner, EmptyState } from '../components/ui';

export function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useFacility(id!);
  const [searchQ, setSearchQ] = useState('');
  const { data: stockData, isLoading: stockLoading } = useFacilityStock(id!, searchQ);

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <div className="p-4"><ErrorBanner message={(error as Error)?.message} onRetry={refetch} /></div>;

  const f = data.data;
  const iconMap: Record<string, typeof Pill> = { pharmacy: Pill, hospital: Stethoscope, clinic: Stethoscope };
  const Icon = iconMap[f.kind] || MapPin;
  const stockList = stockData?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="bg-brand-600 px-4 py-4">
        <button onClick={() => navigate(-1)} className="mb-2 text-white"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2"><Icon className="h-6 w-6 text-white" /></div>
          <div>
            <h1 className="text-lg font-bold text-white">{f.name}</h1>
            <p className="text-sm text-brand-100 capitalize">{f.kind === 'pharmacy' ? 'Pharmacie' : f.kind === 'hospital' ? 'Hôpital' : f.kind === 'clinic' ? 'Clinique' : f.kind}</p>
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
      </div>

      {/* Stock Section */}
      <div className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Disponibilité des médicaments</h2>
          <span className="text-[10px] text-gray-500">{stockList.length} produit{stockList.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Rechercher un médicament..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-2 space-y-2 pb-4">
          {stockLoading && <p className="text-xs text-gray-500 text-center py-4">Chargement...</p>}

          {!stockLoading && !searchQ && stockList.length === 0 && (
            <EmptyState icon={Package} title="Aucun produit" subtitle="Aucun médicament en stock actuellement" />
          )}
          {!stockLoading && !!searchQ && stockList.length === 0 && (
            <EmptyState icon={Package} title="Aucun produit" subtitle={`Aucun résultat pour "${searchQ}"`} />
          )}

          {stockList.map((item: any) => (
            <Card key={item.id} className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-brand-50 p-2">
                {item.is_available && item.is_in_stock ? (
                  <Check className="h-4 w-4 text-brand-600" />
                ) : item.is_available && !item.is_in_stock ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name ?? item.drug_name ?? 'Produit'}</p>
                {item.generic_name && <p className="text-xs text-gray-500 truncate">{item.generic_name}</p>}
                {item.dosage && <p className="text-[10px] text-gray-400">{item.dosage} · {item.form}</p>}
                <div className="mt-0.5 flex items-center gap-2">
                  {item.quantity != null && (
                    <span className={`text-[10px] rounded px-1.5 py-0.5 ${
                      item.is_in_stock ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {item.quantity} en stock
                    </span>
                  )}
                  {item.price_xaf != null && (
                    <span className="text-[10px] text-gray-500">{item.price_xaf} FCFA</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
