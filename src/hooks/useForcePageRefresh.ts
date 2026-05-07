// Hook لإجبار تحديث الصفحة عند التنقل بين الكتب والأقسام
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavigationHistoryManager } from '@/utils/navigationHistory';

interface UseForcePageRefreshOptions {
  enabled?: boolean;
  excludePaths?: string[];
  forceRefreshOnBookChange?: boolean;
  forceRefreshOnCategoryChange?: boolean;
}

export const useForcePageRefresh = (options: UseForcePageRefreshOptions = {}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const prevLocationRef = useRef<string>('');
  const isInitialMount = useRef(true);

  const {
    enabled = true,
    excludePaths = ['/auth', '/upload-book', '/admin'],
    forceRefreshOnBookChange = true,
    forceRefreshOnCategoryChange = true
  } = options;

  useEffect(() => {
    if (!enabled) return;

    // تجاهل التحديث في أول تحميل للصفحة
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevLocationRef.current = location.pathname;
      return;
    }

    const currentPath = location.pathname;
    const previousPath = prevLocationRef.current;

    // تحقق من المسارات المستثناة
    const isExcludedPath = excludePaths.some(path => 
      currentPath.startsWith(path) || previousPath.startsWith(path)
    );

    if (isExcludedPath) {
      prevLocationRef.current = currentPath;
      return;
    }

    let shouldForceRefresh = false;

    // تحديث عند الانتقال إلى كتاب جديد
    if (forceRefreshOnBookChange) {
      const isBookPage = currentPath.includes('/book/');
      const wasPreviouslyBookPage = previousPath.includes('/book/');
      
      if (isBookPage && wasPreviouslyBookPage && currentPath !== previousPath) {
        shouldForceRefresh = true;
        console.log('🔄 إجبار تحديث الصفحة - انتقال إلى كتاب جديد:', currentPath);
      }
    }

    // تحديث عند الانتقال إلى قسم جديد
    if (forceRefreshOnCategoryChange) {
      const isCategoryPage = currentPath.includes('/categories') || currentPath.includes('/category/');
      const wasPreviouslyCategoryPage = previousPath.includes('/categories') || previousPath.includes('/category/');
      
      if (isCategoryPage && wasPreviouslyCategoryPage && currentPath !== previousPath) {
        shouldForceRefresh = true;
        console.log('🔄 إجبار تحديث الصفحة - انتقال إلى قسم جديد:', currentPath);
      }
    }

    if (shouldForceRefresh) {
      // حفظ الحالة الحالية قبل التحديث
      NavigationHistoryManager.saveCurrentState(currentPath);
      
      // إجبار تحديث الصفحة
      setTimeout(() => {
        window.location.href = currentPath;
      }, 100);
    }

    prevLocationRef.current = currentPath;
  }, [location.pathname, enabled, excludePaths, forceRefreshOnBookChange, forceRefreshOnCategoryChange]);

  // دالة للتنقل مع التحديث الإجباري
  const navigateWithRefresh = (path: string, saveCurrentState = true) => {
    if (saveCurrentState) {
      NavigationHistoryManager.saveCurrentState(location.pathname + location.search);
    }
    
    // التنقل أولاً
    navigate(path);
    
    // ثم إجبار التحديث
    setTimeout(() => {
      window.location.href = path;
    }, 100);
  };

  return {
    navigateWithRefresh,
    currentPath: location.pathname
  };
};