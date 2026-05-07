import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SmoothScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  enableInertialScrolling?: boolean;
  scrollBehavior?: 'smooth' | 'auto';
  momentum?: boolean;
}

export const SmoothScrollContainer: React.FC<SmoothScrollContainerProps> = ({
  children,
  className,
  enableInertialScrolling = true,
  scrollBehavior = 'smooth',
  momentum = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimer = useRef<NodeJS.Timeout>();

  // تحسين التمرير للهواتف
  const optimizeScrolling = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // تطبيق CSS optimizations
    container.style.scrollBehavior = scrollBehavior;
    (container.style as any).WebkitOverflowScrolling = 'touch';
    container.style.overscrollBehavior = 'contain';
    
    // تحسين momentum scrolling
    if (momentum) {
      container.style.scrollbarWidth = 'none'; // Firefox
      (container.style as any).msOverflowStyle = 'none'; // IE/Edge
    }

    // إضافة تسريع الأجهزة
    container.style.willChange = 'scroll-position';
    container.style.transform = 'translateZ(0)';
    container.style.backfaceVisibility = 'hidden';
  }, [scrollBehavior, momentum]);

  // معالج التمرير المحسن
  const handleScroll = useCallback(() => {
    if (!isScrolling.current) {
      isScrolling.current = true;
      
      // تحسين الأداء أثناء التمرير
      if (containerRef.current) {
        containerRef.current.style.pointerEvents = 'none';
      }
    }

    // مسح المؤقت السابق
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }

    // إعادة تفعيل pointer events بعد انتهاء التمرير
    scrollTimer.current = setTimeout(() => {
      isScrolling.current = false;
      if (containerRef.current) {
        containerRef.current.style.pointerEvents = 'auto';
      }
    }, 150);
  }, []);

  useEffect(() => {
    optimizeScrolling();
    
    const container = containerRef.current;
    if (container && enableInertialScrolling) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimer.current) {
          clearTimeout(scrollTimer.current);
        }
      };
    }
  }, [optimizeScrolling, handleScroll, enableInertialScrolling]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full h-full',
        'scroll-smooth',
        momentum && [
          '[&::-webkit-scrollbar]:hidden',
          'scrollbar-none'
        ],
        className
      )}
    >
      {children}
    </div>
  );
};