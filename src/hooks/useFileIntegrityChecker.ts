import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileIntegrityStatus {
  book_id: string;
  title: string;
  missing_cover: boolean;
  missing_pdf: boolean;
  missing_author_image: boolean;
  cover_url: string;
  pdf_url: string;
  author_image_url: string;
}

interface MissingFileEntry {
  id: string;
  book_id: string;
  file_url: string;
  file_type: string;
  error_message: string;
  reported_at: string;
  status: string;
}

export const useFileIntegrityChecker = () => {
  const [integrityStatus, setIntegrityStatus] = useState<FileIntegrityStatus[]>([]);
  const [missingFiles, setMissingFiles] = useState<MissingFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فحص سلامة ملفات الكتب
  const checkFileIntegrity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 بدء فحص سلامة ملفات الكتب...');
      
      const { data, error: checkError } = await supabase
        .rpc('check_books_file_integrity');
      
      if (checkError) {
        console.error('خطأ في فحص سلامة الملفات:', checkError);
        setError('فشل في فحص سلامة الملفات');
        return;
      }
      
      const statusData = data as FileIntegrityStatus[];
      setIntegrityStatus(statusData);
      
      // عد الملفات المفقودة
      const missingCount = statusData.reduce((count, book) => {
        return count + 
          (book.missing_cover ? 1 : 0) + 
          (book.missing_pdf ? 1 : 0) + 
          (book.missing_author_image ? 1 : 0);
      }, 0);
      
      if (missingCount > 0) {
        console.warn(`⚠️ تم العثور على ${missingCount} ملف مفقود`);
        toast.warning(`تم العثور على ${missingCount} ملف مفقود في المكتبة`);
      } else {
        console.log('✅ جميع ملفات الكتب موجودة وسليمة');
        toast.success('جميع ملفات الكتب موجودة وسليمة');
      }
      
    } catch (err) {
      console.error('خطأ غير متوقع في فحص الملفات:', err);
      setError('خطأ غير متوقع في فحص الملفات');
    } finally {
      setLoading(false);
    }
  }, []);

  // جلب سجل الملفات المفقودة
  const fetchMissingFilesLog = useCallback(async () => {
    try {
      const { data, error: logError } = await supabase
        .from('missing_files_log')
        .select('*')
        .order('reported_at', { ascending: false })
        .limit(50);
      
      if (logError) {
        console.error('خطأ في جلب سجل الملفات المفقودة:', logError);
        return;
      }
      
      setMissingFiles(data || []);
    } catch (err) {
      console.error('خطأ في جلب سجل الملفات المفقودة:', err);
    }
  }, []);

  // استعادة الملفات المفقودة
  const restoreMissingFiles = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔧 بدء عملية استعادة الملفات المفقودة...');
      
      const { data, error: restoreError } = await supabase
        .rpc('restore_missing_files');
      
      if (restoreError) {
        console.error('خطأ في استعادة الملفات:', restoreError);
        toast.error('فشل في استعادة الملفات المفقودة');
        return;
      }
      
      const restoredCount = data as number;
      
      if (restoredCount > 0) {
        console.log(`✅ تم تسجيل ${restoredCount} ملف مفقود للمراجعة`);
        toast.success(`تم تسجيل ${restoredCount} ملف مفقود للمراجعة`);
        
        // تحديث البيانات
        await fetchMissingFilesLog();
        await checkFileIntegrity();
      } else {
        console.log('ℹ️ لم يتم العثور على ملفات مفقودة جديدة');
        toast.info('لم يتم العثور على ملفات مفقودة جديدة');
      }
      
    } catch (err) {
      console.error('خطأ في عملية الاستعادة:', err);
      toast.error('خطأ في عملية استعادة الملفات');
    } finally {
      setLoading(false);
    }
  }, [checkFileIntegrity, fetchMissingFilesLog]);

  // تسجيل ملف مفقود يدوياً
  const reportMissingFile = useCallback(async (
    bookId: string,
    fileUrl: string,
    fileType: string,
    errorMessage?: string
  ) => {
    try {
      const { error: reportError } = await supabase
        .rpc('log_missing_file', {
          p_book_id: bookId,
          p_file_url: fileUrl,
          p_file_type: fileType,
          p_error_message: errorMessage || 'تم الإبلاغ عنه من قبل المستخدم'
        });
      
      if (reportError) {
        console.error('خطأ في تسجيل الملف المفقود:', reportError);
        toast.error('فشل في تسجيل الملف المفقود');
        return false;
      }
      
      console.log(`📝 تم تسجيل ملف مفقود: ${fileType} للكتاب ${bookId}`);
      toast.success('تم تسجيل الملف المفقود بنجاح');
      
      // تحديث السجل
      await fetchMissingFilesLog();
      return true;
      
    } catch (err) {
      console.error('خطأ في تسجيل الملف المفقود:', err);
      toast.error('خطأ في تسجيل الملف المفقود');
      return false;
    }
  }, [fetchMissingFilesLog]);

  // فحص ملف واحد
  const checkSingleFile = useCallback(async (fileUrl: string): Promise<boolean> => {
    try {
      const { data, error: checkError } = await supabase
        .rpc('check_file_exists_in_storage', { file_url: fileUrl });
      
      if (checkError) {
        console.error('خطأ في فحص الملف:', checkError);
        return false;
      }
      
      return data as boolean;
    } catch (err) {
      console.error('خطأ في فحص الملف:', err);
      return false;
    }
  }, []);

  // فحص تلقائي عند التحميل
  useEffect(() => {
    checkFileIntegrity();
    fetchMissingFilesLog();
  }, [checkFileIntegrity, fetchMissingFilesLog]);

  return {
    integrityStatus,
    missingFiles,
    loading,
    error,
    checkFileIntegrity,
    restoreMissingFiles,
    reportMissingFile,
    checkSingleFile,
    fetchMissingFilesLog
  };
};