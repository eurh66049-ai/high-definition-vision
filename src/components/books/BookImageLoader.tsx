import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface BookImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  fallbackSrc?: string;
  maxRetries?: number;
  hideRetryButton?: boolean;
  immediateLoad?: boolean;
  optimizedSrc?: string;
  preload?: boolean;
}

// تحسين رابط Supabase - استخدام الرابط المباشر بدون تحويل
const getDirectImageUrl = (url: string): string => {
  if (!url || url === '/placeholder.svg') return url;
  return url;
};

const BookImageLoader: React.FC<BookImageLoaderProps> = ({ 
  src, 
  alt, 
  className = '',
  style,
  onLoad,
  onError,
  priority = false,
  fallbackSrc = '/placeholder.svg',
  maxRetries = 8,
  optimizedSrc,
}) => {
  // Priority images start visible to avoid delaying LCP
  const [isLoaded, setIsLoaded] = useState(priority);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // تحسين مصدر الصورة
  const processedSrc = useMemo(() => {
    const imageSource = optimizedSrc || src;
    
    if (!imageSource || imageSource === 'undefined' || imageSource === 'null' || imageSource.trim() === '') {
      return fallbackSrc;
    }
    
    // archive.org
    if (imageSource.includes('archive.org') && imageSource.includes('BookReader')) {
      return imageSource.includes('scale=') ? imageSource.replace(/scale=\d+/, 'scale=2') : imageSource;
    }
    
    // رفض روابط archive.org التالفة
    if (imageSource.includes('archive.org') && !imageSource.includes('BookReader') && !imageSource.includes('/download/')) {
      return fallbackSrc;
    }
    
    return getDirectImageUrl(imageSource);
  }, [src, optimizedSrc, fallbackSrc]);

  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
    setRetryCount(0);
    onLoad?.();
  }, [onLoad]);

  // نظام إعادة محاولة قوي: لا نستبدل الصورة الأصلية أبداً
  // نعيد المحاولة مع تأخير متزايد (exponential backoff)
  // الصورة الحقيقية موجودة في التخزين - الفشل دائماً مؤقت (إنترنت/CDN)
  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const isRealImage = processedSrc && processedSrc !== fallbackSrc && !processedSrc.includes('placeholder');

    if (!isRealImage) {
      setIsError(true);
      onError?.();
      return;
    }

    if (retryCount < maxRetries) {
      const nextRetry = retryCount + 1;
      // تأخير: 0.5s, 1s, 2s, 4s, 8s, 16s, 30s, 60s
      const delay = Math.min(500 * Math.pow(2, retryCount), 60000);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        setRetryCount(nextRetry);
        const sep = processedSrc.includes('?') ? '&' : '?';
        img.src = `${processedSrc}${sep}_r=${Date.now()}`;
      }, delay);
      return;
    }

    // حتى بعد كل المحاولات: لا نستبدل الصورة بـ placeholder
    // نُبقي العنصر فارغاً مع زر إعادة محاولة يدوية
    setIsError(true);
    onError?.();
  }, [retryCount, maxRetries, processedSrc, fallbackSrc, onError]);

  // إعادة المحاولة تلقائياً عند عودة الإنترنت
  useEffect(() => {
    const handleOnline = () => {
      if (isError && processedSrc && processedSrc !== fallbackSrc) {
        setIsError(false);
        setRetryCount(0);
        if (imgRef.current) {
          const sep = processedSrc.includes('?') ? '&' : '?';
          imgRef.current.src = `${processedSrc}${sep}_online=${Date.now()}`;
        }
      }
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [isError, processedSrc, fallbackSrc]);

  const handleManualRetry = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsError(false);
    setRetryCount(0);
    if (imgRef.current && processedSrc) {
      const sep = processedSrc.includes('?') ? '&' : '?';
      imgRef.current.src = `${processedSrc}${sep}_manual=${Date.now()}`;
    }
  }, [processedSrc]);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <img
        ref={imgRef}
        src={processedSrc}
        alt={alt}
        width={200}
        height={267}
        className={`w-full h-full object-cover transition-opacity duration-150 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        // @ts-ignore
        fetchpriority={priority ? 'high' : 'low'}
      />
      
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-muted/30 rounded-md" />
      )}
      
      {isError && (
        <button
          type="button"
          onClick={handleManualRetry}
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs p-2 rounded-md hover:bg-muted/80 transition-colors"
          aria-label="إعادة تحميل الغلاف"
        >
          <div className="text-center">
            <div className="text-lg mb-1">🔄</div>
            <div>اضغط لإعادة التحميل</div>
          </div>
        </button>
      )}
    </div>
  );
};

export default React.memo(BookImageLoader);
