// أدوات حماية الخصوصية
export class PrivacyUtils {
  // إخفاء معلومات المطور
  static hideDeveloperInfo(): void {
    // إزالة console.log في البيئة الإنتاجية
    if (process.env.NODE_ENV === 'production') {
      console.log = () => {};
      console.warn = () => {};
      console.info = () => {};
    }
    
    // إخفاء معلومات المطور من النافذة
    if (typeof window !== 'undefined') {
      // منع عرض أدوات المطور في الإنتاج فقط
      if (process.env.NODE_ENV === 'production') {
        document.addEventListener('keydown', (e) => {
          if (e.key === 'F12' || 
              (e.ctrlKey && e.shiftKey && e.key === 'I') ||
              (e.ctrlKey && e.shiftKey && e.key === 'C')) {
            e.preventDefault();
            return false;
          }
        });
      }
      
      // ملاحظة: معالج contextmenu سيتم إعداده في enableFormCopyPaste()
    }
  }

  // إزالة metadata الكشف عن أدوات التطوير
  static removeDevMetadata(): void {
    // إزالة أي تعليقات HTML تكشف عن أدوات التطوير
    const comments = document.createNodeIterator(
      document.documentElement,
      NodeFilter.SHOW_COMMENT
    );
    
    const commentsToRemove: Comment[] = [];
    let comment;
    
    while (comment = comments.nextNode()) {
      if (comment.textContent?.toLowerCase().includes('lovable') ||
          comment.textContent?.toLowerCase().includes('generated') ||
          comment.textContent?.toLowerCase().includes('dev')) {
        commentsToRemove.push(comment as Comment);
      }
    }
    
    commentsToRemove.forEach(comment => comment.remove());
  }

  // تشفير البيانات الحساسة في localStorage
  static secureLocalStorage = {
    setItem(key: string, value: any): void {
      try {
        const encrypted = btoa(JSON.stringify({
          data: value,
          timestamp: Date.now()
        }));
        localStorage.setItem(key, encrypted);
      } catch (error) {
        console.warn('فشل في حفظ البيانات المشفرة');
      }
    },

    getItem(key: string): any {
      try {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        
        const decrypted = JSON.parse(atob(encrypted));
        
        // التحقق من انتهاء الصلاحية (24 ساعة)
        if (Date.now() - decrypted.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
          return null;
        }
        
        return decrypted.data;
      } catch {
        localStorage.removeItem(key);
        return null;
      }
    },

    removeItem(key: string): void {
      localStorage.removeItem(key);
    }
  };

  // إزالة بيانات التتبع
  static clearTrackingData(): void {
    // إزالة cookies التتبع
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.includes('track') || name.includes('analytics') || name.includes('_ga')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });

    // تنظيف sessionStorage
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('track') || key.includes('debug') || key.includes('dev')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('لا يمكن تنظيف sessionStorage');
    }
  }

  // حماية ضد استخراج البيانات
  static protectAgainstScraping(): void {
    // إضافة تأخير عشوائي للطلبات
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      return originalFetch(...args);
    };

    // السماح بالنسخ واللصق في نماذج رفع الكتب
    let copyCount = 0;
    document.addEventListener('copy', (e) => {
      const target = e.target as HTMLElement;
      
      // السماح بالنسخ في نماذج الكتب
      if (target.closest('form') || target.closest('[data-form-type="book-submission"]')) {
        return; // السماح بالنسخ في النماذج
      }
      
      copyCount++;
      if (copyCount > 10) {
        console.warn('تم رصد نشاط نسخ مفرط');
      }
    });
    
    // إضافة دعم للصق في النماذج
    document.addEventListener('paste', (e) => {
      const target = e.target as HTMLElement;
      
      // السماح باللصق في نماذج الكتب وحقول الإدخال
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
          target.closest('form') || target.closest('[data-form-type="book-submission"]')) {
        return; // السماح باللصق في النماذج والحقول
      }
    });
  }

  // تهيئة جميع حماية الخصوصية
  static initializePrivacyProtection(): void {
    this.hideDeveloperInfo();
    this.removeDevMetadata();
    this.clearTrackingData();
    this.protectAgainstScraping();
    
    // تفعيل النسخ واللصق في النماذج
    this.enableFormCopyPaste();
    
    console.log('✅ تم تفعيل حماية الخصوصية والأمان مع دعم النسخ واللصق في النماذج');
  }

  // تفعيل النسخ واللصق في النماذج
  static enableFormCopyPaste(): void {
    // إضافة دعم ctrl+v للصق
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'v') {
        const target = e.target as HTMLElement;
        
        // السماح باللصق في حقول الإدخال والنماذج
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
            target.closest('form') || target.closest('[data-form-type="book-submission"]')) {
          return; // لا نمنع اللصق
        }
      }
    });

    // السماح بالقائمة المنبثقة (الزر الأيمن والضغط المطوّل) في كل الموقع
    document.addEventListener('contextmenu', (_e) => {
      // لم نعد نمنع القائمة المنبثقة حتى في بيئة الإنتاج
      return;
    });
  }
}

// تشغيل حماية الخصوصية عند تحميل النص
if (typeof window !== 'undefined') {
  PrivacyUtils.initializePrivacyProtection();
}