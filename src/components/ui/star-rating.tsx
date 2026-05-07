import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  totalReviews?: number;
  size?: 'sm' | 'md' | 'lg';
  showRating?: boolean;
  showReviewCount?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  totalReviews = 0,
  size = 'sm',
  showRating = true,
  showReviewCount = true,
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const renderStars = () => {
    const displayRating = Math.max(0, Math.min(5, Number(rating) || 0));

    return Array.from({ length: 5 }, (_, index) => {
      const fillPercent = Math.max(0, Math.min(100, (displayRating - index) * 100));

      return (
        <span key={index} className="relative inline-block shrink-0" dir="ltr">
          <Star
            className={cn(
              sizeClasses[size],
              "text-gray-300 fill-gray-300"
            )}
          />
          <span
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{
              width: `${fillPercent}%`,
              right: 0,
              left: 'auto',
            }}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "fill-red-500 text-red-500 absolute top-0 right-0"
              )}
            />
          </span>
        </span>
      );
    });
  };

  return (
    <div className={cn("flex items-center justify-center gap-1 flex-nowrap whitespace-nowrap min-w-0", className)}>
      <div className="flex items-center flex-row-reverse shrink-0" dir="ltr">
        {renderStars()}
      </div>
      
      {showRating && rating > 0 && (
        <span className={cn(
          "text-muted-foreground font-medium ml-1 shrink-0 whitespace-nowrap leading-none",
          textSizeClasses[size]
        )}>
          {rating.toFixed(1)}
        </span>
      )}
      
      {showReviewCount && totalReviews > 0 && (
        <span className={cn(
          "text-muted-foreground ml-1 shrink-0 whitespace-nowrap leading-none",
          textSizeClasses[size]
        )}>
          ({totalReviews})
        </span>
      )}
      
      {/* عرض النجوم الفارغة مع نص "لا توجد تقييمات" للكتب بدون تقييمات */}
      {showReviewCount && totalReviews === 0 && (
        <span className={cn(
          "text-muted-foreground ml-1 shrink-0 whitespace-nowrap leading-none",
          textSizeClasses[size]
        )}>
          (لا توجد تقييمات)
        </span>
      )}
    </div>
  );
};