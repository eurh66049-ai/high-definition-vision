
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, ZoomIn, ZoomOut, RotateCcw, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AlternativePDFViewerProps {
  bookId: string;
  pdfUrl: string;
  title: string;
  author: string;
}

const AlternativePDFViewer: React.FC<AlternativePDFViewerProps> = ({ 
  bookId, 
  pdfUrl, 
  title, 
  author 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [scale, setScale] = useState(1);

  console.log('AlternativePDFViewer - PDF URL:', pdfUrl);

  useEffect(() => {
    if (!pdfUrl) {
      setError('رابط الكتاب غير متوفر');
      setLoading(false);
      return;
    }

    // Test if PDF can be loaded
    const testPdfLoad = async () => {
      try {
        console.log('Testing PDF URL accessibility...');
        const response = await fetch(pdfUrl, { method: 'HEAD' });
        console.log('PDF HEAD response:', response.status, response.statusText);
        
        if (response.ok) {
          setLoading(false);
          toast.success('تم تحميل الكتاب بنجاح');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('PDF load test failed:', err);
        setError('فشل في تحميل الكتاب. قد تكون هناك مشكلة في الرابط.');
        setLoading(false);
        toast.error('فشل في تحميل الكتاب');
      }
    };

    testPdfLoad();
  }, [pdfUrl]);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setScale(1);
  const toggleControls = () => setShowControls(prev => !prev);

  const handleIframeError = () => {
    console.error('Iframe failed to load PDF');
    setError('فشل في عرض الكتاب. جاري المحاولة مع عارض بديل...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">جاري تحميل الكتاب...</p>
          <p className="text-gray-300 text-sm mt-2 break-all px-4">
            اختبار الوصول للرابط: {pdfUrl}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-4">خطأ في تحميل الكتاب</h2>
          <p className="text-red-400 mb-4">{error}</p>
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
              onClick={() => {
                console.log('Opening PDF in new tab:', pdfUrl);
                window.open(pdfUrl, '_blank');
              }}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black mr-2"
            >
              فتح في نافذة جديدة
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
    <div className="min-h-screen bg-gray-900 relative">
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
                onClick={() => window.open(pdfUrl, '_blank')}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                فتح في نافذة جديدة
              </Button>
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

      {/* منطقة عرض PDF */}
      <div className="pt-20 pb-20 h-screen">
        <div 
          className="h-full w-full"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
        >
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-fit`}
            width="100%"
            height="100%"
            style={{
              border: 'none',
              backgroundColor: 'white'
            }}
            onError={handleIframeError}
            onLoad={() => {
              console.log('PDF iframe loaded successfully');
              toast.success('تم تحميل الكتاب في العارض');
            }}
            title={`${title} - ${author}`}
          />
        </div>
      </div>

      {/* أزرار التحكم السفلية */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={zoomOut}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="h-4 w-4" />
              تصغير
            </Button>
            
            <Button
              onClick={resetZoom}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
              إعادة تعيين
            </Button>
            
            <Button
              onClick={zoomIn}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="h-4 w-4" />
              تكبير
            </Button>
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
    </div>
  );
};

export default AlternativePDFViewer;
