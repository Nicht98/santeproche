import { useState } from 'react';
import { CheckCircle2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { StarRating } from './StarRating';
import type { Review } from '../../lib/api';

interface ReviewCardProps {
  review: Review;
  canDelete?: boolean;
  onDelete?: () => void;
}

export function ReviewCard({ review, canDelete, onDelete }: ReviewCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const date = new Date(review.createdAt);
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const hasAttributes =
    review.cleanliness != null ||
    review.staffFriendliness != null ||
    review.waitTime != null ||
    review.valueForMoney != null ||
    review.equipmentQuality != null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
            {review.reviewerName?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.reviewerName ?? 'Utilisateur'}</p>
            <div className="flex items-center gap-1.5">
              <StarRating rating={review.rating} size={14} />
              <span className="text-xs text-gray-400">{dateStr}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {review.isVerifiedVisit && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Visité
            </span>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-full p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {review.comment && (
        <p className="mt-2.5 text-sm leading-relaxed text-gray-700">{review.comment}</p>
      )}

      {hasAttributes && (
        <>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Masquer les détails
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Détails de l'évaluation
              </>
            )}
          </button>

          {showDetails && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-gray-50 p-3">
              {review.cleanliness != null && (
                <ScoreRow label="Propreté" value={review.cleanliness} />
              )}
              {review.staffFriendliness != null && (
                <ScoreRow label="Accueil" value={review.staffFriendliness} />
              )}
              {review.waitTime != null && (
                <ScoreRow label="Temps d'attente" value={review.waitTime} />
              )}
              {review.valueForMoney != null && (
                <ScoreRow label="Rapport qualité-prix" value={review.valueForMoney} />
              )}
              {review.equipmentQuality != null && (
                <ScoreRow label="Équipement" value={review.equipmentQuality} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        <StarRating rating={value} size={12} />
        <span className="text-xs font-semibold text-gray-700">{value}</span>
      </div>
    </div>
  );
}
