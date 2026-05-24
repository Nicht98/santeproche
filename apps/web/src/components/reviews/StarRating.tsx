import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  className?: string;
}

export function StarRating({ rating, size = 16, className = '' }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < fullStars) {
          return (
            <Star key={i} size={size} className="fill-amber-400 text-amber-400" strokeWidth={1.5} />
          );
        }
        if (i === fullStars && hasHalf) {
          return (
            <div key={i} className="relative" style={{ width: size, height: size }}>
              <Star size={size} className="absolute inset-0 text-gray-200" strokeWidth={1.5} />
              <div className="absolute inset-0 overflow-hidden" style={{ width: size / 2 }}>
                <Star size={size} className="fill-amber-400 text-amber-400" strokeWidth={1.5} />
              </div>
            </div>
          );
        }
        return (
          <Star key={i} size={size} className="text-gray-200" strokeWidth={1.5} />
        );
      })}
    </div>
  );
}

interface InteractiveStarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  className?: string;
}

export function InteractiveStarRating({ value, onChange, size = 28, className = '' }: InteractiveStarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const isActive = starValue <= (hover || value);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              size={size}
              className={isActive ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
