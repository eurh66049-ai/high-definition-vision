import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFileErrorReporter = () => {
  
  // تسجيل خطأ في تحميل الصورة
  const reportImageError = useCallback(async (
    bookId: string,
    imageUrl: string,
    imageType: 'cover' | 'author_image',
    errorMessage?: string
  ) => {
    try {
      console.warn(`⚠️ خطأ في تحميل ${imageType === 'cover' ? 'غلاف' : 'صورة مؤلف'} الكتاب:`, bookId);
      
      // تسجيل الخطأ في قاعدة البيانات
      const { error } = await supabase
        .rpc('log_missing_file', {
          p_book_id: bookId,
          p_file_url: imageUrl,
          p_file_type: imageType,
          p_error_message: errorMessage || `فشل في تحميل ${imageType === 'cover' ? 'صورة الغلاف' : 'صورة المؤلف'}`
        });
      
      if (error) {
        console.error('فشل في تسجيل خطأ الصورة:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('خطأ في تسجيل خطأ الصورة:', err);
      return false;
    }
  }, []);

  // تسجيل خطأ في تحميل PDF
  const reportPDFError = useCallback(async (
    bookId: string,
    pdfUrl: string,
    errorMessage?: string
  ) => {
    try {
      console.warn(`⚠️ خطأ في تحميل PDF للكتاب:`, bookId);
      
      const { error } = await supabase
        .rpc('log_missing_file', {
          p_book_id: bookId,
          p_file_url: pdfUrl,
          p_file_type: 'pdf',
          p_error_message: errorMessage || 'فشل في تحميل ملف PDF'
        });
      
      if (error) {
        console.error('فشل في تسجيل خطأ PDF:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('خطأ في تسجيل خطأ PDF:', err);
      return false;
    }
  }, []);

  // التحقق من وجود ملف في التخزين
  const checkFileExists = useCallback(async (fileUrl: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('check_file_exists_in_storage', { file_url: fileUrl });
      
      if (error) {
        console.error('خطأ في التحقق من وجود الملف:', error);
        return false;
      }
      
      return data as boolean;
    } catch (err) {
      console.error('خطأ في التحقق من وجود الملف:', err);
      return false;
    }
  }, []);

  // معالج صورة محسن مع تسجيل الأخطاء
  const createImageErrorHandler = useCallback((
    bookId: string,
    imageType: 'cover' | 'author_image'
  ) => {
    return async (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = event.currentTarget;
      const imageUrl = img.src;

      // إعادة المحاولة عدة مرات مع تأخير متزايد - لا نستبدل الصورة الأصلية أبداً
      // الفشل في العميل لا يعني أن الصورة مفقودة فعلياً (قد يكون الإنترنت ضعيفاً)
      const retryCount = parseInt(img.dataset.retryCount || '0', 10);
      const maxRetries = 5;
      if (retryCount < maxRetries && imageUrl && !imageUrl.includes('placeholder')) {
        img.dataset.retryCount = String(retryCount + 1);
        const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s, 8s, 16s
        const sep = imageUrl.includes('?') ? '&' : '?';
        setTimeout(() => { img.src = `${imageUrl}${sep}_retry=${Date.now()}`; }, delay);
        return;
      }

      // بعد فشل كل المحاولات: لا نستبدل ولا نسجل في قاعدة البيانات
      // الصورة الأصلية تبقى - المستخدم يمكنه إعادة تحميل الصفحة عند تحسن الإنترنت
      img.onerror = null;
    };
  }, [reportImageError]);

  return {
    reportImageError,
    reportPDFError,
    checkFileExists,
    createImageErrorHandler
  };
};