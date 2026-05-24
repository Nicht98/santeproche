import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { InteractiveStarRating } from './StarRating';
import { useCreateReview } from '../../hooks/api';
import { useAuthStore } from '../../stores/auth';

interface ReviewFormProps {
  facilityId?: string;
  providerId?: string;
  appointmentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ATTRIBUTE_LABELS = [
  { key: 'cleanliness', label: 'Propreté' },
  { key: 'staffFriendliness', label: 'Accueil du personnel' },
  { key: 'waitTime', label: 'Temps d\'attente' },
  { key: 'valueForMoney', label: 'Rapport qualité-prix' },
  { key: 'equipmentQuality', label: 'Qualité de l\'équipement' },
] as const;

export function ReviewForm({ facilityId, providerId, appointmentId, onSuccess, onCancel }: ReviewFormProps) {
  const { isAuthenticated } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showAttr, setShowAttr] = useState(false);
  const [attrs, setAttrs] = useState<Record<string, number>>({});
  const create = useCreateReview();

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
        Connectez-vous pour laisser une évaluation.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) return;

    await create.mutateAsync({
      facilityId,
      providerId,
      appointmentId,
      rating,
      comment: comment || undefined,
      cleanliness: attrs.cleanliness,
      staffFriendliness: attrs.staffFriendliness,
      waitTime: attrs.waitTime,
      valueForMoney: attrs.valueForMoney,
      equipmentQuality: attrs.equipmentQuality,
    });

    setRating(0);
    setComment('');
    setAttrs({});
    setShowAttr(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Écrire une évaluation</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <span className="text-xs text-gray-500">Note globale</span>
        <InteractiveStarRating value={rating} onChange={setRating} size={28} />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAttr((v) => !v)}
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {showAttr ? 'Masquer les critères détaillés' : 'Ajouter des critères détaillés'}
        </button>
      </div>

      {showAttr && (
        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          {ATTRIBUTE_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{label}</span>
              <InteractiveStarRating
                value={attrs[key] ?? 0}
                onChange={(v) => setAttrs((prev) => ({ ...prev, [key]: v }))}
                size={20}
              />
            </div>
          ))}
        </div>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Partagez votre expérience…"
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none focus:border-brand-500"
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{comment.length}/2000</span>
        <button
          type="submit"
          disabled={rating < 1 || create.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {create.isPending ? 'Envoi…' : (
            <>
              <Send className="h-3.5 w-3.5" />
              Publier
            </>
          )}
        </button>
      </div>

      {create.isError && (
        <p className="text-xs text-red-600">{(create.error as any)?.message ?? 'Erreur lors de l\'envoi.'}</p>
      )}
    </form>
  );
}
