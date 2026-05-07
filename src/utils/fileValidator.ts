import { supabase } from '@/integrations/supabase/client';

export const validateFileUrl = (url: string): boolean => {
  if (!url) return false;
  
  // التحقق من صحة الرابط
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export const enhanceFileUrl = async (url: string): Promise<string> => {
  if (!url) return '';
  
  try {
    // التحقق من وجود الملف أولاً
    const fileExists = await checkFileExistsInStorage(url);
    
    if (!fileExists) {
      console.warn('⚠️ ملف غير موجود في التخزين:', url);
      // يمكن تسجيل الملف المفقود هنا
      return '';
    }
    
    return addCorsParameters(url);
  } catch (error) {
    console.warn('تحذير: خطأ في تحسين رابط الملف:', error);
    return addCorsParameters(url);
  }
};

// دالة للتحقق من وجود الملف في storage
const checkFileExistsInStorage = async (fileUrl: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('check_file_exists_in_storage', { file_url: fileUrl });
    
    if (error) {
      console.error('خطأ في التحقق من وجود الملف:', error);
      return false;
    }
    
    return data as boolean;
  } catch (error) {
    console.error('خطأ في التحقق من وجود الملف:', error);
    return false;
  }
};

// دالة احتياطية لإضافة معاملات CORS محلياً
const addCorsParameters = (url: string): string => {
  if (!url.includes('supabase')) return url;
  
  try {
    const urlObj = new URL(url);
    
    // إضافة معاملات مفيدة لتحسين العرض
    if (!urlObj.searchParams.has('t')) {
      urlObj.searchParams.set('t', Date.now().toString());
    }
    
    // إضافة معاملات CORS إذا كان رابط Supabase
    if (!urlObj.searchParams.has('download')) {
      urlObj.searchParams.set('download', 'true');
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
};

// دالة لإنشاء رابط محسن للعرض المباشر
export const createOptimizedFileUrl = (url: string, fileType: string = 'pdf'): string => {
  if (!url || !url.includes('supabase')) return url;
  
  try {
    const urlObj = new URL(url);
    
    // إزالة المعاملات القديمة
    urlObj.searchParams.delete('download');
    urlObj.searchParams.delete('cors');
    
    // إضافة معاملات محسنة للعرض حسب نوع الملف
    switch (fileType) {
      case 'pdf':
        urlObj.searchParams.set('response-content-type', 'application/pdf');
        urlObj.searchParams.set('response-content-disposition', 'inline');
        break;
      case 'doc':
        urlObj.searchParams.set('response-content-type', 'application/msword');
        urlObj.searchParams.set('response-content-disposition', 'attachment');
        break;
      case 'docx':
        urlObj.searchParams.set('response-content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        urlObj.searchParams.set('response-content-disposition', 'attachment');
        break;
      case 'txt':
        urlObj.searchParams.set('response-content-type', 'text/plain');
        urlObj.searchParams.set('response-content-disposition', 'inline');
        break;
      default:
        urlObj.searchParams.set('response-content-type', 'application/pdf');
        urlObj.searchParams.set('response-content-disposition', 'inline');
    }
    
    urlObj.searchParams.set('t', Date.now().toString());
    
    return urlObj.toString();
  } catch {
    return url;
  }
};

// دالة للتحقق من نوع الملف المدعوم
export const isValidFileType = (fileName: string, mimeType?: string): boolean => {
  const supportedExtensions = ['pdf', 'doc', 'docx', 'txt'];
  const supportedMimeTypes = [
    'application/pdf',
    'application/x-pdf',
    'text/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  
  const extension = fileName.toLowerCase().split('.').pop();
  
  return supportedExtensions.includes(extension || '') || 
         (mimeType && supportedMimeTypes.includes(mimeType));
};

// دالة لاستخراج نوع الملف من الاسم أو MIME type
export const getFileTypeFromFile = (fileName: string, mimeType?: string): string => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  if (extension === 'pdf' || mimeType?.includes('pdf')) return 'pdf';
  if (extension === 'doc' || mimeType?.includes('msword')) return 'doc';
  if (extension === 'docx' || mimeType?.includes('wordprocessingml')) return 'docx';
  if (extension === 'txt' || mimeType?.includes('text/plain')) return 'txt';
  
  return 'pdf'; // افتراضي
};