
import React from 'react';
import { cn } from '@/lib/utils';
import { useAdaptiveLayout } from '@/hooks/use-mobile';

interface EnhancedResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'page' | 'section' | 'container' | 'card';
  enableSafeArea?: boolean;
  adaptToKeyboard?: boolean;
}

export const EnhancedResponsiveLayout: React.FC<EnhancedResponsiveLayoutProps> = ({
  children,
  className,
  variant = 'container',
  enableSafeArea = true,
  adaptToKeyboard = true
}) => {
  const layout = useAdaptiveLayout();
  
  const getLayoutClasses = () => {
    const baseClasses = [
      'w-full',
      'transition-all duration-300 ease-out',
      layout.isTouch && 'touch-manipulation',
      layout.isHighDPI && 'antialiased',
      adaptToKeyboard && 'keyboard-adapt'
    ].filter(Boolean);
    
    switch (variant) {
      case 'page':
        return cn(
          ...baseClasses,
          'min-h-screen',
          'px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16 4xl:px-20',
          'py-2 xs:py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10 2xl:py-12',
          layout.shouldShowBottomNav && 'pb-20 xs:pb-24 sm:pb-28',
          enableSafeArea && [
            'pt-safe-top pb-safe-bottom',
            'pl-safe-left pr-safe-right'
          ]
        );
        
      case 'section':
        return cn(
          ...baseClasses,
          'px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10',
          'py-3 xs:py-4 sm:py-6 md:py-8 lg:py-10 xl:py-12',
          'max-w-7xl mx-auto'
        );
        
      case 'container':
        return cn(
          ...baseClasses,
          'mx-auto',
          'px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8',
          'max-w-xs xs:max-w-sm sm:max-w-full md:max-w-full lg:max-w-7xl'
        );
        
      case 'card':
        return cn(
          ...baseClasses,
          'rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl',
          'p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8',
          'shadow-sm xs:shadow md:shadow-lg lg:shadow-xl',
          'bg-card border border-border'
        );
        
      default:
        return cn(...baseClasses);
    }
  };

  return (
    <div 
      className={cn(getLayoutClasses(), className)}
      style={{
        // تحسين للشاشات عالية الدقة
        WebkitFontSmoothing: layout.isHighDPI ? 'antialiased' : 'auto',
        MozOsxFontSmoothing: layout.isHighDPI ? 'grayscale' : 'auto',
        // تحسين الأداء
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </div>
  );
};
