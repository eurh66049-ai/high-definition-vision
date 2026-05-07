
import * as React from "react";
import { getResponsiveConfig, type ResponsiveConfig } from '@/lib/responsive-utils';

export function useEnhancedResponsive() {
  const [config, setConfig] = React.useState<ResponsiveConfig>(() => getResponsiveConfig());
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const updateConfig = () => {
      setConfig(getResponsiveConfig());
      setIsLoading(false);
    };

    // تحديث فوري
    updateConfig();

    // استخدام ResizeObserver للمراقبة الفعالة
    const resizeObserver = new ResizeObserver(updateConfig);
    resizeObserver.observe(document.body);

    // مراقبة تغيير DPI (عند التكبير/التصغير أو تبديل الشاشات)
    const mediaQuery = window.matchMedia('(-webkit-min-device-pixel-ratio: 1.5)');
    const handleDPIChange = updateConfig;
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDPIChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleDPIChange);
    }

    // مراقبة تغيير الاتجاه
    const orientationQuery = window.matchMedia('(orientation: portrait)');
    if (orientationQuery.addEventListener) {
      orientationQuery.addEventListener('change', updateConfig);
    } else if (orientationQuery.addListener) {
      orientationQuery.addListener(updateConfig);
    }

    return () => {
      resizeObserver.disconnect();
      
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDPIChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleDPIChange);
      }
      
      if (orientationQuery.removeEventListener) {
        orientationQuery.removeEventListener('change', updateConfig);
      } else if (orientationQuery.removeListener) {
        orientationQuery.removeListener(updateConfig);
      }
    };
  }, []);

  const helpers = React.useMemo(() => ({
    // مساعدين للحصول على القيم المحسنة
    getOptimalColumns: (minItemWidth: number = 200) => {
      if (config.isMobile) return Math.max(2, Math.floor(config.screenWidth / minItemWidth));
      if (config.isTablet) return Math.max(3, Math.floor(config.screenWidth / minItemWidth));
      return Math.max(4, Math.floor(config.screenWidth / minItemWidth));
    },
    
    getAdaptiveSpacing: (size: 'sm' | 'md' | 'lg' = 'md') => {
      const spacing = {
        sm: config.isMobile ? 'gap-2' : config.isTablet ? 'gap-3' : 'gap-4',
        md: config.isMobile ? 'gap-3' : config.isTablet ? 'gap-4' : 'gap-6',
        lg: config.isMobile ? 'gap-4' : config.isTablet ? 'gap-6' : 'gap-8'
      };
      return spacing[size];
    },
    
    getAdaptivePadding: (size: 'sm' | 'md' | 'lg' = 'md') => {
      const padding = {
        sm: config.isMobile ? 'p-2' : config.isTablet ? 'p-3' : 'p-4',
        md: config.isMobile ? 'p-3' : config.isTablet ? 'p-4' : 'p-6',
        lg: config.isMobile ? 'p-4' : config.isTablet ? 'p-6' : 'p-8'
      };
      return padding[size];
    },
    
    getAdaptiveText: (variant: 'body' | 'title' | 'heading' = 'body') => {
      const textSizes = {
        body: config.isMobile ? 'text-sm' : config.isTablet ? 'text-base' : 'text-lg',
        title: config.isMobile ? 'text-lg' : config.isTablet ? 'text-xl' : 'text-2xl',
        heading: config.isMobile ? 'text-xl' : config.isTablet ? 'text-2xl' : 'text-3xl'
      };
      
      const weight = config.isHighDPI ? 'font-black' : 'font-bold';
      return `${textSizes[variant]} ${weight}`;
    },
    
    shouldShowBottomNav: config.isMobile,
    shouldUseSidebar: config.isDesktop,
    shouldOptimizeTouch: config.isTouch,
    shouldOptimizeDPI: config.isHighDPI
  }), [config]);

  return {
    ...config,
    ...helpers,
    isLoading
  };
}
