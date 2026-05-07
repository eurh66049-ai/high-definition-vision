import { useEffect, useRef, useCallback } from 'react';
import { throttle } from '@/utils/scrollUtils';

interface UsePerformantScrollOptions {
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  threshold?: number;
}

export const usePerformantScroll = ({
  onLoadMore,
  hasMore = true,
  loading = false,
  threshold = 800
}: UsePerformantScrollOptions) => {
  const loadingRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // دالة throttled للتحقق من التمرير
  const checkScroll = useCallback(
    throttle(() => {
      if (!onLoadMore || !hasMore || loading || isLoadingRef.current) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // تحقق من وصول المستخدم قرب نهاية الصفحة
      if (scrollTop + windowHeight >= documentHeight - threshold) {
        isLoadingRef.current = true;
        onLoadMore();
        
        // إعادة تعيين الحالة بعد تأخير قصير
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 1000);
      }
    }, 250),
    [onLoadMore, hasMore, loading, threshold]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('scroll', checkScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  return { loadingRef };
};