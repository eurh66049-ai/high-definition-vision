import React, { useEffect, useState } from 'react';
import UniversalFileViewer from '@/components/reading/UniversalFileViewer';
import Navbar from '@/components/layout/Navbar';
import { SEOHead } from '@/components/seo/SEOHead';

const PDFReaderPage = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  return (
    <div>
      <SEOHead
        title="قارئ الكتب - منصة كتبي"
        description="اقرأ الكتب العربية مباشرة عبر متصفحك على منصة كتبي. قارئ مدمج يدعم ملفات PDF والمزيد."
        noindex={true}
      />
      {!isFullscreen && <Navbar />}
      <UniversalFileViewer />
    </div>
  );
};

export default PDFReaderPage;
