
import * as React from "react"

// Define supported breakpoints with more granular control
type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

const BREAKPOINTS: Record<Breakpoint, number> = {
  'xs': 480,    // Very small phones
  'sm': 640,    // Small phones  
  'md': 768,    // Tablets
  'lg': 1024,   // Small desktops
  'xl': 1280,   // Medium desktops
  '2xl': 1536,  // Large desktops
  '3xl': 1600,  // Very large desktops
  '4xl': 1920,  // Ultra-wide displays
};

// Screen size categories for better classification
export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Hook to detect if viewport is mobile-sized
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md)
    }
    
    // Check initial state
    checkMobile()
    
    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(() => {
      checkMobile()
    })
    
    resizeObserver.observe(document.body)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return !!isMobile
}

/**
 * Hook to get current responsive breakpoint
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('md')

  React.useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth
      if (width < BREAKPOINTS.xs) return 'xs'
      if (width < BREAKPOINTS.sm) return 'sm'
      if (width < BREAKPOINTS.md) return 'md'
      if (width < BREAKPOINTS.lg) return 'lg'
      if (width < BREAKPOINTS.xl) return 'xl'
      if (width < BREAKPOINTS['2xl']) return '2xl'
      if (width < BREAKPOINTS['3xl']) return '3xl'
      return '4xl'
    }
    
    const updateBreakpoint = () => {
      setBreakpoint(getBreakpoint())
    }
    
    // Set initial breakpoint
    updateBreakpoint()
    
    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(() => {
      updateBreakpoint()
    })
    
    resizeObserver.observe(document.body)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return breakpoint
}

/**
 * Hook to get screen size category
 */
export function useScreenSize(): ScreenSize {
  const breakpoint = useBreakpoint()
  
  return React.useMemo(() => {
    if (breakpoint === 'xs' || breakpoint === 'sm') return 'mobile'
    if (breakpoint === 'md') return 'tablet'
    if (breakpoint === 'lg' || breakpoint === 'xl') return 'desktop'
    return 'wide'
  }, [breakpoint])
}

/**
 * Hook to check if device has touch capability
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = React.useState<boolean>(false)
  
  React.useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    
    setIsTouch(isTouchDevice)
  }, [])
  
  return isTouch
}

/**
 * Hook to detect screen orientation
 */
export function useOrientation() {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait')
  
  React.useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      )
    }
    
    updateOrientation()
    
    const resizeObserver = new ResizeObserver(() => {
      updateOrientation()
    })
    
    resizeObserver.observe(document.body)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])
  
  return orientation
}

/**
 * Hook to detect high DPI screens with enhanced detection
 */
export function useHighDPI() {
  const [isHighDPI, setIsHighDPI] = React.useState<boolean>(false)
  const [devicePixelRatio, setDevicePixelRatio] = React.useState<number>(1)
  
  React.useEffect(() => {
    const updateDPI = () => {
      const dpr = window.devicePixelRatio || 1
      setDevicePixelRatio(dpr)
      setIsHighDPI(dpr > 1.5) // More sensitive threshold
    }
    
    updateDPI()
    
    // Listen for DPI changes (when user zooms or connects external display)
    const mediaQuery = window.matchMedia('(-webkit-min-device-pixel-ratio: 1.5)')
    const handleDPIChange = () => updateDPI()
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDPIChange)
      return () => mediaQuery.removeEventListener('change', handleDPIChange)
    } else if (mediaQuery.addListener) {
      // Fallback for older browsers
      mediaQuery.addListener(handleDPIChange)
      return () => mediaQuery.removeListener(handleDPIChange)
    }
  }, [])
  
  return { isHighDPI, devicePixelRatio }
}

/**
 * Enhanced responsive value hook with better breakpoint handling
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T {
  const breakpoint = useBreakpoint()
  
  // Get the closest matching breakpoint
  const getValueForBreakpoint = (): T => {
    const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']
    const currentIndex = breakpointOrder.indexOf(breakpoint)
    
    // Try to find a value for the current breakpoint or closest smaller one
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i]
      if (values[bp] !== undefined) {
        return values[bp] as T
      }
    }
    
    return defaultValue
  }
  
  return getValueForBreakpoint()
}

/**
 * Hook to get responsive grid columns based on screen size and DPI
 */
export function useResponsiveGrid() {
  const breakpoint = useBreakpoint()
  const { isHighDPI, devicePixelRatio } = useHighDPI()
  const screenSize = useScreenSize()
  
  const getGridColumns = React.useCallback(() => {
    // Enhanced base columns for different breakpoints
    let baseColumns = {
      'xs': 2,
      'sm': 3,
      'md': 4,
      'lg': 5,
      'xl': 6,
      '2xl': 7,
      '3xl': 8,
      '4xl': 9
    }[breakpoint] || 3
    
    // Adjust for high DPI screens
    if (isHighDPI && devicePixelRatio > 2) {
      baseColumns = Math.max(2, baseColumns - 1)
    }
    
    // Adjust for ultra-high DPI screens
    if (devicePixelRatio > 3) {
      baseColumns = Math.max(2, baseColumns - 2)
    }
    
    return baseColumns
  }, [breakpoint, isHighDPI, devicePixelRatio])
  
  return {
    columns: getGridColumns(),
    isHighDPI,
    devicePixelRatio,
    breakpoint,
    screenSize
  }
}

