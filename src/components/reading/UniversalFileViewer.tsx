import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Home, 
  Download, 
  Maximize, 
  Moon, 
  Sun 
} from 'lucide-react';
import { toast } from 'sonner';
import { useBookDetails } from '@/hooks/useBookDetails';
import { useBookViews } from '@/hooks/useBookViews';
import { throttle } from '@/utils/scrollUtils';
import PDFJSReader from './PDFJSReader';
import DocxViewer from './DocxViewer';
import ReaderChatPanel from './ReaderChatPanel';

const UniversalFileViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { book, loading, error } = useBookDetails(id!);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [fileType, setFileType] = useState<'pdf' | 'txt' | 'doc' | 'docx' | 'unknown' | 'loading'>('loading');
  const [textContent, setTextContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [textDarkMode, setTextDarkMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [docViewerUrl, setDocViewerUrl] = useState<string>('');

  // استدعاء hook زيادة المشاهدات
  useBookViews(book?.id || '');

  useEffect(() => {
    if (book?.book_file_url) {
      determineFileType(book.book_file_url);
    }
  }, [book?.book_file_url]);

  const determineFileType = (url: string) => {
    const lowercaseUrl = url.toLowerCase();
    const urlParts = lowercaseUrl.split('?')[0]; // إزالة query parameters
    const extension = urlParts.split('.').pop();

    if (extension === 'pdf') {
      setFileType('pdf');
    } else if (extension === 'txt') {
      setFileType('txt');
      loadTextFile(url);
    } else if (extension === 'docx') {
      setFileType('docx');
    } else if (extension === 'doc') {
      setFileType('doc');
      loadDocFile(url);
    } else {
      setFileType('unknown');
    }
  };

  const loadTextFile = async (url: string) => {
    try {
      setIsLoadingContent(true);
      setLoadingProgress(10);
      const response = await fetch(url);
      setLoadingProgress(30);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setLoadingProgress(50);
      const arrayBuffer = await response.arrayBuffer();
      setLoadingProgress(70);
      let bestText = '';
      let bestScore = 0;
      
      // قائمة بالترميزات المختلفة للتجربة
      const encodings = [
        'utf-8',
        'windows-1256',
        'iso-8859-6',
        'utf-16le',
        'utf-16be',
        'cp1256',
        'iso-8859-1'
      ];
      
      // تجربة كل ترميز وحساب نقاط الجودة
      for (const encoding of encodings) {
        try {
          const decoder = new TextDecoder(encoding, { fatal: false });
          const text = decoder.decode(arrayBuffer);
          
          // حساب نقاط جودة النص (أحرف عربية صحيحة)
          const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
          const totalChars = text.length;
          const validChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0020-\u007E\s\n\r\t]/g) || []).length;
          const invalidChars = text.split('').filter(c => c === '�' || c.charCodeAt(0) === 65533).length;
          
          // حساب النقاط
          let score = 0;
          if (totalChars > 0) {
            score = (validChars / totalChars) * 100 - (invalidChars * 10);
            if (arabicChars > 0) score += 50; // مكافأة للنصوص العربية
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestText = text;
          }
        } catch {
        }
      }

      if (!bestText || bestScore < 10) {
        bestText = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
      }

      setLoadingProgress(90);
      setTextContent(bestText);
      setLoadingProgress(100);
      toast.success('تم تحميل الملف النصي بنجاح');
    } catch (error) {
      console.error('خطأ في تحميل الملف النصي:', error);
      toast.error('فشل في تحميل الملف النصي');
      setLoadingProgress(0);
    } finally {
      setTimeout(() => setIsLoadingContent(false), 500); // إضافة تأخير قصير لإظهار 100%
    }
  };

  const loadDocFile = async (url: string) => {
    try {
      setIsLoadingContent(true);
      setLoadingProgress(30);
      const microsoftViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}&wdHideGridlines=True&wdHideHeaders=True&wdDownloadButton=False&wdPrint=False&wdEmbedCode=False&wdChrome=0&wdToolbar=0&action=embedview`;

      setDocViewerUrl(microsoftViewerUrl);
      setLoadingProgress(100);
      toast.success('تم إعداد عارض الملف بنجاح');
    } catch (error) {
      console.error('خطأ في إعداد عارض ملف DOC:', error);
      toast.error('خطأ في إعداد العارض');
      setLoadingProgress(100);
    } finally {
      setTimeout(() => setIsLoadingContent(false), 500);
    }
  };

  const downloadFile = () => {
    if (book?.book_file_url) {
      const link = document.createElement('a');
      link.href = book.book_file_url;
      // إضافة اسم المنصة داخل اسم الملف المحمّل
      link.download = `${book.title} - kotobi`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('تم بدء تحميل الكتاب');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleScroll = useMemo(() => throttle(() => {
    if (!textContainerRef.current) return;

    const container = textContainerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const progress = maxScroll > 0 ? (container.scrollTop / maxScroll) * 100 : 0;

    setScrollProgress((prev) => {
      const next = Math.min(Math.max(progress, 0), 100);
      return Math.abs(prev - next) >= 1 ? next : prev;
    });
  }, 80), []);

  useEffect(() => {
    const container = textContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll, textContent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground font-cairo">جاري تحميل الكتاب...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2 font-amiri text-foreground">الكتاب غير متوفر</h2>
          <p className="mb-4 font-cairo text-muted-foreground">{error || 'لم يتم العثور على الكتاب المطلوب'}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <Home className="ml-2 h-4 w-4" />
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  if (!book.book_file_url) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2 font-amiri text-foreground">ملف الكتاب غير متوفر</h2>
          <p className="mb-4 font-cairo text-muted-foreground">عذراً، ملف هذا الكتاب غير متوفر للقراءة حالياً</p>
          <Button onClick={() => navigate(`/book/${id}`)} variant="outline">
            العودة إلى تفاصيل الكتاب
          </Button>
        </div>
      </div>
    );
  }

  // حالة التحميل أثناء تحديد نوع الملف
  if (fileType === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground font-cairo">جاري تحليل الكتاب...</p>
        </div>
      </div>
    );
  }

  // عرض PDF باستخدام المكون المخصص
  if (fileType === 'pdf') {
    return <PDFJSReader />;
  }

  // عرض DOCX باستخدام المكون المخصص المحسن
  if (fileType === 'docx') {
    return (
      <DocxViewer 
        bookId={book.id}
        docxUrl={book.book_file_url}
        title={book.title}
        author={book.author}
      />
    );
  }

  // عرض النصوص والـ DOC مثل PDF
  if (fileType === 'txt' || fileType === 'doc') {
    return (
      <div className="min-h-screen bg-background relative">
        {/* منطقة عرض النص - تمرير عمودي مثل PDF */}
        <div 
          ref={textContainerRef}
          className="overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden scrollbar-none"
          style={{ 
            height: 'calc(100vh - 150px)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '60px'
          }}
        >
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-screen bg-background">
              <div className="text-center max-w-md w-full px-6">
                <div className="mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground font-amiri mb-2">
                    جاري تحميل الكتاب
                  </h3>
                  <p className="text-muted-foreground font-cairo text-sm mb-6">
                    يرجى الانتظار قليلاً...
                  </p>
                </div>
                
                {/* شريط التقدم مع العداد المئوي */}
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                
                {/* نسبة التقدم */}
                <div className="text-sm text-muted-foreground font-cairo">
                  {loadingProgress}%
                </div>
              </div>
            </div>
          ) : fileType === 'doc' && docViewerUrl ? (
            // عارض ملفات DOC/DOCX يبدأ من تحت شريط التنقل مباشرة مع إخفاء الشريط السفلي
            <div className="doc-viewer-container dark:doc-viewer-container">
              {/* عارض الملف مع تكبير لإخفاء الشريط السفلي */}
              <iframe
                src={docViewerUrl}
                className="w-full h-full border-0"
                title="عارض الملف"
                onError={() => {
                  toast.error('فشل في تحميل العارض - جرب العارض الآخر أو حمل الملف مباشرة');
                }}
              />
            </div>
          ) : textContent ? (
            <div className="flex flex-col items-center">
              {/* صفحة النص مصممة مثل صفحة PDF */}
              <div 
                className={`w-full max-w-4xl shadow-lg mx-auto my-4 p-12 min-h-screen transition-all duration-300 ${
                  textDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
                }`}
                style={{
                  maxWidth: '90%',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  fontFamily: 'Cairo, sans-serif',
                  lineHeight: '2.2',
                  fontSize: '18px',
                  textAlign: 'right',
                  direction: 'rtl'
                 }}
               >
                <div 
                  className={`whitespace-pre-wrap ${textDarkMode ? 'text-gray-100' : 'text-gray-900'}`}
                  style={{ 
                    fontFamily: 'Cairo, sans-serif',
                    lineHeight: '2.2',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                >
                  {textContent}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-foreground font-cairo">فشل في تحميل محتوى الكتاب</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-4"
                  variant="outline"
                >
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* شريط التقدم والأدوات السفلي - فقط لملفات TXT وليس DOC أو DOCX */}
        {fileType === 'txt' && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
            {/* شريط التقدم */}
            <div className="w-full bg-muted h-1">
              <div 
                className="bg-primary h-1 transition-all duration-300"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
            
            {/* شريط الأدوات */}
            <div className="bg-background/95 backdrop-blur-sm border-t border-border">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-center gap-4">
                  {/* العداد المئوي للتقدم */}
                  <div className="flex items-center bg-muted/50 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium text-foreground font-cairo">
                      {Math.round(scrollProgress)}%
                    </span>
                  </div>

                  {/* تبديل الوضع المظلم للنص */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextDarkMode(!textDarkMode)}
                    className="h-10 px-3 hover:bg-accent"
                    title={textDarkMode ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
                  >
                    {textDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>

                  {/* ملء الشاشة */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="h-10 px-3 hover:bg-accent"
                    title="ملء الشاشة"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* لوحة الدردشة أثناء القراءة */}
        <ReaderChatPanel bookId={book?.id} />
      </div>
    );
  }

  // نوع ملف غير مدعوم
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2 font-amiri text-foreground">نوع الملف غير مدعوم</h2>
        <p className="mb-4 font-cairo text-muted-foreground">عذراً، هذا النوع من الملفات غير مدعوم حالياً</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => navigate(`/book/${id}`)} variant="outline">
            العودة إلى تفاصيل الكتاب
          </Button>
          <Button onClick={downloadFile} variant="default">
            <Download className="ml-2 h-4 w-4" />
            تحميل الملف
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UniversalFileViewer;