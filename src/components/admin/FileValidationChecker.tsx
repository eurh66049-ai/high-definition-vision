import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Image, 
  FileText,
  Loader2,
  RefreshCw,
  Download
} from 'lucide-react';

interface FileValidationResult {
  title: string;
  author: string;
  coverUrl: string;
  bookFileUrl: string;
  coverStatus: 'valid' | 'invalid' | 'pending' | 'missing';
  bookFileStatus: 'valid' | 'invalid' | 'pending' | 'missing';
  coverError?: string;
  bookFileError?: string;
}

interface CSVBookInput {
  title: string;
  author: string;
  cover_image_url?: string;
  book_file_url?: string;
}

interface FileValidationCheckerProps {
  books: CSVBookInput[];
  onValidationComplete?: (results: FileValidationResult[]) => void;
}

// استخراج معلومات المسار من رابط Supabase Storage
const extractStoragePathFromUrl = (url: string): { bucket: string; path: string } | null => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // نمط رابط Supabase Storage: /storage/v1/object/public/bucket-name/path/to/file
    const storageMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    
    if (storageMatch) {
      return {
        bucket: storageMatch[1],
        path: decodeURIComponent(storageMatch[2].split('?')[0]) // إزالة query params
      };
    }
    
    return null;
  } catch {
    return null;
  }
};

// التحقق من وجود ملف في Supabase Storage باستخدام download مع range
const checkFileInSupabaseStorage = async (
  bucket: string, 
  path: string
): Promise<{ exists: boolean; error?: string; size?: number }> => {
  try {
    // استخدام createSignedUrl للتحقق من وجود الملف
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60); // صلاحية دقيقة واحدة

    if (signedError) {
      // إذا كان الخطأ بسبب عدم وجود الملف
      if (signedError.message.includes('not found') || signedError.message.includes('Object not found')) {
        return { exists: false, error: 'الملف غير موجود في Storage' };
      }
      
      // محاولة باستخدام getPublicUrl
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      if (publicData?.publicUrl) {
        // التحقق بطلب HEAD
        try {
          const response = await fetch(publicData.publicUrl, { 
            method: 'HEAD',
            cache: 'no-store'
          });
          
          if (response.ok) {
            const contentLength = response.headers.get('content-length');
            return { 
              exists: true, 
              size: contentLength ? parseInt(contentLength) : undefined 
            };
          }
          
          return { exists: false, error: `HTTP ${response.status}` };
        } catch (fetchError) {
          return { exists: false, error: 'فشل في الوصول للملف' };
        }
      }
      
      return { exists: false, error: signedError.message };
    }

    // إذا نجح إنشاء الرابط الموقّع، الملف موجود
    if (signedData?.signedUrl) {
      // createSignedUrl نجح => الملف موجود. نحاول فحص سريع بدون false negatives.
      try {
        const response = await fetch(signedData.signedUrl, {
          method: 'HEAD',
          cache: 'no-store'
        });

        // بعض الخوادم/الروابط الموقعة قد لا تدعم HEAD بشكل موثوق
        if (!response.ok) {
          return { exists: true };
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          const size = parseInt(contentLength);
          if (!Number.isNaN(size) && size > 0 && size < 100) {
            return { exists: false, error: 'الملف فارغ أو تالف' };
          }
          return { exists: true, size };
        }

        return { exists: true };
      } catch {
        return { exists: true };
      }
    }

    return { exists: false, error: 'فشل في التحقق' };
  } catch (error) {
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
};

// التحقق من رابط خارجي (غير Supabase)
const checkExternalUrl = async (url: string): Promise<{ exists: boolean; error?: string }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const contentLength = response.headers.get('content-length');

      // بعض السيرفرات لا ترجع content-length في HEAD (chunked)، لا نعتبره فشلًا
      if (contentLength) {
        const size = parseInt(contentLength);
        if (!Number.isNaN(size) && size > 0 && size < 100) {
          return { exists: false, error: 'الملف فارغ أو تالف' };
        }
      }

      return { exists: true };
    }

    if (response.status === 404) {
      return { exists: false, error: 'الملف غير موجود (404)' };
    }
    if (response.status === 403) {
      return { exists: false, error: 'الوصول محظور (403)' };
    }

    return { exists: false, error: `خطأ HTTP ${response.status}` };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { exists: false, error: 'انتهت مهلة الاتصال' };
    }

    // في المتصفح قد تفشل fetch بسبب CORS حتى لو الرابط يعمل عند فتحه مباشرة.
    // في هذه الحالة لا نُرجع "مفقود" حتى لا نعطي نتيجة خاطئة.
    if (error instanceof TypeError) {
      return { exists: true };
    }
    
    // محاولة ثانية بـ GET مع range
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Range': 'bytes=0-1024' },
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 206) {
        return { exists: true };
      }

      return { exists: false, error: `خطأ HTTP ${response.status}` };
    } catch {
      return { exists: false, error: 'فشل في الوصول للملف' };
    }
  }
};

