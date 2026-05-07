/**
 * مدير التخزين المحلي - لتقليل حجم البيانات المخزنة ومنع بطء المتصفح
 */

// الحد الأقصى لحجم التخزين المحلي (5 ميجابايت)
const MAX_STORAGE_SIZE = 5 * 1024 * 1024;
// الحد الأقصى لعدد الكتب المشاهدة مؤخراً
const MAX_RECENTLY_VIEWED = 10;
// الحد الأقصى لعدد الكتب في تقدم القراءة
const MAX_READING_PROGRESS = 20;
// عمر البيانات القديمة (7 أيام)
const DATA_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * حساب حجم التخزين المحلي الحالي
 */
export const getStorageSize = (): number => {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += (localStorage[key].length + key.length) * 2; // UTF-16
    }
  }
  return total;
};

/**
 * تحويل الحجم إلى صيغة قابلة للقراءة
 */
export const formatStorageSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

/**
 * تنظيف البيانات القديمة من الكتب المشاهدة مؤخراً
 */
const cleanRecentlyViewed = (): void => {
  try {
    const stored = localStorage.getItem('kutubi_recently_viewed');
    if (!stored) return;
    
    let data = JSON.parse(stored);
    if (!Array.isArray(data)) {
      localStorage.removeItem('kutubi_recently_viewed');
      return;
    }
    
    // الحفاظ فقط على أحدث الكتب
    if (data.length > MAX_RECENTLY_VIEWED) {
      data = data.slice(0, MAX_RECENTLY_VIEWED);
      localStorage.setItem('kutubi_recently_viewed', JSON.stringify(data));
    }
  } catch (error) {
    localStorage.removeItem('kutubi_recently_viewed');
  }
};

/**
 * تنظيف بيانات تقدم القراءة القديمة
 */
const cleanReadingProgress = (): void => {
  try {
    const stored = localStorage.getItem('kutubi_reading_progress');
    if (!stored) return;
    
    const data = JSON.parse(stored);
    if (typeof data !== 'object') {
      localStorage.removeItem('kutubi_reading_progress');
      return;
    }
    
    const now = Date.now();
    const entries = Object.entries(data);
    
    // تصفية الإدخالات القديمة والحفاظ على أحدثها
    const validEntries = entries
      .filter(([_, value]: [string, any]) => {
        if (!value.lastReadAt) return false;
        const age = now - new Date(value.lastReadAt).getTime();
        return age < DATA_MAX_AGE;
      })
      .sort((a: any, b: any) => {
        return new Date(b[1].lastReadAt).getTime() - new Date(a[1].lastReadAt).getTime();
      })
      .slice(0, MAX_READING_PROGRESS);
    
    const cleanedData = Object.fromEntries(validEntries);
    localStorage.setItem('kutubi_reading_progress', JSON.stringify(cleanedData));
  } catch (error) {
    localStorage.removeItem('kutubi_reading_progress');
  }
};

/**
 * تنظيف جلسات القراءة القديمة
 */
const cleanReadingSessions = (): void => {
  try {
    const keysToRemove: string[] = [];
    const now = Date.now();
    
    for (const key in localStorage) {
      if (key.startsWith('reading_sessions_')) {
        try {
          const sessions = JSON.parse(localStorage.getItem(key) || '[]');
          if (!Array.isArray(sessions)) {
            keysToRemove.push(key);
            continue;
          }
          
          // تصفية الجلسات القديمة
          const recentSessions = sessions.filter((session: any) => {
            if (!session.date) return false;
            const age = now - new Date(session.date).getTime();
            return age < DATA_MAX_AGE;
          });
          
          if (recentSessions.length === 0) {
            keysToRemove.push(key);
          } else if (recentSessions.length < sessions.length) {
            localStorage.setItem(key, JSON.stringify(recentSessions));
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('خطأ في تنظيف جلسات القراءة:', error);
  }
};

/**
 * تنظيف بيانات التنقل القديمة
 */
const cleanNavigationData = (): void => {
  try {
    // تنظيف navigation_history_backup إذا كانت قديمة
    const backup = localStorage.getItem('navigation_history_backup');
    if (backup) {
      try {
        const data = JSON.parse(backup);
        if (data.timestamp && Date.now() - data.timestamp > 60 * 60 * 1000) {
          localStorage.removeItem('navigation_history_backup');
        }
      } catch {
        localStorage.removeItem('navigation_history_backup');
      }
    }
  } catch (error) {
    console.warn('خطأ في تنظيف بيانات التنقل:', error);
  }
};

/**
 * تنظيف المفاتيح غير الضرورية
 */
const cleanUnnecessaryKeys = (): void => {
  const keysToClean = [
    // مفاتيح مؤقتة
    'temp_',
    'cache_',
    'debug_',
    // مفاتيح قديمة
    'old_',
  ];
  
  const protectedKeys = [
    'theme',
    'sb-',
    'kutubi_',
    'auth_',
    'supabase.',
  ];
  
  try {
    const keysToRemove: string[] = [];
    
    for (const key in localStorage) {
      // تخطي المفاتيح المحمية
      if (protectedKeys.some(pk => key.startsWith(pk) || key.includes(pk))) {
        continue;
      }
      
      // إزالة المفاتيح غير الضرورية
      if (keysToClean.some(ck => key.startsWith(ck) || key.includes(ck))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('خطأ في تنظيف المفاتيح:', error);
  }
};

/**
 * تنظيف شامل للتخزين المحلي
 */
export const cleanupLocalStorage = (): void => {
  console.log('🧹 بدء تنظيف التخزين المحلي...');
  const sizeBefore = getStorageSize();
  
  try {
    cleanRecentlyViewed();
    cleanReadingProgress();
    cleanReadingSessions();
    cleanNavigationData();
    cleanUnnecessaryKeys();
    
    const sizeAfter = getStorageSize();
    const saved = sizeBefore - sizeAfter;
    
    if (saved > 0) {
      console.log(`✅ تم تنظيف ${formatStorageSize(saved)} من البيانات`);
      console.log(`📊 الحجم الحالي: ${formatStorageSize(sizeAfter)}`);
    }
  } catch (error) {
    console.error('خطأ في تنظيف التخزين المحلي:', error);
  }
};

/**
 * تنظيف طارئ عند تجاوز الحد الأقصى
 */
export const emergencyCleanup = (): void => {
  const currentSize = getStorageSize();
  
  if (currentSize > MAX_STORAGE_SIZE) {
    console.warn('⚠️ تجاوز الحد الأقصى للتخزين، بدء التنظيف الطارئ...');
    
    // حذف جلسات القراءة بالكامل
    for (const key in localStorage) {
      if (key.startsWith('reading_sessions_')) {
        localStorage.removeItem(key);
      }
    }
    
    // تقليل الكتب المشاهدة مؤخراً
    try {
      const stored = localStorage.getItem('kutubi_recently_viewed');
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data) && data.length > 5) {
          localStorage.setItem('kutubi_recently_viewed', JSON.stringify(data.slice(0, 5)));
        }
      }
    } catch {}
    
    // تقليل تقدم القراءة
    try {
      const stored = localStorage.getItem('kutubi_reading_progress');
      if (stored) {
        const data = JSON.parse(stored);
        const entries = Object.entries(data)
          .sort((a: any, b: any) => new Date(b[1].lastReadAt).getTime() - new Date(a[1].lastReadAt).getTime())
          .slice(0, 10);
        localStorage.setItem('kutubi_reading_progress', JSON.stringify(Object.fromEntries(entries)));
      }
    } catch {}
    
    console.log(`📊 الحجم بعد التنظيف الطارئ: ${formatStorageSize(getStorageSize())}`);
  }
};

/**
 * بدء التنظيف الدوري
 */
export const startPeriodicCleanup = (): void => {
  // تنظيف فوري عند بدء التطبيق
  cleanupLocalStorage();
  emergencyCleanup();
  
  // تنظيف دوري كل 5 دقائق
  setInterval(() => {
    cleanupLocalStorage();
  }, 5 * 60 * 1000);
};
