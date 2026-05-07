import React, { useRef, useEffect, useState, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, RotateCcw, ZoomIn, ZoomOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { PageNavigationController } from '@/utils/scrollUtils';
import { toast } from 'sonner';
import { saveReadingProgress } from '@/utils/readingProgressUtils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useReadingTimeTracker } from '@/hooks/useReadingTimeTracker';

// تكوين PDF.js worker مع إعدادات CORS
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface FlipbookReaderProps {
  bookId: string;
  pdfUrl: string;
  title: string;
  author: string;
}

const FlipbookReader: React.FC<FlipbookReaderProps> = ({ 
  bookId, 
  pdfUrl, 
  title, 
  author 
}) => {
  const flipBook = useRef<any>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  useReadingTimeTracker(bookId);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [pageSize, setPageSize] = useState({ width: 400, height: 600 });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [savedPage, setSavedPage] = useState<number | null>(null);
  const hasNavigatedToSavedPage = useRef(false);

  console.log('FlipbookReader - تهيئة المكون مع:', { bookId, pdfUrl, title, author });

  // تحديد حجم الصفحة بناءً على حجم الشاشة
  useEffect(() => {
    const updatePageSize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      if (windowWidth < 768) {
        // موبايل
        setPageSize({ width: 280, height: 400 });
      } else if (windowWidth < 1024) {
        // تابلت
        setPageSize({ width: 350, height: 500 });
      } else {
        // ديسكتوب
        setPageSize({ width: 400, height: 600 });
      }
    };

    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('FlipbookReader - تم تحميل PDF بنجاح، عدد الصفحات:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setPdfError(null);
    toast.success('تم تحميل الكتاب بنجاح');
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('FlipbookReader - خطأ في تحميل PDF:', error);
    console.error('FlipbookReader - رابط PDF:', pdfUrl);
    console.error('FlipbookReader - نوع الخطأ:', error.name);
    console.error('FlipbookReader - رسالة الخطأ:', error.message);
    setLoading(false);
    setPdfError('فشل في تحميل الكتاب. يرجى المحاولة مرة أخرى.');
    toast.error('فشل في تحميل الكتاب');
  };

  // إضافة محدود للسرعة لتجنب تخطي الصفحات باستخدام PageNavigationController
  const navigationController = useRef(new PageNavigationController(500));

  const nextPage = useCallback(() => {
    if (flipBook.current) {
      navigationController.current.navigate(() => {
        flipBook.current.pageFlip().flipNext();
      });
    }
  }, []);

  const prevPage = useCallback(() => {
    if (flipBook.current) {
      navigationController.current.navigate(() => {
        flipBook.current.pageFlip().flipPrev();
      });
    }
  }, []);

  const goToPage = useCallback((pageNumber: number) => {
    if (flipBook.current) {
      flipBook.current.pageFlip().flip(pageNumber);
    }
  }, []);

  const onFlip = useCallback((e: any) => {
    console.log('FlipbookReader - تغيير الصفحة إلى:', e.data);
    setCurrentPage(e.data);
  }, []);

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
  };

  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  // التحقق من رابط PDF
  useEffect(() => {
    console.log('FlipbookReader - التحقق من رابط PDF:', pdfUrl);
    if (!pdfUrl) {
      console.error('FlipbookReader - رابط PDF غير موجود');
      setPdfError('رابط الكتاب غير متوفر');
      setLoading(false);
    } else {
      // محاولة تحميل PDF مباشرة للتحقق من إمكانية الوصول
      console.log('FlipbookReader - بدء تحميل PDF...');
    }
  }, [pdfUrl]);

  // جلب التقدم المحفوظ من قاعدة البيانات
  useEffect(() => {
    const fetchSavedProgress = async () => {
      if (user && bookId) {
        try {
          const { data, error } = await supabase
            .from('reading_history')
            .select('current_page')
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .single();

          if (!error && data) {
            console.log('FlipbookReader - تم جلب التقدم المحفوظ - الصفحة:', data.current_page);
            setSavedPage(data.current_page);
          }
        } catch (err) {
          console.log('FlipbookReader - لا يوجد تقدم محفوظ لهذا الكتاب');
        }
      }
    };

    fetchSavedProgress();
  }, [user, bookId]);

  // الانتقال إلى الصفحة المحفوظة بعد التحميل
  useEffect(() => {
    if (numPages > 0 && savedPage && savedPage > 1 && !hasNavigatedToSavedPage.current && flipBook.current) {
      // تحديث currentPage أولاً لضمان تحميل الصفحات المحيطة
      setCurrentPage(savedPage - 1);

      setTimeout(() => {
        goToPage(savedPage - 1); // -1 لأن الصفحات تبدأ من 0
        hasNavigatedToSavedPage.current = true;
        toast.success(`تم العودة إلى الصفحة ${savedPage}`);
      }, 500);
    }
  }, [numPages, savedPage, goToPage]);

  // حفظ تقدم القراءة تلقائياً
  useEffect(() => {
    if (bookId && currentPage > 0 && numPages > 0 && title) {
      const saveProgressDebounced = setTimeout(() => {
        saveReadingProgress(
          bookId,
          currentPage + 1, // +1 لأن الصفحات تبدأ من 0
          numPages,
          title,
          author
        );
      }, 2000);

      return () => clearTimeout(saveProgressDebounced);
    }
  }, [currentPage, bookId, numPages, title, author]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">جاري تحميل الكتاب...</p>
          <p className="text-gray-300 text-sm mt-2 break-all px-4">الرابط: {pdfUrl}</p>
        </div>
      </div>
    );
  }

  if (pdfError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-4">خطأ في تحميل الكتاب</h2>
          <p className="text-red-400 mb-4">{pdfError}</p>
          <p className="text-gray-300 text-sm mb-4 break-all px-4">الرابط: {pdfUrl}</p>
          <div className="space-y-2 mb-4">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black mr-2"
            >
              إعادة تحميل الصفحة
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              العودة للصفحة الرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* شريط التحكم العلوي */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Home className="h-5 w-5 ml-2" />
                الصفحة الرئيسية
              </Button>

              <div className="text-white">
                <h1 className="font-bold text-lg">{title}</h1>
                <p className="text-gray-300 text-sm">بقلم: {author}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleControls}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* منطقة عرض الكتاب - مع scroll snapping للصفحات */}
      <div className="flex items-center justify-center min-h-screen pt-20 pb-20" 
           style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          <HTMLFlipBook
            ref={flipBook}
            width={pageSize.width}
            height={pageSize.height}
            size="stretch"
            minWidth={280}
            maxWidth={600}
            minHeight={400}
            maxHeight={800}
            maxShadowOpacity={0.5}
            showCover={true}
            mobileScrollSupport={true}
            onFlip={onFlip}
            className="flipbook-container"
            style={{
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            startPage={0}
            drawShadow={true}
            flippingTime={1000}
            usePortrait={true}
            startZIndex={0}
            autoSize={true}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={50}
            showPageCorners={true}
            disableFlipByClick={false}
          >
            {/* صفحة الغلاف */}
            <div className="page page-cover bg-gradient-to-br from-blue-900 to-purple-900 flex flex-col items-center justify-center text-white p-8">
              <h1 className="text-2xl md:text-4xl font-bold mb-4 text-center font-amiri">{title}</h1>
              <p className="text-lg md:text-xl mb-8 text-center font-cairo">بقلم: {author}</p>
              <div className="text-center text-sm opacity-75">
                <p>اضغط أو اسحب للتقليب</p>
              </div>
            </div>

            {/* تحميل وعرض صفحات PDF بنظام lazy loading */}
            {pdfUrl && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                options={{
                  cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                  cMapPacked: true,
                  standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
                }}
                loading={
                  <div className="page bg-white flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-book-primary mx-auto mb-2"></div>
                      <p className="text-gray-600">جاري تحميل الصفحات...</p>
                    </div>
                  </div>
                }
                error={
                  <div className="page bg-white flex items-center justify-center">
                    <div className="text-center text-red-600">
                      <p className="font-bold mb-2">خطأ في تحميل PDF</p>
                      <p className="text-sm">تحقق من اتصال الإنترنت</p>
                      <Button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        إعادة المحاولة
                      </Button>
                    </div>
                  </div>
                }
              >
                {Array.from(new Array(numPages), (el, index) => {
                  const pageNumber = index + 1;
                  // تحديد ما إذا كانت الصفحة قريبة من الصفحة الحالية أو الصفحة المحفوظة
                  const isNearCurrentPage = Math.abs(pageNumber - (currentPage + 1)) <= 2;
                  const isNearSavedPage = savedPage ? Math.abs(pageNumber - savedPage) <= 2 : false;
                  const shouldRender = isNearCurrentPage || isNearSavedPage;

                  return (
                    <div key={`page_${pageNumber}`} className="page bg-white flex items-center justify-center">
                      {shouldRender ? (
                        <Page
                          pageNumber={pageNumber}
                          width={pageSize.width - 20}
                          height={pageSize.height - 20}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="pdf-page"
                          loading={
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-book-primary mx-auto"></div>
                            </div>
                          }
                          error={
                            <div className="flex items-center justify-center h-full text-red-600">
                              <p className="text-sm">فشل في تحميل الصفحة {pageNumber}</p>
                            </div>
                          }
                          onLoadSuccess={() => console.log(`FlipbookReader - تم تحميل الصفحة ${pageNumber}`)}
                          onLoadError={(error) => console.error(`FlipbookReader - خطأ في تحميل الصفحة ${pageNumber}:`, error)}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-gray-100">
                          <div className="text-center text-gray-500">
                            <p className="text-sm">الصفحة {pageNumber}</p>
                            <p className="text-xs">ستحمل عند الوصول إليها</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Document>
            )}
          </HTMLFlipBook>
        </div>
      </div>

      {/* أزرار التحكم السفلية */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {/* أزرار التنقل */}
            <div className="flex items-center gap-2">
              <Button
                onClick={prevPage}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                disabled={currentPage === 0}
              >
                <ChevronRight className="h-5 w-5" />
                السابق
              </Button>

              <Button
                onClick={nextPage}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                disabled={currentPage >= numPages}
              >
                التالي
                <ChevronLeft className="h-5 w-5 mr-2" />
              </Button>
            </div>

            {/* معلومات الصفحة */}
            <div className="text-white text-center">
              <span className="text-sm">
                صفحة {currentPage + 1} من {numPages + 1}
              </span>
            </div>

            {/* أزرار التكبير */}
            <div className="flex items-center gap-2">
              <Button
                onClick={zoomOut}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <Button
                onClick={resetZoom}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                onClick={zoomIn}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* زر إخفاء/إظهار أزرار التحكم */}
      {!showControls && (
        <Button
          onClick={toggleControls}
          className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/70 text-white"
          size="sm"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* الأنماط المخصصة */}
      <style>
        {`
        .flipbook-container {
          margin: 0 auto;
        }
        
        .page {
          background-color: white;
          border: 1px solid #ddd;
          overflow: hidden;
        }
        
        .page-cover {
          background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%);
        }
        
        .pdf-page {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .react-pdf__Page__canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        `}
      </style>
    </div>
  );
};

export default FlipbookReader;