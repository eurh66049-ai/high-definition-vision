
import React from 'react';
import { cn } from '@/lib/utils';
import { useEnhancedResponsive } from '@/hooks/use-enhanced-responsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'books' | 'cards' | 'authors' | 'features' | 'custom';
  minItemWidth?: number;
  gap?: 'small' | 'medium' | 'large';
  autoFit?: boolean;
  columns?: number;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  variant = 'books',
  minItemWidth = 200,
  gap = 'medium',
  autoFit = true,
  columns
}) => {
  const responsive = useEnhancedResponsive();
  
  const getGridClasses = () => {
    const baseClasses = [
      'grid w-full',
      responsive.shouldOptimizeTouch && 'touch-manipulation',
      'scroll-smooth'
    ].filter(Boolean);
    
    // إذا تم تحديد عدد الأعمدة يدوياً
    if (columns) {
      return cn(...baseClasses, `grid-cols-${Math.min(columns, 12)}`);
    }
    
    // إذا كان autoFit مفعل
    if (autoFit) {
      const adjustedMinWidth = responsive.isMobile ? Math.max(120, minItemWidth * 0.7) :
        responsive.isTablet ? Math.max(150, minItemWidth * 0.85) : minItemWidth;
        
      return cn(
        ...baseClasses,
        `grid-cols-[repeat(auto-fit,minmax(${adjustedMinWidth}px,1fr))]`
      );
    }
    
    // أنماط الشبكة المحددة مسبقاً
    const gridVariants = {
      books: responsive.isMobile ? 
        'grid-cols-2' :
        responsive.isTablet ?
          'grid-cols-3 sm:grid-cols-4' :
          'grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8',
          
      cards: responsive.isMobile ?
        'grid-cols-1' :
        responsive.isTablet ?
          'grid-cols-2' :
          'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
          
      authors: responsive.isMobile ?
        'grid-cols-2' :
        responsive.isTablet ?
          'grid-cols-3' :
          'grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
          
      features: responsive.isMobile ?
        'grid-cols-1' :
        responsive.isTablet ?
          'grid-cols-1 sm:grid-cols-2' :
          'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          
      custom: responsive.getOptimalColumns(minItemWidth).toString()
    };
    
    return cn(...baseClasses, gridVariants[variant]);
  };
  
  const getGapClasses = () => {
    const gapMap = {
      small: responsive.getAdaptiveSpacing('sm'),
      medium: responsive.getAdaptiveSpacing('md'),
      large: responsive.getAdaptiveSpacing('lg')
    };
    
    return gapMap[gap];
  };

  if (responsive.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        getGridClasses(),
        getGapClasses(),
        className
      )}
      style={{
        gridAutoRows: 'max-content',
        scrollBehavior: 'smooth',
        transform: 'translateZ(0)', // تحسين الأداء
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </div>
  );
};