/**
 * Hook to get responsive spacing values
 */
export function useResponsiveSpacing() {
  const screenSize = useScreenSize()
  const { devicePixelRatio } = useHighDPI()
  
  const spacing = React.useMemo(() => {
    const baseSpacing = {
      mobile: { xs: 2, sm: 3, md: 4, lg: 6 },
      tablet: { xs: 3, sm: 4, md: 6, lg: 8 },
      desktop: { xs: 4, sm: 6, md: 8, lg: 12 },
      wide: { xs: 6, sm: 8, md: 12, lg: 16 }
    }[screenSize]
    
    // Adjust for high DPI
    if (devicePixelRatio > 2) {
      return {
        xs: Math.max(1, baseSpacing.xs - 1),
        sm: Math.max(2, baseSpacing.sm - 1),
        md: Math.max(3, baseSpacing.md - 1),
        lg: Math.max(4, baseSpacing.lg - 2)
      }
    }
    
    return baseSpacing
  }, [screenSize, devicePixelRatio])
  
  return spacing
}

/**
 * Hook to get responsive font sizes
 */
export function useResponsiveFontSize() {
  const screenSize = useScreenSize()
  const { isHighDPI } = useHighDPI()
  
  const fontSizes = React.useMemo(() => {
    const baseSizes = {
      mobile: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
      tablet: { xs: 13, sm: 15, base: 17, lg: 19, xl: 22, '2xl': 26 },
      desktop: { xs: 14, sm: 16, base: 18, lg: 20, xl: 24, '2xl': 30 },
      wide: { xs: 16, sm: 18, base: 20, lg: 24, xl: 28, '2xl': 36 }
    }[screenSize]
    
    // Adjust for high DPI screens - make fonts slightly larger for better readability
    if (isHighDPI) {
      return Object.fromEntries(
        Object.entries(baseSizes).map(([key, value]) => [key, value + 1])
      )
    }
    
    return baseSizes
  }, [screenSize, isHighDPI])
  
  return fontSizes
}

/**
 * Hook to get optimized viewport dimensions
 */
export function useViewportDimensions() {
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    availableWidth: typeof window !== 'undefined' ? window.screen.availWidth : 0,
    availableHeight: typeof window !== 'undefined' ? window.screen.availHeight : 0
  })
  
  React.useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
        availableWidth: window.screen.availWidth || window.innerWidth,
        availableHeight: window.screen.availHeight || window.innerHeight
      })
    }
    
    updateDimensions()
    
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    
    resizeObserver.observe(document.body)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])
  
  return dimensions
}

/**
 * Hook to automatically adjust layout based on screen properties
 */
export function useAdaptiveLayout() {
  const breakpoint = useBreakpoint()
  const screenSize = useScreenSize()
  const orientation = useOrientation()
  const { isHighDPI, devicePixelRatio } = useHighDPI()
  const isTouch = useTouchDevice()
  const dimensions = useViewportDimensions()
  
  const layoutConfig = React.useMemo(() => {
    const isMobile = screenSize === 'mobile'
    const isTablet = screenSize === 'tablet'
    const isDesktop = screenSize === 'desktop' || screenSize === 'wide'
    
    return {
      // Layout properties
      isMobile,
      isTablet,
      isDesktop,
      breakpoint,
      screenSize,
      orientation,
      isTouch,
      isHighDPI,
      devicePixelRatio,
      dimensions,
      
      // Computed layout values
      shouldShowBottomNav: isMobile,
      shouldUseSidebar: isDesktop,
      shouldCompactLayout: isMobile || (isTablet && orientation === 'portrait'),
      optimalColumns: isMobile ? 2 : isTablet ? 3 : isDesktop ? 4 : 5,
      
      // Touch-specific adjustments
      minTouchTarget: isTouch ? 44 : 32,
      buttonPadding: isTouch ? 'p-4' : 'p-2',
      spacing: isTouch ? 'gap-4' : 'gap-2',
      
      // High DPI adjustments
      textScale: isHighDPI ? 'scale-110' : 'scale-100',
      borderWidth: isHighDPI ? 'border-2' : 'border',
      
      // Container constraints
      maxWidth: isDesktop ? 'max-w-7xl' : isTablet ? 'max-w-4xl' : 'max-w-full',
      padding: isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-8'
    }
  }, [breakpoint, screenSize, orientation, isHighDPI, devicePixelRatio, isTouch, dimensions])
  
  return layoutConfig
}

export { BREAKPOINTS }
