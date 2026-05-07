import React from 'react';
import { Star } from 'lucide-react';

interface OptimizedStarRatingProps {
  rating: number;
  totalReviews?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export const OptimizedStarRating: React.FC<OptimizedStarRatingProps> = ({ 
  rating, 
  totalReviews = 0, 
  size = 'sm',
  showCount = true 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const displayRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-row-reverse items-center" dir="ltr">
        {Array.from({ length: 5 }, (_, index) => {
          const fillPercent = Math.max(0, Math.min(100, (displayRating - index) * 100));

          return (
            <span key={index} className="relative inline-block shrink-0" dir="ltr">
              <Star className={`${sizeClasses[size]} text-gray-300 fill-gray-300`} />
              <span
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillPercent}%`, right: 0, left: 'auto' }}
              >
                <Star className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400 absolute top-0 right-0`} />
              </span>
            </span>
          );
        })}
      </div>
      
      {showCount && (
        <span className={`${textSizeClasses[size]} text-muted-foreground`}>
          ({totalReviews})
        </span>
      )}
    </div>
  );
};