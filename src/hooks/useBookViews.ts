import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBookViews = (bookId: string) => {
  const [hasIncrementedView, setHasIncrementedView] = useState(false);
  const [processedBookId, setProcessedBookId] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useBookViews] Hook called with bookId:', bookId);
    
    // التحقق من صحة bookId والتأكد من عدم معالجته مسبقاً
    if (!bookId || hasIncrementedView || processedBookId === bookId) {
      console.log('[useBookViews] Skipping - bookId:', bookId, 'hasIncrementedView:', hasIncrementedView, 'processedBookId:', processedBookId);
      return;
    }

    // تعيين الكتاب كمعالج لمنع المعالجة المتكررة
    setProcessedBookId(bookId);

    const incrementBookViews = async () => {
      try {
        console.log('زيادة عدد المشاهدات للكتاب:', bookId);
        
        // استخدام دالة increment_book_views التي لها صلاحيات أعلى
        const { error } = await supabase.rpc('increment_book_views', {
          p_book_id: bookId
        });

        if (error) {
          console.error('خطأ في زيادة عدد المشاهدات:', error);
        } else {
          console.log('تم زيادة عدد المشاهدات بنجاح للكتاب:', bookId);
          setHasIncrementedView(true);
        }
      } catch (err) {
        console.error('خطأ غير متوقع في زيادة المشاهدات:', err);
      }
    };

    // تأخير للتأكد من أن المستخدم فعلاً بدأ القراءة
    const timer = setTimeout(() => {
      console.log('[useBookViews] Timer executed, calling incrementBookViews');
      incrementBookViews();
    }, 3000);

    return () => clearTimeout(timer);
  }, [bookId]); // إزالة hasIncrementedView من dependency array

  return { hasIncrementedView };
};