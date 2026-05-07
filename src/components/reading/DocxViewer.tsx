import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Download, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import mammoth from 'mammoth';

interface DocxViewerProps {
  bookId: string;
  docxUrl: string;
  title: string;
  author: string;
}

const DocxViewer: React.FC<DocxViewerProps> = ({ 
  bookId, 
  docxUrl, 
  title, 
  author 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    loadDocxContent();
  }, [docxUrl]);

  const loadDocxContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('تحميل ملف DOCX من:', docxUrl);
      
      // تحميل الملف
      const response = await fetch(docxUrl);
      if (!response.ok) {
        throw new Error(`فشل في تحميل الملف: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // تحويل DOCX إلى HTML باستخدام mammoth
      const result = await mammoth.convertToHtml({ 
        arrayBuffer
      }, {
        // خيارات تحسين العرض للنصوص العربية
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        }),
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh", 
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Subtitle'] => h2.subtitle:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em"
        ]
      });
      
      if (result.messages && result.messages.length > 0) {
        console.warn('تحذيرات من mammoth:', result.messages);
      }
      
      setHtmlContent(result.value);
      setLoading(false);
      toast.success('تم تحميل الكتاب بنجاح');
      
    } catch (err) {
      console.error('خطأ في تحميل ملف DOCX:', err);
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      setLoading(false);
      toast.error('فشل في تحميل الكتاب');
    }
  };

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = docxUrl;
    link.download = `${title}-${author}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('بدأ تحميل الكتاب');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground font-amiri mb-2">
            جاري تحميل الكتاب
          </h3>
          <p className="text-muted-foreground font-cairo">
            يرجى الانتظار قليلاً...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-2xl px-4">
          <h2 className="text-2xl font-bold text-foreground font-amiri mb-4">
            مشكلة في تحميل الكتاب
          </h2>
          <p className="text-destructive mb-6 font-cairo">{error}</p>
          
          <div className="space-y-3">
            <Button
              onClick={loadDocxContent}
              className="w-full"
              size="lg"
            >
              إعادة المحاولة
            </Button>
            
            <Button
              onClick={downloadFile}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Download className="h-5 w-5 ml-2" />
              تحميل الملف
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              <Home className="h-5 w-5 ml-2" />
              العودة للصفحة الرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* محتوى الكتاب */}
      <div className="overflow-y-auto h-screen">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <div 
            className="bg-card rounded-lg shadow-sm p-8 min-h-screen"
            style={{
              direction: 'rtl',
              textAlign: 'right'
            }}
          >
            <div 
              className="prose prose-lg max-w-none dark:prose-invert"
              style={{
                fontFamily: 'Cairo, sans-serif',
                lineHeight: '2.2',
                fontSize: '18px',
                direction: 'rtl',
                textAlign: 'right'
              }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocxViewer;