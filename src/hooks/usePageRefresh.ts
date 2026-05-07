
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface UsePageRefreshOptions {
  refreshOnBookChange?: boolean;
  refreshOnCategoryChange?: boolean;
  refreshOnAuthorChange?: boolean;
  excludePaths?: string[];
  delay?: number;
}

export const usePageRefresh = (options: UsePageRefreshOptions = {}) => {
  const location = useLocation();
  const prevLocationRef = useRef<string>('');
  const isInitialMount = useRef(true);

  const {
    refreshOnBookChange = true,
    refreshOnCategoryChange = true,
    refreshOnAuthorChange = true,
    excludePaths = ['/auth', '/upload-book', '/admin'],
    delay = 100
  } = options;

  useEffect(() => {
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

    let shouldRefresh = false;

    // تحديث عند الانتقال إلى كتاب جديد
    if (refreshOnBookChange) {
      const isBookPage = currentPath.includes('/book/');
      const wasPreviouslyBookPage = previousPath.includes('/book/');
      
      if (isBookPage && (!wasPreviouslyBookPage || currentPath !== previousPath)) {
        shouldRefresh = true;
        console.log('🔄 تحديث الصفحة - انتقال إلى كتاب جديد:', currentPath);
      }
    }

    // تحديث عند الانتقال إلى قسم جديد
    if (refreshOnCategoryChange) {
      const isCategoryPage = currentPath.includes('/categories') || currentPath.includes('/category/');
      const wasPreviouslyCategoryPage = previousPath.includes('/categories') || previousPath.includes('/category/');
      
      if (isCategoryPage && (!wasPreviouslyCategoryPage || currentPath !== previousPath)) {
        shouldRefresh = true;
        console.log('🔄 تحديث الصفحة - انتقال إلى قسم جديد:', currentPath);
      }
    }

    // تحديث عند الانتقال إلى مؤلف جديد
    if (refreshOnAuthorChange) {
      const isAuthorPage = currentPath.includes('/author');
      const wasPreviouslyAuthorPage = previousPath.includes('/author');
      
      if (isAuthorPage && (!wasPreviouslyAuthorPage || currentPath !== previousPath)) {
        shouldRefresh = true;
        console.log('🔄 تحديث الصفحة - انتقال إلى مؤلف جديد:', currentPath);
      }
    }

    if (shouldRefresh) {
      // تأخير قصير للسماح للمكونات بالتحميل قبل التحديث
      setTimeout(() => {
        window.location.reload();
      }, delay);
    }

    prevLocationRef.current = currentPath;
  }, [location.pathname, refreshOnBookChange, refreshOnCategoryChange, refreshOnAuthorChange, excludePaths, delay]);

  return {
    currentPath: location.pathname,
    shouldRefresh: prevLocationRef.current !== location.pathname
  };
};
