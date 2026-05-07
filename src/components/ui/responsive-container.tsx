
import React from 'react';
import { cn } from '@/lib/utils';
import { useEnhancedResponsive } from '@/hooks/use-enhanced-responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'page' | 'content' | 'card' | 'modal' | 'section';
  enableSafeArea?: boolean;
  adaptToKeyboard?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  variant = 'content',
  enableSafeArea = false,
  adaptToKeyboard = true
}) => {
  const responsive = useEnhancedResponsive();
  
  const getVariantClasses = () => {
    const baseClasses = [
      'w-full',
      'transition-all duration-300 ease-out',
      responsive.shouldOptimizeTouch && 'touch-manipulation',
      responsive.shouldOptimizeDPI && 'antialiased subpixel-antialiased'
    ].filter(Boolean);
    
    switch (variant) {
      case 'page':
        return cn(
          ...baseClasses,
          'min-h-screen',
          responsive.getAdaptivePadding('lg'),
          'max-w-xs xs:max-w-sm sm:max-w-full md:max-w-full lg:max-w-7xl mx-auto',
          responsive.shouldShowBottomNav && 'pb-20 xs:pb-24 sm:pb-28 md:pb-0',
          enableSafeArea && [
            'pt-safe-top pb-safe-bottom',
            'pl-safe-left pr-safe-right'
          ],
          adaptToKeyboard && 'keyboard-adapt'
        );
        
      case 'content':
        return cn(
          ...baseClasses,
          'mx-auto',
          responsive.getAdaptivePadding('md'),
          'max-w-7xl'
        );
        
      case 'section':
        return cn(
          ...baseClasses,
          responsive.getAdaptivePadding('lg'),
          'max-w-6xl mx-auto'
        );
        
      case 'card':
        return cn(
          ...baseClasses,
          'rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl',
          responsive.getAdaptivePadding('md'),
          'bg-card border border-border',
          'shadow-sm xs:shadow sm:shadow-md md:shadow-lg lg:shadow-xl',
          responsive.isHighDPI && 'shadow-2xl'
        );
        
      case 'modal':
        return cn(
          ...baseClasses,
          'mx-auto',
          'max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl',
          responsive.getAdaptivePadding('md')
        );
        
      default:
        return cn(...baseClasses);
    }
  };

  if (responsive.isLoading) {
    return (
      <div className="w-full h-20 bg-muted animate-pulse rounded-lg" />
    );
  }

  return (
    <div 
      className={cn(getVariantClasses(), className)}
      style={{
        // تحسينات الأداء والجودة
        WebkitFontSmoothing: responsive.isHighDPI ? 'antialiased' : 'auto',
        MozOsxFontSmoothing: responsive.isHighDPI ? 'grayscale' : 'auto',
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        // تحسين للشاشات عالية الدقة
        imageRendering: responsive.isHighDPI ? 'crisp-edges' : 'auto'
      }}
    >
      {children}
    </div>
  );
};
