// Hook لإدارة تاريخ التنقل وحفظ حالة الصفحة
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavigationHistoryManager } from '@/utils/navigationHistory';

interface UseNavigationHistoryOptions {
  autoSave?: boolean; // حفظ الحالة تلقائياً عند تغيير المسار
  handleBrowserBack?: boolean; // التعامل مع زر الرجوع في المتصفح
}

export const useNavigationHistory = (options: UseNavigationHistoryOptions = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { autoSave = true, handleBrowserBack = false } = options;
  const isInitialMount = useRef(true);

  // حفظ الحالة الحالية مع بيانات إضافية
  const saveCurrentState = useCallback((pageData?: any) => {
    // عدم حفظ الحالة إذا كنا في صفحة كتاب أو قراءة كتاب
    if (NavigationHistoryManager.isBookPath(location.pathname) || 
        NavigationHistoryManager.isReadingPath(location.pathname)) {
      return;
    }
    
    // حفظ البيانات مع معلومات الصفحة الحالية
    const currentPageData = {
      timestamp: Date.now(),
      pathname: location.pathname,
      search: location.search,
      ...pageData
    };
    
    NavigationHistoryManager.saveCurrentState(
      location.pathname + location.search, 
      currentPageData
    );
  }, [location.pathname, location.search]);

  // الانتقال إلى كتاب - فوري بدون انتظار حفظ الحالة
  const navigateToBook = useCallback((bookPath: string) => {
    // التنقل فوراً أولاً
    navigate(bookPath);
    
    // حفظ الحالة في الخلفية بدون حجب التنقل
    if (!NavigationHistoryManager.isBookPath(location.pathname) && 
        !NavigationHistoryManager.isReadingPath(location.pathname)) {
      requestAnimationFrame(() => {
        saveCurrentState();
      });
    }
  }, [navigate, saveCurrentState, location.pathname]);

  // العودة للحالة المحفوظة
  const goToPreviousState = useCallback(async () => {
    const savedState = await NavigationHistoryManager.getSavedState();
    
    if (savedState) {
      console.log('العودة للحالة المحفوظة:', savedState);
      await NavigationHistoryManager.clearSavedState();
      
      // التنقل للمسار المحفوظ
      navigate(savedState.path, { replace: true });
      
      // استعادة موضع التمرير بعد التنقل
      NavigationHistoryManager.restoreScrollPosition(savedState.scrollPosition);
      
      return true; // نجح في العودة للحالة المحفوظة
    }
    
    return false; // لا توجد حالة محفوظة
  }, [navigate]);

  // التعامل مع زر الرجوع في المتصفح للصفحات التي تحتاج معالجة خاصة
  useEffect(() => {
    if (!handleBrowserBack) return;

    const handlePopState = (event: PopStateEvent) => {
      console.log('تم الضغط على زر الرجوع في المتصفح');
      
      // التحقق إذا كنا في صفحة كتاب
      if (NavigationHistoryManager.isBookPath(location.pathname)) {
        console.log('معالجة زر الرجوع من صفحة الكتاب');
        event.preventDefault();
        
        const restored = goToPreviousState();
        if (!restored) {
          // إذا لم توجد حالة محفوظة، العودة للصفحة الرئيسية
          navigate('/', { replace: true });
        }
      }
    };

    // إضافة مستمع للبدلة popstate
    window.addEventListener('popstate', handlePopState);
    
    // تنظيف المستمع عند الإلغاء
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleBrowserBack, goToPreviousState, navigate, location.pathname]);

  // حفظ الحالة عند مغادرة الصفحة (ليس الكتب)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!NavigationHistoryManager.isBookPath(location.pathname) && 
          !NavigationHistoryManager.isReadingPath(location.pathname)) {
        saveCurrentState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveCurrentState, location.pathname]);

  return {
    saveCurrentState,
    navigateToBook,
    goToPreviousState,
    clearHistory: NavigationHistoryManager.clearSavedState
  };
};