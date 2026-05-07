// مساعدات تحسين رفع الملفات للهواتف
export class MobileUploadOptimizer {
  private static instance: MobileUploadOptimizer;
  
  static getInstance(): MobileUploadOptimizer {
    if (!MobileUploadOptimizer.instance) {
      MobileUploadOptimizer.instance = new MobileUploadOptimizer();
    }
    return MobileUploadOptimizer.instance;
  }

  // تحديد إعدادات الرفع المثلى حسب الجهاز
  getOptimalUploadSettings() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const connection = (navigator as any).connection;
    
    // معلومات الذاكرة (إذا متوفرة)
    const memory = (navigator as any).deviceMemory;
    const isLowMemoryDevice = memory && memory <= 2; // 2GB أو أقل

    return {
      isMobile,
      isIOS,
      isAndroid,
      isLowMemoryDevice,
      connection: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      
      // إعدادات الرفع المحسنة
      maxChunkSize: isLowMemoryDevice ? 1024 * 1024 : // 1MB للأجهزة ضعيفة الذاكرة
                   isIOS ? 2 * 1024 * 1024 : // 2MB لـ iOS
                   isAndroid ? 3 * 1024 * 1024 : // 3MB لـ Android
                   5 * 1024 * 1024, // 5MB للكمبيوتر
                   
      maxRetries: isMobile ? 7 : 3,
      retryDelay: isMobile ? 3000 : 2000,
      timeout: isMobile ? 60000 : 30000,
      concurrentUploads: isMobile ? 1 : 2,
      
      // حدود الملفات
      warningSize: isMobile ? 10 * 1024 * 1024 : 20 * 1024 * 1024, // 10MB للهواتف
      maxFileSize: isMobile ? 50 * 1024 * 1024 : 100 * 1024 * 1024, // 50MB للهواتف
    };
  }

  // تنظيف الذاكرة (إذا كان ممكناً)
  async clearMemory(): Promise<void> {
    try {
      // محاولة تشغيل garbage collector إذا كان متاحاً
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
      
      // انتظار قصير للسماح للمتصفح بتنظيف الذاكرة
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn('تعذر تنظيف الذاكرة:', error);
    }
  }

  // فحص حالة الذاكرة المتاحة
  checkMemoryStatus(): { available: boolean; warning: string | null } {
    try {
      const memory = (navigator as any).deviceMemory;
      const performance = (window as any).performance;
      
      // فحص الذاكرة المستخدمة (إذا متوفر)
      if (performance && performance.memory) {
        const memoryInfo = performance.memory;
        const usedMemoryMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        const totalMemoryMB = memoryInfo.totalJSHeapSize / (1024 * 1024);
        const limitMemoryMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
        
        console.log('معلومات الذاكرة:', {
          used: `${usedMemoryMB.toFixed(2)} MB`,
          total: `${totalMemoryMB.toFixed(2)} MB`,
          limit: `${limitMemoryMB.toFixed(2)} MB`,
          usage: `${((usedMemoryMB / limitMemoryMB) * 100).toFixed(1)}%`
        });
        
        // تحذير إذا كانت الذاكرة المستخدمة عالية
        if (usedMemoryMB / limitMemoryMB > 0.8) {
          return {
            available: false,
            warning: 'ذاكرة الجهاز ممتلئة تقريباً. أغلق تطبيقات أخرى وأعد المحاولة.'
          };
        }
        
        if (usedMemoryMB / limitMemoryMB > 0.6) {
          return {
            available: true,
            warning: 'ذاكرة الجهاز مستخدمة بكثرة. قد يكون الرفع أبطأ من المعتاد.'
          };
        }
      }
      
      // فحص بسيط للأجهزة ضعيفة الذاكرة
      if (memory && memory <= 1) {
        return {
          available: true,
          warning: 'جهاز بذاكرة محدودة. قد تحتاج لرفع ملفات أصغر أو أغلاق تطبيقات أخرى.'
        };
      }
      
      return { available: true, warning: null };
    } catch (error) {
      console.warn('تعذر فحص حالة الذاكرة:', error);
      return { available: true, warning: null };
    }
  }

  // تحسين حجم الملف للرفع
  async optimizeFileForUpload(file: File): Promise<{ optimized: File; recommendations: string[] }> {
    const settings = this.getOptimalUploadSettings();
    const recommendations: string[] = [];
    
    // إذا كان الملف كبير جداً للهاتف
    if (settings.isMobile && file.size > settings.maxFileSize) {
      recommendations.push(`الملف كبير جداً للهاتف (${this.formatFileSize(file.size)}). الحد الأقصى ${this.formatFileSize(settings.maxFileSize)}`);
    }
    
    // إذا كان الملف قريب من حد التحذير
    if (file.size > settings.warningSize) {
      if (settings.isMobile) {
        recommendations.push('ننصح بـ: اتصال WiFi قوي، إغلاق تطبيقات أخرى، عدم إغلاق المتصفح');
      } else {
        recommendations.push('ملف كبير - قد يستغرق وقتاً أطول للرفع');
      }
    }
    
    // للأجهزة ضعيفة الذاكرة
    if (settings.isLowMemoryDevice && file.size > 20 * 1024 * 1024) {
      recommendations.push('جهاز بذاكرة محدودة - قد تحتاج لضغط الملف أولاً');
    }
    
    return {
      optimized: file, // في الوقت الحالي، نعيد نفس الملف
      recommendations
    };
  }

  // فحص قوة الشبكة
  getNetworkQuality(): { quality: 'excellent' | 'good' | 'fair' | 'poor'; recommendation: string } {
    const connection = (navigator as any).connection;
    
    if (!connection) {
      return { quality: 'fair', recommendation: 'لا يمكن تحديد جودة الشبكة' };
    }
    
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink || 0;
    
    if (effectiveType === '4g' && downlink > 10) {
      return { quality: 'excellent', recommendation: 'شبكة ممتازة - يمكن رفع ملفات كبيرة' };
    } else if (effectiveType === '4g' || downlink > 5) {
      return { quality: 'good', recommendation: 'شبكة جيدة - مناسبة لمعظم الملفات' };
    } else if (effectiveType === '3g' || downlink > 1) {
      return { quality: 'fair', recommendation: 'شبكة متوسطة - قد يستغرق رفع الملفات الكبيرة وقتاً أطول' };
    } else {
      return { quality: 'poor', recommendation: 'شبكة ضعيفة - ننصح برفع ملفات صغيرة فقط' };
    }
  }

  // تنسيق حجم الملف
  private formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  }

  // مراقبة استهلاك الذاكرة أثناء الرفع
  createMemoryMonitor() {
    let intervalId: NodeJS.Timeout | null = null;
    
    return {
      start: (callback: (memoryStatus: any) => void) => {
        intervalId = setInterval(() => {
          const status = this.checkMemoryStatus();
          callback(status);
        }, 5000); // فحص كل 5 ثوان
      },
      
      stop: () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
  }
}

// تصدير instance وحيد
export const mobileOptimizer = MobileUploadOptimizer.getInstance();