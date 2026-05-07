// نظام إدارة تاريخ التنقل - localStorage فقط (بدون Supabase لتحسين الأداء)

// Strip sensitive query parameters from paths before storage
function sanitizePath(path: string): string {
  try {
    const url = new URL(path, 'https://placeholder.com');
    const sensitiveParams = ['token', 'key', 'secret', 'auth', 'password', 'access_token', '__lovable_token'];
    sensitiveParams.forEach(param => url.searchParams.delete(param));
    // Also remove any param containing 'token' or 'key' (case-insensitive)
    for (const [key] of [...url.searchParams.entries()]) {
      if (/token|key|secret|auth|password/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.pathname + url.search + url.hash;
  } catch {
    // Fallback regex strip for non-URL paths
    return path.replace(/[?&](__lovable_token|token|key|secret|auth|access_token|password)=[^&]*/gi, '').replace(/\?$/, '');
  }
}

interface NavigationState {
  path: string;
  scrollPosition: number;
  timestamp: number;
  pageData?: any;
}

export class NavigationHistoryManager {
  // حفظ حالة الصفحة الحالية في localStorage فقط
  static async saveCurrentState(path: string, pageData?: any): Promise<void> {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    const state: NavigationState = {
      path: sanitizePath(path),
      scrollPosition,
      timestamp: Date.now(),
      pageData
    };
    
    try {
      localStorage.setItem('navigation_history_backup', JSON.stringify(state));
    } catch (error) {
      // silent fail
    }
  }

  // استرجاع الحالة المحفوظة
  static async getSavedState(): Promise<NavigationState | null> {
    try {
      const saved = localStorage.getItem('navigation_history_backup');
      if (!saved) return null;
      
      const state: NavigationState = JSON.parse(saved);
      
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > oneHour) {
        localStorage.removeItem('navigation_history_backup');
        return null;
      }
      
      return state;
    } catch (error) {
      localStorage.removeItem('navigation_history_backup');
      return null;
    }
  }

  // مسح الحالة المحفوظة
  static async clearSavedState(): Promise<void> {
    try {
      localStorage.removeItem('navigation_history_backup');
    } catch (error) {
      // silent fail
    }
  }

  // استعادة موضع التمرير
  static restoreScrollPosition(position: number): void {
    setTimeout(() => {
      window.scrollTo({ top: position, left: 0, behavior: 'smooth' });
    }, 300);
  }

  static isBookPath(path: string): boolean {
    return path.includes('/book/') && !path.includes('/book/reading/');
  }

  static isReadingPath(path: string): boolean {
    return path.includes('/book/reading/');
  }
}
