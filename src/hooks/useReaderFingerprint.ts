import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReadingBehavior {
  pageNumber: number;
  timeSpent: number;
  scrollBacks: number;
  isPause: boolean;
  isReread: boolean;
  isSlow: boolean;
}

interface PageHint {
  paragraph_index: number;
  hint_type: string;
  hint_message: string;
  relevance_score: number;
}

interface UseReaderFingerprintOptions {
  bookId: string;
  currentPage: number;
  enabled?: boolean;
}

// توليد معرف جلسة مجهول فريد
const getSessionId = (): string => {
  const key = 'reader_session_id';
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

export const useReaderFingerprint = ({
  bookId,
  currentPage,
  enabled = true
}: UseReaderFingerprintOptions) => {
  const [hints, setHints] = useState<PageHint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  
  // متتبعات السلوك
  const pageStartTimeRef = useRef<number>(Date.now());
  const lastPageRef = useRef<number>(currentPage);
  const scrollBackCountRef = useRef<number>(0);
  const pauseDetectedRef = useRef<boolean>(false);
  const lastScrollTimeRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(getSessionId());
  
  // عتبات الكشف
  const PAUSE_THRESHOLD_MS = 8000; // 8 ثوانٍ للتوقف
  const SLOW_READ_THRESHOLD_MS = 15000; // 15 ثانية للقراءة البطيئة
  const SCROLL_IDLE_THRESHOLD_MS = 5000; // 5 ثوانٍ بدون تمرير = توقف

  // تسجيل سلوك القراءة
  const recordBehavior = useCallback(async (behavior: ReadingBehavior) => {
    if (!enabled || !bookId) return;
    
    try {
      // تحديث البصمة المجمعة
      await supabase.rpc('update_reader_fingerprint', {
        p_book_id: bookId,
        p_page_number: behavior.pageNumber,
        p_paragraph_index: 0,
        p_is_pause: behavior.isPause,
        p_is_reread: behavior.isReread,
        p_is_slow: behavior.isSlow
      });

      console.log('📊 تم تسجيل بصمة القراءة:', {
        page: behavior.pageNumber,
        pause: behavior.isPause,
        reread: behavior.isReread,
        slow: behavior.isSlow
      });
    } catch (error) {
      console.error('خطأ في تسجيل بصمة القراءة:', error);
    }
  }, [bookId, enabled]);

  // جلب التلميحات للصفحة الحالية
  const fetchHints = useCallback(async (pageNumber: number) => {
    if (!enabled || !bookId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_page_hints', {
        p_book_id: bookId,
        p_page_number: pageNumber
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setHints(data);
        console.log('💡 تلميحات الصفحة:', data);
      } else {
        setHints([]);
      }
    } catch (error) {
      console.error('خطأ في جلب التلميحات:', error);
      setHints([]);
    }
  }, [bookId, enabled]);

  // كشف التوقف (عدم التفاعل)
  const startIdleDetection = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    idleTimerRef.current = setTimeout(() => {
      pauseDetectedRef.current = true;
      console.log('⏸️ تم كشف توقف القارئ');
    }, PAUSE_THRESHOLD_MS);
  }, []);

  // إعادة ضبط كاشف التوقف عند التفاعل
  const resetIdleDetection = useCallback(() => {
    lastScrollTimeRef.current = Date.now();
    startIdleDetection();
  }, [startIdleDetection]);

  // معالجة تغيير الصفحة
  useEffect(() => {
    if (!enabled) return;
    
    const prevPage = lastPageRef.current;
    const timeSpent = Date.now() - pageStartTimeRef.current;
    
    // كشف إعادة القراءة (الرجوع للخلف)
    const isReread = currentPage < prevPage;
    if (isReread) {
      scrollBackCountRef.current += 1;
      console.log('🔄 كشف إعادة قراءة - رجوع من صفحة', prevPage, 'إلى', currentPage);
    }
    
    // كشف القراءة البطيئة
    const isSlow = timeSpent > SLOW_READ_THRESHOLD_MS;
    
    // تسجيل سلوك الصفحة السابقة
    if (prevPage !== currentPage && prevPage > 0) {
      recordBehavior({
        pageNumber: prevPage,
        timeSpent,
        scrollBacks: scrollBackCountRef.current,
        isPause: pauseDetectedRef.current,
        isReread: false, // الصفحة السابقة ليست reread
        isSlow
      });
      
      // إعادة ضبط المتتبعات للصفحة الجديدة
      pauseDetectedRef.current = false;
      scrollBackCountRef.current = 0;
    }
    
    // تحديث المراجع
    lastPageRef.current = currentPage;
    pageStartTimeRef.current = Date.now();
    
    // جلب التلميحات للصفحة الجديدة
    fetchHints(currentPage);
    
    // بدء كشف التوقف
    startIdleDetection();
    
    // تسجيل reread إذا كان رجوع
    if (isReread) {
      recordBehavior({
        pageNumber: currentPage,
        timeSpent: 0,
        scrollBacks: 1,
        isPause: false,
        isReread: true,
        isSlow: false
      });
    }
    
  }, [currentPage, enabled, recordBehavior, fetchHints, startIdleDetection]);

  // تتبع التمرير داخل الصفحة
  const handleScroll = useCallback(() => {
    resetIdleDetection();
  }, [resetIdleDetection]);

  // تتبع النقر/اللمس
  const handleInteraction = useCallback(() => {
    resetIdleDetection();
  }, [resetIdleDetection]);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      
      // تسجيل آخر صفحة عند المغادرة
      const timeSpent = Date.now() - pageStartTimeRef.current;
      if (lastPageRef.current > 0) {
        recordBehavior({
          pageNumber: lastPageRef.current,
          timeSpent,
          scrollBacks: scrollBackCountRef.current,
          isPause: pauseDetectedRef.current,
          isReread: false,
          isSlow: timeSpent > SLOW_READ_THRESHOLD_MS
        });
      }
    };
  }, [recordBehavior]);

  // بدء التتبع
  useEffect(() => {
    if (enabled && bookId) {
      setIsTracking(true);
      console.log('🔍 بدء تتبع بصمة القارئ للكتاب:', bookId);
    }
    
    return () => {
      setIsTracking(false);
    };
  }, [enabled, bookId]);

  return {
    hints,
    isTracking,
    handleScroll,
    handleInteraction,
    // للاستخدام اليدوي إذا لزم الأمر
    recordPause: () => {
      pauseDetectedRef.current = true;
    }
  };
};

export default useReaderFingerprint;
