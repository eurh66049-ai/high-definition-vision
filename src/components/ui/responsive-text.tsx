
import React from 'react';
import { cn } from '@/lib/utils';
import { useAdaptiveLayout } from '@/hooks/use-mobile';

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: 'display' | 'heading' | 'title' | 'body' | 'caption';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  className?: string;
  element?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  size = 'base',
  weight = 'normal',
  className,
  element = 'p'
}) => {
  const layout = useAdaptiveLayout();
  
  const getTextClasses = () => {
    const baseClasses = [
      'text-white',
      'transition-all duration-200',
      layout.isHighDPI && 'subpixel-antialiased'
    ].filter(Boolean);
    
    // أحجام النصوص باستخدام px
    const sizeClasses = {
      xs: 'text-[12px]',
      sm: 'text-[14px]',
      base: 'text-[16px]',
      lg: 'text-[18px]',
      xl: 'text-[20px]',
      '2xl': 'text-[24px]',
      '3xl': 'text-[28px]'
    };
    
    // جميع أوزان النص تستخدم 400
    const weightClasses = {
      normal: 'font-normal',
      medium: 'font-normal',
      semibold: 'font-normal',
      bold: 'font-normal',
      black: 'font-normal'
    };
    
    // أنماط النص المختلفة - كلها تستخدم Tajawal
    const variantClasses = {
      display: [
        sizeClasses['3xl'],
        weightClasses.normal,
        'leading-tight tracking-tight',
        'font-tajawal'
      ],
      heading: [
        sizeClasses.xl,
        weightClasses.normal,
        'leading-tight',
        'font-tajawal'
      ],
      title: [
        sizeClasses.lg,
        weightClasses.normal,
        'leading-snug',
        'font-tajawal'
      ],
      body: [
        sizeClasses[size],
        weightClasses[weight],
        'leading-relaxed',
        'font-tajawal'
      ],
      caption: [
        sizeClasses.xs,
        weightClasses.normal,
        'leading-normal',
        'font-tajawal'
      ]
    };
    
    return cn(
      ...baseClasses,
      ...variantClasses[variant],
      className
    );
  };
  
  const Element = element;
  
  return (
    <Element 
      className={getTextClasses()}
      style={{
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        fontFamily: 'Tajawal, sans-serif',
        fontWeight: '400'
      }}
    >
      {children}
    </Element>
  );
};
