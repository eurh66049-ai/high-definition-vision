
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAdaptiveLayout } from '@/hooks/use-mobile';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'wide';
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className,
  containerClassName,
  aspectRatio = 'portrait',
  priority = false,
  placeholder = 'empty',
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const layout = useAdaptiveLayout();
  
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'portrait':
        return 'aspect-[3/4]';
      case 'landscape':
        return 'aspect-[4/3]';
      case 'wide':
        return 'aspect-[16/9]';
      default:
        return 'aspect-[3/4]';
    }
  };
  
  const getContainerClasses = () => {
    return cn(
      'relative overflow-hidden',
      'rounded-lg xs:rounded-xl sm:rounded-2xl',
      'bg-muted',
      getAspectRatioClasses(),
      // تحسين للشاشات عالية الدقة
      layout.isHighDPI && 'shadow-lg',
      containerClassName
    );
  };
  
  const getImageClasses = () => {
    return cn(
      'w-full h-full object-cover',
      'transition-all duration-500 ease-out',
      isLoading && 'scale-110 blur-sm',
      !isLoading && 'scale-100 blur-0',
      hasError && 'opacity-50',
      // تحسين للشاشات عالية الدقة
      layout.isHighDPI && 'image-rendering-optimizeQuality',
      className
    );
  };
  
  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };
  
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };
  
  return (
    <div className={getContainerClasses()}>
      {isLoading && placeholder === 'blur' && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
      )}
      
      <img
        src={src}
        alt={alt}
        className={getImageClasses()}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          imageRendering: layout.isHighDPI ? 'auto' : 'auto'
        }}
      />
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-xs xs:text-sm font-medium">
            فشل في تحميل الصورة
          </span>
        </div>
      )}
    </div>
  );
};
