
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Download, ExternalLink, ArrowRight, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { useFileIntegrityChecker } from '@/hooks/useFileIntegrityChecker';

interface EnhancedPDFErrorHandlerProps {
  book: {
    id: string;
    title: string;
    author: string;
    book_file_url?: string;
  };
  onRetry: () => void;
  onBack: () => void;
}

const EnhancedPDFErrorHandler: React.FC<EnhancedPDFErrorHandlerProps> = ({
  book,
  onRetry,
  onBack
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasReportedMissing, setHasReportedMissing] = useState(false);
  const { reportMissingFile, checkSingleFile } = useFileIntegrityChecker();

  // التحقق من وجود الملف عند التحميل
  useEffect(() => {
    const checkFileStatus = async () => {
      if (book.book_file_url) {
        const exists = await checkSingleFile(book.book_file_url);
        if (!exists) {
          console.warn(`⚠️ ملف PDF مفقود للكتاب: ${book.title}`);
        }
      }
    };
    
    checkFileStatus();
  }, [book.book_file_url, book.title, checkSingleFile]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDirectDownload = () => {
    if (book.book_file_url) {
      // محاولة تحميل الملف مباشرة مع اسم الموقع
      const link = document.createElement('a');
      link.href = book.book_file_url;
      link.download = `kotobi-${book.title}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('تم بدء تحميل الكتاب');
    }
  };

  const handleOpenNewTab = () => {
    if (book.book_file_url) {
      window.open(book.book_file_url, '_blank', 'noopener,noreferrer');
    }
  };

  // الإبلاغ عن ملف مفقود
  const handleReportMissingFile = async () => {
    if (!book.book_file_url || hasReportedMissing) return;
    
    const success = await reportMissingFile(
      book.id,
      book.book_file_url,
      'pdf',
      `ملف PDF مفقود للكتاب: ${book.title}`
    );
    
    if (success) {
      setHasReportedMissing(true);
      toast.success('تم الإبلاغ عن الملف المفقود للإدارة');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2 font-amiri">
            مشكلة في تحميل الكتاب
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 font-cairo">
            لا يمكن عرض كتاب "{book.title}" حالياً. قد يكون الملف غير متوفر أو هناك مشكلة مؤقتة في الخادم.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  جاري إعادة المحاولة...
                </>
              ) : (
                <>
                  <RefreshCw className="ml-2 h-4 w-4" />
                  إعادة المحاولة
                </>
              )}
            </Button>

            {book.book_file_url && (
              <>
                <Button
                  onClick={handleOpenNewTab}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="ml-2 h-4 w-4" />
                  فتح في تبويب جديد
                </Button>

                <Button
                  onClick={handleDirectDownload}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="ml-2 h-4 w-4" />
                  تحميل الكتاب
                </Button>
              </>
            )}

            {book.book_file_url && !hasReportedMissing && (
              <Button
                onClick={handleReportMissingFile}
                variant="outline"
                className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <Bug className="ml-2 h-4 w-4" />
                الإبلاغ عن ملف مفقود
              </Button>
            )}

            <Button
              onClick={onBack}
              variant="ghost"
              className="w-full"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة لتفاصيل الكتاب
            </Button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-cairo">
              💡 نصيحة: إذا استمرت المشكلة، جرب تحديث الصفحة أو العودة لاحقاً
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedPDFErrorHandler;
