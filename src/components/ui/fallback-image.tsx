import React, { useState, useCallback } from 'react';
import { useFileErrorReporter } from '@/hooks/useFileErrorReporter';
import { Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface FallbackImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  bookId?: string;
  imageType?: 'cover' | 'author_image';
  fallbackSrc?: string;
  showMissingIndicator?: boolean;
}

export const FallbackImage: React.FC<FallbackImageProps> = ({
  bookId,
  imageType = 'cover',
  fallbackSrc,
  showMissingIndicator = false,
  src,
  alt,
  className = '',
  ...props
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [hasReported, setHasReported] = useState(false);
  const { reportImageError } = useFileErrorReporter();

  const handleError = useCallback(async (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;

    // إعادة المحاولة عدة مرات مع تأخير متزايد (الفشل غالباً بسبب الإنترنت)
    // لا نستبدل الصورة الأصلية أبداً ولا نسجلها كمفقودة بناءً على فشل العميل
    const retryCount = parseInt(img.dataset.retryCount || '0', 10);
    const maxRetries = 5;
    if (retryCount < maxRetries && src && !src.includes('placeholder')) {
      img.dataset.retryCount = String(retryCount + 1);
      const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s, 8s, 16s
      const sep = src.includes('?') ? '&' : '?';
      setTimeout(() => { img.src = `${src}${sep}_retry=${Date.now()}`; }, delay);
      return;
    }

    // بعد فشل كل المحاولات: نُظهر مؤشر تحميل بدلاً من حذف الصورة
    // ولا نسجل أي شيء في قاعدة البيانات - الصورة الأصلية تبقى كما هي
    setImageState('error');
    img.onerror = null;
  }, [bookId, imageType, src, hasReported, reportImageError, fallbackSrc]);

  const handleLoad = useCallback(() => {
    setImageState('loaded');
  }, []);

  // إذا كانت الصورة مفقودة وأردنا عرض مؤشر
  if (imageState === 'error' && showMissingIndicator) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center ${className}`}>
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <span className="text-sm text-gray-500 text-center px-2">
          {imageType === 'cover' ? 'صورة الغلاف مفقودة' : 'صورة المؤلف مفقودة'}
        </span>
        {bookId && (
          <span className="text-xs text-gray-400 mt-1">
            تم الإبلاغ للإدارة
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};