import { Star } from 'lucide-react';
import { StarRating } from './StarRating';
import type { ReviewSummary } from '../../lib/api';

export function ScoreBreakdown({ summary }: { summary: ReviewSummary }) {
  if (!summary || summary.total === 0) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-extrabold text-gray-900">
            {summary.average?.toFixed(1) ?? '—'}
          </span>
          <StarRating rating={summary.average ?? 0} size={18} />
          <span className="mt-1 text-xs text-gray-400">{summary.total} évaluation{summary.total !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star as keyof typeof summary.distribution] ?? 0;
            const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-3 text-[10px] font-semibold text-gray-500">{star}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[10px] tabular-nums text-gray-400">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-50 pt-3">
        <AttrRow label="Propreté" value={summary.attributes.cleanliness} />
        <AttrRow label="Accueil" value={summary.attributes.staffFriendliness} />
        <AttrRow label="Temps d'attente" value={summary.attributes.waitTime} />
        <AttrRow label="Qualité-prix" value={summary.attributes.valueForMoney} />
        <AttrRow label="Équipement" value={summary.attributes.equipmentQuality} />
      </div>
    </div>
  );
}

function AttrRow({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <StarRating rating={value} size={12} />
        <span className="text-xs font-bold text-gray-800">{value.toFixed(1)}</span>
      </div>
    </div>
  );
}

export function ReviewBadge({ count, average }: { count: number; average?: number | null }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="text-[10px] font-bold text-amber-700">
        {(average ?? 0).toFixed(1)}
      </span>
      <span className="text-[10px] text-gray-400">({count})</span>
    </div>
  );
}
