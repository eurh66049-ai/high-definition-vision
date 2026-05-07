// أدوات الأمان وحماية البيانات
export class SecurityUtils {
  // تنظيف وتعقيم النصوص من محتوى ضار
  static sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // إزالة scripts
      .replace(/javascript:/gi, '') // إزالة javascript protocols
      .replace(/on\w+\s*=/gi, '') // إزالة event handlers
      .replace(/eval\s*\(/gi, '') // إزالة eval
      .trim();
  }

  // التحقق من صحة الروابط
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // تشفير بسيط للبيانات الحساسة قبل التخزين المحلي
  static encryptData(data: string): string {
    try {
      return btoa(encodeURIComponent(data));
    } catch {
      return data;
    }
  }

  // فك تشفير البيانات
  static decryptData(encryptedData: string): string {
    try {
      return decodeURIComponent(atob(encryptedData));
    } catch {
      return encryptedData;
    }
  }

  // التحقق من أذونات المستخدم
  static hasPermission(userRole: string | undefined, requiredRole: string): boolean {
    if (!userRole) return false;
    
    const roleHierarchy: Record<string, number> = {
      'user': 1,
      'admin': 2,
      'super_admin': 3
    };

    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
  }

  // تنظيف localStorage من البيانات القديمة أو المشبوهة
  static cleanupLocalStorage(): void {
    try {
      const keysToCheck = Object.keys(localStorage);
      
      keysToCheck.forEach(key => {
        // إزالة مفاتيح مشبوهة
        if (key.includes('script') || key.includes('eval') || key.includes('debug')) {
          localStorage.removeItem(key);
        }
        
        // التحقق من البيانات القديمة
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.timestamp && Date.now() - parsed.timestamp > 30 * 24 * 60 * 60 * 1000) {
              localStorage.removeItem(key); // إزالة البيانات الأقدم من 30 يوم
            }
          }
        } catch {
          // إذا فشل parsing، قد تكون البيانات تالفة
        }
      });
    } catch (error) {
      console.warn('تحذير: لا يمكن تنظيف localStorage:', error);
    }
  }

  // حماية من CSRF
  static generateCSRFToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // التحقق من أن الطلب آمن
  static validateRequest(request: any): boolean {
    // التحقق من وجود headers الأمان المطلوبة
    const requiredHeaders = ['content-type'];
    
    for (const header of requiredHeaders) {
      if (!request.headers?.[header]) {
        return false;
      }
    }
    
    return true;
  }

  // حماية معلومات المستخدم الحساسة
  static sanitizeUserData(userData: any): any {
    if (!userData) return null;
    
    const sanitized = { ...userData };
    
    // إزالة المعلومات الحساسة
    delete sanitized.password;
    delete sanitized.apiKey;
    delete sanitized.secretKey;
    delete sanitized.private_key;
    delete sanitized.access_token;
    
    // تنظيف النصوص
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = this.sanitizeInput(sanitized[key]);
      }
    });
    
    return sanitized;
  }
}

// تشغيل تنظيف localStorage عند تحميل الصفحة
if (typeof window !== 'undefined') {
  SecurityUtils.cleanupLocalStorage();
}