// الدالة الرئيسية للتحقق من أي رابط
const validateFileUrl = async (url: string): Promise<{ valid: boolean; error?: string }> => {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'الرابط فارغ' };
  }

  // التحقق من صحة URL
  try {
    new URL(url);
  } catch {
    return { valid: false, error: 'رابط غير صالح' };
  }

  // التحقق إذا كان رابط Supabase Storage
  const storagePath = extractStoragePathFromUrl(url);
  
  if (storagePath) {
    console.log(`🔍 فحص Supabase Storage: ${storagePath.bucket}/${storagePath.path}`);
    const result = await checkFileInSupabaseStorage(storagePath.bucket, storagePath.path);
    return { valid: result.exists, error: result.error };
  }

  // رابط خارجي
  console.log(`🔍 فحص رابط خارجي: ${url}`);
  const result = await checkExternalUrl(url);
  return { valid: result.exists, error: result.error };
};

const FileValidationChecker: React.FC<FileValidationCheckerProps> = ({ 
  books, 
  onValidationComplete 
}) => {
  const [validationResults, setValidationResults] = useState<FileValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBook, setCurrentBook] = useState('');

  const validateAllBooks = async () => {
    if (books.length === 0) return;

    setIsValidating(true);
    setProgress(0);
    setValidationResults([]);

    const results: FileValidationResult[] = [];

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      setCurrentBook(book.title);
      setProgress(((i + 1) / books.length) * 100);

      const result: FileValidationResult = {
        title: book.title,
        author: book.author,
        coverUrl: book.cover_image_url || '',
        bookFileUrl: book.book_file_url || '',
        coverStatus: 'pending',
        bookFileStatus: 'pending'
      };

      // التحقق من الغلاف
      if (!book.cover_image_url || book.cover_image_url.trim() === '') {
        result.coverStatus = 'missing';
        result.coverError = 'لا يوجد رابط غلاف';
      } else {
        const coverCheck = await validateFileUrl(book.cover_image_url);
        result.coverStatus = coverCheck.valid ? 'valid' : 'invalid';
        result.coverError = coverCheck.error;
      }

      // التحقق من ملف الكتاب
      if (!book.book_file_url || book.book_file_url.trim() === '') {
        result.bookFileStatus = 'missing';
        result.bookFileError = 'لا يوجد رابط ملف';
      } else {
        const bookCheck = await validateFileUrl(book.book_file_url);
        result.bookFileStatus = bookCheck.valid ? 'valid' : 'invalid';
        result.bookFileError = bookCheck.error;
      }

      results.push(result);
      setValidationResults([...results]);

      // تأخير قصير بين الطلبات
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsValidating(false);
    setCurrentBook('');
    onValidationComplete?.(results);
  };

  const getStats = () => {
    const stats = {
      total: validationResults.length,
      validCovers: validationResults.filter(r => r.coverStatus === 'valid').length,
      invalidCovers: validationResults.filter(r => r.coverStatus === 'invalid').length,
      missingCovers: validationResults.filter(r => r.coverStatus === 'missing').length,
      validFiles: validationResults.filter(r => r.bookFileStatus === 'valid').length,
      invalidFiles: validationResults.filter(r => r.bookFileStatus === 'invalid').length,
      missingFiles: validationResults.filter(r => r.bookFileStatus === 'missing').length,
    };
    return stats;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      default:
        return null;
    }
  };

  const exportInvalidBooks = () => {
    const invalidBooks = validationResults.filter(
      r => r.coverStatus === 'invalid' || r.bookFileStatus === 'invalid' || 
           r.coverStatus === 'missing' || r.bookFileStatus === 'missing'
    );

    const csvContent = [
      'العنوان,المؤلف,حالة الغلاف,خطأ الغلاف,حالة الملف,خطأ الملف,رابط الغلاف,رابط الملف',
      ...invalidBooks.map(book => 
        `"${book.title}","${book.author}","${book.coverStatus}","${book.coverError || ''}","${book.bookFileStatus}","${book.bookFileError || ''}","${book.coverUrl}","${book.bookFileUrl}"`
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invalid-books-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const problemBooks = validationResults.filter(
    r => r.coverStatus === 'invalid' || r.bookFileStatus === 'invalid'
  );

  const stats = getStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          فحص صلاحية الملفات (Supabase Storage)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* زر بدء الفحص */}
        <div className="flex gap-2">
          <Button
            onClick={validateAllBooks}
            disabled={isValidating || books.length === 0}
            className="flex-1"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الفحص...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 ml-2" />
                فحص {books.length} كتاب
              </>
            )}
          </Button>
          
          {problemBooks.length > 0 && (
            <Button variant="outline" onClick={exportInvalidBooks}>
              <Download className="h-4 w-4 ml-2" />
              تصدير المشاكل
            </Button>
          )}
        </div>

        {/* شريط التقدم */}
        {isValidating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              جاري فحص: {currentBook}
            </p>
          </div>
        )}

        {/* ملخص النتائج */}
        {validationResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Image className="h-4 w-4 text-green-600" />
                <span className="text-lg font-bold text-green-600">{stats.validCovers}</span>
              </div>
              <p className="text-xs text-muted-foreground">أغلفة صالحة</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Image className="h-4 w-4 text-red-600" />
                <span className="text-lg font-bold text-red-600">{stats.invalidCovers + stats.missingCovers}</span>
              </div>
              <p className="text-xs text-muted-foreground">أغلفة تالفة/مفقودة</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-lg font-bold text-green-600">{stats.validFiles}</span>
              </div>
              <p className="text-xs text-muted-foreground">ملفات صالحة</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FileText className="h-4 w-4 text-red-600" />
                <span className="text-lg font-bold text-red-600">{stats.invalidFiles + stats.missingFiles}</span>
              </div>
              <p className="text-xs text-muted-foreground">ملفات تالفة/مفقودة</p>
            </div>
          </div>
        )}

        {/* تنبيه للمشاكل */}
        {problemBooks.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              تم العثور على {problemBooks.length} كتاب بملفات أو أغلفة غير صالحة
            </AlertDescription>
          </Alert>
        )}

        {/* قائمة الكتب ذات المشاكل */}
        {problemBooks.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">الكتب ذات المشاكل:</h4>
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-3 space-y-3">
                {problemBooks.map((book, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-sm">{book.title}</h5>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {book.coverStatus === 'invalid' && (
                        <div className="flex items-center gap-2 text-xs">
                          {getStatusIcon('invalid')}
                          <span className="text-red-600 dark:text-red-400">
                            الغلاف: {book.coverError}
                          </span>
                        </div>
                      )}
                      {book.bookFileStatus === 'invalid' && (
                        <div className="flex items-center gap-2 text-xs">
                          {getStatusIcon('invalid')}
                          <span className="text-red-600 dark:text-red-400">
                            الملف: {book.bookFileError}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* عرض الروابط للتحقق اليدوي */}
                    <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">عرض الروابط</summary>
                        <div className="mt-1 space-y-1 break-all">
                          <p><strong>الغلاف:</strong> {book.coverUrl || 'غير موجود'}</p>
                          <p><strong>الملف:</strong> {book.bookFileUrl || 'غير موجود'}</p>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* جميع النتائج */}
        {validationResults.length > 0 && !isValidating && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              عرض جميع النتائج ({validationResults.length} كتاب)
            </summary>
            <ScrollArea className="h-64 mt-2 border rounded-lg">
              <div className="p-3 space-y-2">
                {validationResults.map((result, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.author}</p>
                    </div>
                    <div className="flex items-center gap-2 mr-2">
                      <div className="flex items-center gap-1" title="الغلاف">
                        <Image className="h-3 w-3" />
                        {getStatusIcon(result.coverStatus)}
                      </div>
                      <div className="flex items-center gap-1" title="الملف">
                        <FileText className="h-3 w-3" />
                        {getStatusIcon(result.bookFileStatus)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export default FileValidationChecker;
