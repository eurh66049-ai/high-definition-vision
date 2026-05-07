
import React from 'react';
import { cn } from '@/lib/utils';
import { useAdaptiveLayout } from '@/hooks/use-mobile';
import { Button, ButtonProps } from '@/components/ui/button';

interface AdaptiveButtonProps extends ButtonProps {
  touchOptimized?: boolean;
  highDPIOptimized?: boolean;
}

export const AdaptiveButton: React.FC<AdaptiveButtonProps> = ({
  children,
  className,
  touchOptimized = true,
  highDPIOptimized = true,
  ...props
}) => {
  const layout = useAdaptiveLayout();
  
  const getAdaptiveClasses = () => {
    const baseClasses = [
      'transition-all duration-300 ease-out',
      'transform active:scale-95',
      'font-black text-white'
    ];
    
    // تحسينات اللمس
    if (touchOptimized && layout.isTouch) {
      baseClasses.push(
        'min-h-[44px] min-w-[44px]', // حد أدنى للمس
        'px-4 xs:px-5 sm:px-6 md:px-8',
        'py-3 xs:py-3.5 sm:py-4',
        'text-sm xs:text-base sm:text-lg',
        'touch-manipulation'
      );
    } else {
      baseClasses.push(
        'px-3 xs:px-4 sm:px-5 md:px-6',
        'py-2 xs:py-2.5 sm:py-3',
        'text-xs xs:text-sm sm:text-base'
      );
    }
    
    // تحسينات الشاشات عالية الدقة
    if (highDPIOptimized && layout.isHighDPI) {
      baseClasses.push(
        'border-2',
        'shadow-lg hover:shadow-xl',
        layout.devicePixelRatio > 2 && 'tracking-wide',
        layout.devicePixelRatio > 3 && 'font-black'
      );
    }
    
    // تحسينات خاصة بنوع الشاشة
    if (layout.isMobile) {
      baseClasses.push('rounded-xl');
    } else if (layout.isTablet) {
      baseClasses.push('rounded-lg');
    } else {
      baseClasses.push('rounded-md');
    }
    
    return baseClasses;
  };
  
  return (
    <Button
      className={cn(...getAdaptiveClasses(), className)}
      {...props}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitFontSmoothing: layout.isHighDPI ? 'antialiased' : 'auto',
        MozOsxFontSmoothing: layout.isHighDPI ? 'grayscale' : 'auto'
      }}
    >
      {children}
    </Button>
  );
};
