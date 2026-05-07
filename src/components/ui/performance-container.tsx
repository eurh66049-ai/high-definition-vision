import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PerformanceContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  enableVirtualization?: boolean;
  optimizeRender?: boolean;
  enableGPUAcceleration?: boolean;
  debounceMs?: number;
}

export const PerformanceContainer: React.FC<PerformanceContainerProps> = ({
  children,
  className,
  style,
  enableVirtualization = false,
  optimizeRender = true,
  enableGPUAcceleration = true,
  debounceMs = 16
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  // تحسين الرسم باستخدام requestAnimationFrame
  useEffect(() => {
    if (!optimizeRender) return;

    const handleOptimization = () => {
      if (containerRef.current) {
        // تفعيل hardware acceleration
        if (enableGPUAcceleration) {
          containerRef.current.style.transform = 'translateZ(0)';
          containerRef.current.style.willChange = 'transform, opacity';
        }

        // تحسين smooth scrolling
        containerRef.current.style.scrollBehavior = 'smooth';
        
        // تحسين rendering
        containerRef.current.style.contain = 'layout style paint';
      }
    };

    rafRef.current = requestAnimationFrame(handleOptimization);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [optimizeRender, enableGPUAcceleration]);

  // تحسين للشاشات عالية الدقة
  const optimizedStyles = useMemo(() => ({
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
    textRendering: 'optimizeLegibility' as const,
    imageRendering: 'crisp-edges' as const,
    backfaceVisibility: 'hidden' as const,
    perspective: '1000px',
    transformStyle: 'preserve-3d' as const
  }), []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full',
        'transition-all duration-200 ease-out',
        'touch-manipulation',
        enableGPUAcceleration && 'will-change-transform',
        className
      )}
      style={{
        ...optimizedStyles,
        ...style
      }}
    >
      {children}
    </div>
  );
};