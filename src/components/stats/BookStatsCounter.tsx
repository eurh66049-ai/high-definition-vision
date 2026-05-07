import React, { useState, useEffect, useMemo } from 'react';
import { useBooksCount } from '@/hooks/useBooksCount';
import { toLatinDigits } from '@/utils/numberUtils';

interface BookStatsCounterProps {
  className?: string;
}

export const BookStatsCounter: React.FC<BookStatsCounterProps> = React.memo(({ className }) => {
  const { totalBooks, loading, error } = useBooksCount();
  const [displayCount, setDisplayCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // تأثير العد التصاعدي المحسّن باستخدام requestAnimationFrame
  useEffect(() => {
    if (!loading && totalBooks > 0) {
      setIsAnimating(true);
      const duration = 1000; // 1 ثانية
      const startTime = Date.now();
      let animationId: number;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // استخدام easing function للحركة السلسة
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(totalBooks * easeOutQuart);
        
        setDisplayCount(currentValue);
        
        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          setDisplayCount(totalBooks);
          setIsAnimating(false);
        }
      };
      
      animationId = requestAnimationFrame(animate);
      
      // تنظيف العداد عند إلغاء المكون
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, [totalBooks, loading]);

  // تحسين الأداء بحفظ القيم المحسوبة
  const formattedCount = useMemo(() => 
    toLatinDigits(displayCount.toString()), 
    [displayCount]
  );

  const subtitleText = useMemo(() => {
    if (loading) return 'جاري العد...';
    if (error) return 'تعذر جلب العدد';
    return 'كتاب متاح';
  }, [loading, error]);

  const mainText = useMemo(() => {
    if (loading) return '…';
    if (error) return '—';
    return formattedCount;
  }, [loading, error, formattedCount]);

  return (
    <div className={`flex items-center justify-center min-h-[92px] ${className ?? ''}`.trim()}>
      <div className="text-center">
        <div
          className={`text-3xl md:text-4xl font-bold tabular-nums transition-all duration-500 ease-out ${
            isAnimating ? 'text-yellow-400' : 'text-white'
          }`}
          style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
            letterSpacing: '0.02em',
            transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
          }}
          aria-live="polite"
        >
          {mainText}
        </div>

        <div
          className="text-gray-300 text-lg"
          style={{
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            // تثبيت الارتفاع لتجنب CLS عند تبدّل النص
            minHeight: '1.75rem',
          }}
        >
          {subtitleText}
        </div>
      </div>
    </div>
  );
});