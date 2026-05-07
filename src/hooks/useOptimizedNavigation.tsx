import { useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationOptions {
  preloadDelay?: number;
  enablePreload?: boolean;
  enableTransition?: boolean;
  cacheSize?: number;
}

export const useOptimizedNavigation = (options: NavigationOptions = {}) => {
  const navigate = useNavigate();
  const preloadTimer = useRef<NodeJS.Timeout>();
  const preloadCache = useRef<Set<string>>(new Set());
  const transitionInProgress = useRef(false);

  const {
    preloadDelay = 500,
    enablePreload = true,
    enableTransition = true,
    cacheSize = 50
  } = options;

  // تحسين التنقل - بدون تأخير للاستجابة الفورية
  const optimizedNavigate = useCallback((path: string, immediate = false) => {
    if (transitionInProgress.current && !immediate) return;

    transitionInProgress.current = true;
    
    // التنقل فوراً بدون تأخير
    navigate(path);
    
    // إزالة علامة التنقل بعد فترة قصيرة
    requestAnimationFrame(() => {
      transitionInProgress.current = false;
    });
  }, [navigate]);

  // تحميل مسبق ذكي للصفحات
  const preloadPage = useCallback((path: string) => {
    if (!enablePreload || preloadCache.current.has(path)) return;

    if (preloadCache.current.size >= cacheSize) {
      // مسح أقدم مدخل في الكاش
      const firstItem = preloadCache.current.values().next().value;
      preloadCache.current.delete(firstItem);
    }

    preloadCache.current.add(path);
    
    // محاكاة تحميل مسبق
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);
    
    // إزالة الرابط بعد فترة
    setTimeout(() => {
      document.head.removeChild(link);
    }, 5000);
  }, [enablePreload, cacheSize]);

  // معالج hover مع تأخير للتحميل المسبق
  const handleHover = useCallback((path: string) => {
    if (!enablePreload) return;

    preloadTimer.current = setTimeout(() => {
      preloadPage(path);
    }, preloadDelay);
  }, [preloadPage, preloadDelay, enablePreload]);

  // معالج leave لإلغاء التحميل المسبق
  const handleLeave = useCallback(() => {
    if (preloadTimer.current) {
      clearTimeout(preloadTimer.current);
    }
  }, []);

  // تنظيف عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (preloadTimer.current) {
        clearTimeout(preloadTimer.current);
      }
    };
  }, []);

  return {
    optimizedNavigate,
    preloadPage,
    handleHover,
    handleLeave,
    isTransitioning: transitionInProgress.current
  };
};