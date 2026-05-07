import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, ExternalLink, RotateCcw, Menu, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { convertPdfToProxyUrl } from '@/utils/imageProxy';

interface DirectPDFViewerProps {
  bookId: string;
  pdfUrl: string;
  title: string;
  author: string;
}

const DirectPDFViewer: React.FC<DirectPDFViewerProps> = ({ 
  bookId, 
  pdfUrl, 
  title, 
  author 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [pdfLoadError, setPdfLoadError] = useState(false);

  useEffect(() => {
    if (!pdfUrl) {
      setError('رابط الكتاب غير متوفر');
      setLoading(false);
      return;
    }

    const testPdfAccess = async () => {
      try {
        const response = await fetch(pdfUrl, { method: 'HEAD' });
        if (response.ok) {
          setLoading(false);
          toast.success('تم العثور على الكتاب بنجاح');
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        setError('فشل في الوصول لملف الكتاب');
        setLoading(false);
        toast.error('فشل في تحميل الكتاب');
      }
    };

    testPdfAccess();
  }, [pdfUrl]);

  const handleIframeLoad = () => {
    setLoading(false);
    setPdfLoadError(false);
    toast.success('تم تحميل الكتاب بنجاح');
  };

  const handleIframeError = () => {
    setPdfLoadError(true);
    setLoading(false);
    setError('فشل في عرض الكتاب داخل الموقع');
  };

  const openInNewTab = () => {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    toast.info('تم فتح الكتاب في تبويب جديد');
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title}-${author}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('بدأ تحميل الكتاب');
  };

  const toggleControls = () => setShowControls(prev => !prev);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">جاري تحميل الكتاب...</p>
          <p className="text-gray-300 text-sm mt-2 break-all px-4 max-w-md">
            الرابط: {pdfUrl}
          </p>
        </div>
      </div>
    );
  }

  if (error || pdfLoadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-2xl px-4">
          <h2 className="text-white text-2xl font-bold mb-4">مشكلة في عرض الكتاب</h2>
          <p className="text-red-400 mb-4">{error || 'لا يمكن عرض الكتاب داخل الموقع'}</p>
          
          <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <p className="text-gray-300 text-sm mb-4">
              يبدو أن ملف PDF موجود ولكن لا يمكن عرضه داخل الموقع لأسباب أمنية.
              يمكنك استخدام الخيارات التالية:
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <Button
              onClick={openInNewTab}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              size="lg"
            >
              <ExternalLink className="h-5 w-5 ml-2" />
              فتح الكتاب في تبويب جديد
            </Button>
            
            <Button
              onClick={downloadPDF}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black w-full"
              size="lg"
            >
              <Download className="h-5 w-5 ml-2" />
              تحميل الكتاب
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black w-full"
            >
              <RotateCcw className="h-5 w-5 ml-2" />
              إعادة تحميل الصفحة
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black w-full"
            >
              <Home className="h-5 w-5 ml-2" />
              العودة للصفحة الرئيسية
            </Button>
          </div>

          <div className="text-xs text-gray-400 break-all">
            رابط الملف: {pdfUrl}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* شريط التحكم العلوي */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm p-4">
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
                onClick={openInNewTab}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <ExternalLink className="h-4 w-4 ml-2" />
                فتح خارجياً
              </Button>
              
              <Button
                onClick={downloadPDF}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل
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

      {/* منطقة عرض PDF محسنة الجودة */}
      <div className={`${showControls ? 'pt-20' : 'pt-0'} h-screen`}>
        <iframe
          src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-width`}
          width="100%"
          height="100%"
          style={{
            border: 'none',
            backgroundColor: 'white',
            transform: 'scale(1)',
            transformOrigin: 'top left'
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={`${title} - ${author}`}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          loading="eager"
          allow="fullscreen"
        />
      </div>

      {/* زر إظهار أزرار التحكم */}
      {!showControls && (
        <Button
          onClick={toggleControls}
          className="absolute top-4 left-4 z-50 bg-black/70 hover:bg-black/90 text-white"
          size="sm"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default DirectPDFViewer;
