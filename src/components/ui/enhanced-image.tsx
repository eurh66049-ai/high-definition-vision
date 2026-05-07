import React, { useState, useCallback } from 'react';
import { useFileErrorReporter } from '@/hooks/useFileErrorReporter';

interface EnhancedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  bookId?: string;
  imageType?: 'cover' | 'author_image';
  fallbackSrc?: string;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const EnhancedImage: React.FC<EnhancedImageProps> = ({
  bookId,
  imageType = 'cover',
  fallbackSrc,
  onError,
  src,
  alt,
  className,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const { createImageErrorHandler } = useFileErrorReporter();

  const handleError = useCallback(async (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (hasError || isReporting) return; // تجنب التكرار
    
    setHasError(true);
    setIsReporting(true);
    
    try {
      // تسجيل الخطأ إذا كان لدينا bookId
      if (bookId && imageType) {
        const errorHandler = createImageErrorHandler(bookId, imageType);
        await errorHandler(event);
      }
      
      // استدعاء معالج الخطأ المخصص إذا وُجد
      if (onError) {
        onError(event);
      } else {
        // تعيين صورة بديلة
        const img = event.currentTarget;
        const defaultFallback = imageType === 'cover' 
          ? '/src/assets/default-book-cover.png'
          : '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png';
        
        img.src = fallbackSrc || defaultFallback;
        img.onerror = null; // منع التكرار
      }
    } catch (err) {
      console.error('خطأ في معالجة خطأ الصورة:', err);
    } finally {
      setIsReporting(false);
    }
  }, [hasError, isReporting, bookId, imageType, createImageErrorHandler, onError, fallbackSrc]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleError}
      {...props}
    />
  );
};