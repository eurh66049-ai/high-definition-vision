
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBreakpoint() {
  if (typeof window === 'undefined') return 'md';
  
  const width = window.innerWidth;
  
  if (width < 480) return 'xs';
  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  if (width < 1280) return 'xl';
  if (width < 1536) return '2xl';
  if (width < 1600) return '3xl';
  return '4xl';
}

// Enhanced responsive spacing for all screen sizes
export const responsiveSpacing = {
  section: 'py-4 px-3 xs:py-6 xs:px-4 sm:py-8 sm:px-4 md:py-12 md:px-6 lg:py-16 lg:px-8 xl:py-20 xl:px-10 2xl:py-24 2xl:px-12',
  container: 'px-3 xs:px-4 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16 4xl:px-20',
  cardPadding: 'p-3 xs:p-4 sm:p-4 md:p-6 lg:p-8 xl:p-10',
  gap: {
    small: 'gap-1 xs:gap-2 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5',
    medium: 'gap-2 xs:gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12',
    large: 'gap-4 xs:gap-5 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16 2xl:gap-20'
  }
};

// Enhanced responsive typography
export const responsiveTypography = {
  display: {
    xs: 'text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl',
    sm: 'text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl',
    base: 'text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl',
    lg: 'text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl'
  },
  heading: {
    h1: 'text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black',
    h2: 'text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black',
    h3: 'text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black',
    h4: 'text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-black'
  },
  body: {
    large: 'text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl',
    base: 'text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl',
    small: 'text-xs sm:text-sm md:text-base lg:text-lg'
  }
};

// Enhanced responsive grid systems
export const responsiveGrid = {
  books: 'grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9',
  cards: 'grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
  authors: 'grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
  features: 'grid-cols-1 xs:grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
};

// Image optimization utilities with enhanced support
export const imageOptimization = {
  calculateAspectRatioFit: (srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number) => {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return { width: srcWidth * ratio, height: srcHeight * ratio };
  },
  
  shouldLazyLoad: (elementPosition: number, viewportHeight: number, threshold = 200) => {
    return elementPosition > viewportHeight + threshold;
  },
  
  getImageLoadPriority: (index: number, isVisible = true): 'high' | 'low' | 'auto' => {
    if (!isVisible) return 'low';
    if (index < 5) return 'high';
    return 'auto';
  },
  
  // Get optimal image sizes based on screen size
  getOptimalImageSize: (screenWidth: number, containerSize: 'small' | 'medium' | 'large' = 'medium') => {
    const multipliers = { small: 0.3, medium: 0.6, large: 0.9 };
    const baseSize = screenWidth * multipliers[containerSize];
    
    // Round to common image sizes for better caching
    if (baseSize <= 150) return 150;
    if (baseSize <= 300) return 300;
    if (baseSize <= 600) return 600;
    if (baseSize <= 900) return 900;
    if (baseSize <= 1200) return 1200;
    return 1600;
  }
};

// Device-specific optimizations
export const deviceOptimization = {
  // Touch-friendly sizes
  touch: {
    minTarget: 'min-h-[44px] min-w-[44px]', // Apple's recommended minimum
    button: 'h-12 w-auto px-6 xs:h-14 xs:px-8 sm:h-16 sm:px-10',
    icon: 'h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8'
  },
  
  // High DPI adjustments
  highDPI: {
    border: 'border-2',
    shadow: 'shadow-lg',
    text: 'antialiased font-medium'
  },
  
  // Performance optimizations
  performance: {
    willChange: 'will-change-transform',
    transform3d: 'transform-gpu',
    smooth: 'scroll-smooth',
    contain: 'contain-layout contain-style'
  }
};

// Responsive container utilities
export const responsiveContainers = {
  page: 'w-full min-h-screen mx-auto px-3 xs:px-4 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 max-w-xs xs:max-w-sm sm:max-w-full md:max-w-full lg:max-w-full xl:max-w-full',
  content: 'w-full mx-auto px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 max-w-7xl',
  card: 'w-full rounded-lg xs:rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 md:p-8',
  modal: 'w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto'
};

// Animation utilities with device considerations
export const responsiveAnimations = {
  // Reduced motion for accessibility
  respectMotion: 'motion-reduce:transition-none motion-reduce:animation-none',
  
  // Touch-optimized transitions
  touch: 'transition-all duration-200 ease-out active:scale-95',
  
  // Hover effects (disabled on touch devices)
  hover: 'hover:scale-105 hover:shadow-lg transition-all duration-300 hover:hover:scale-105',
  
  // Loading states
  loading: 'animate-pulse',
  
  // Entry animations
  fadeIn: 'animate-fade-in',
  slideIn: 'animate-slide-in',
  scaleIn: 'animate-scale-in'
};

// Utility function to get responsive classes based on screen size
export function getResponsiveClasses(
  baseClasses: string,
  responsiveVariations?: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl', string>>
): string {
  let classes = baseClasses;
  
  if (responsiveVariations) {
    Object.entries(responsiveVariations).forEach(([breakpoint, variation]) => {
      if (variation) {
        classes += ` ${breakpoint}:${variation}`;
      }
    });
  }
  
  return classes;
}

// Utility to detect if device prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Utility to get safe area insets for mobile devices
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
  };
}
