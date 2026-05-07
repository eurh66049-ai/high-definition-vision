
import { getBreakpoint } from '@/lib/utils';

export interface ResponsiveConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: string;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  isHighDPI: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

export function getResponsiveConfig(): ResponsiveConfig {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'md',
      devicePixelRatio: 1,
      screenWidth: 1024,
      screenHeight: 768,
      isHighDPI: false,
      isTouch: false,
      orientation: 'landscape'
    };
  }
  
  const breakpoint = getBreakpoint();
  const devicePixelRatio = window.devicePixelRatio || 1;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  return {
    isMobile: screenWidth < 768,
    isTablet: screenWidth >= 768 && screenWidth < 1024,
    isDesktop: screenWidth >= 1024,
    breakpoint,
    devicePixelRatio,
    screenWidth,
    screenHeight,
    isHighDPI: devicePixelRatio > 1.5,
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    orientation: screenWidth > screenHeight ? 'landscape' : 'portrait'
  };
}

export function getOptimalImageSize(
  containerWidth: number,
  devicePixelRatio: number = 1
): number {
  const pixelWidth = containerWidth * devicePixelRatio;
  
  // أحجام محسنة للصور
  if (pixelWidth <= 150) return 150;
  if (pixelWidth <= 300) return 300;
  if (pixelWidth <= 600) return 600;
  if (pixelWidth <= 900) return 900;
  if (pixelWidth <= 1200) return 1200;
  if (pixelWidth <= 1800) return 1800;
  return 2400;
}

export function getOptimalFontSize(
  baseFontSize: number,
  screenSize: 'mobile' | 'tablet' | 'desktop',
  devicePixelRatio: number = 1
): number {
  let multiplier = 1;
  
  // تعديل حسب نوع الجهاز
  switch (screenSize) {
    case 'mobile':
      multiplier = 0.9;
      break;
    case 'tablet':
      multiplier = 1.1;
      break;
    case 'desktop':
      multiplier = 1.2;
      break;
  }
  
  // تعديل للشاشات عالية الدقة
  if (devicePixelRatio > 2) {
    multiplier *= 1.1;
  }
  if (devicePixelRatio > 3) {
    multiplier *= 1.15;
  }
  
  return Math.round(baseFontSize * multiplier);
}

export function getGridColumns(
  screenWidth: number,
  itemMinWidth: number = 200,
  gap: number = 16
): number {
  const availableWidth = screenWidth - (gap * 2); // هوامش جانبية
  const columnsFloat = availableWidth / (itemMinWidth + gap);
  const columns = Math.floor(columnsFloat);
  
  // حد أدنى وأقصى للأعمدة
  return Math.max(1, Math.min(columns, 8));
}

export function getTouchTargetSize(
  baseSize: number,
  isTouch: boolean = false
): number {
  if (!isTouch) return baseSize;
  
  // حد أدنى 44px للمس (معيار Apple)
  return Math.max(baseSize, 44);
}

export function getResponsiveSpacing(
  level: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  screenSize: 'mobile' | 'tablet' | 'desktop'
): string {
  const spacingMap = {
    mobile: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-6'
    },
    tablet: {
      xs: 'gap-2',
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8'
    },
    desktop: {
      xs: 'gap-3',
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
      xl: 'gap-12'
    }
  };
  
  return spacingMap[screenSize][level];
}

export function shouldLazyLoad(
  elementPosition: number,
  viewportHeight: number,
  threshold: number = 200
): boolean {
  return elementPosition > viewportHeight + threshold;
}

export function getOptimalLoadingPriority(
  index: number,
  isAboveFold: boolean = false
): 'high' | 'low' | 'auto' {
  if (isAboveFold && index < 3) return 'high';
  if (index < 6) return 'auto';
  return 'low';
}
