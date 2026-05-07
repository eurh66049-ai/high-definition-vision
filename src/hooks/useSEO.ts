import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface SEOData {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'book' | 'profile';
  structuredData?: object;
  breadcrumbs?: Array<{ label: string; href?: string; active?: boolean }>;
}

export const useSEO = (customData?: Partial<SEOData>): SEOData => {
  const location = useLocation();
  
  const defaultSEO = useMemo(() => {
    const baseUrl = 'https://kotobi.xyz';
    const currentPath = location.pathname;
    const canonical = `${baseUrl}${currentPath}`;

    // تحديد SEO بناءً على المسار
    if (currentPath === '/') {
      return {
        title: 'منصة كتبي - المكتبة الرقمية العربية المجانية',
        description: 'اكتشف آلاف الكتب العربية المجانية في منصة كتبي. قم بقراءة وتحميل الكتب في جميع المجالات - أدب، علوم، تاريخ، فلسفة والمزيد.',
        keywords: 'كتب عربية مجانية, مكتبة رقمية, قراءة اونلاين, تحميل كتب, أدب عربي, كتب PDF',
        canonical,
        ogType: 'website' as const,
        breadcrumbs: []
      };
    }
    
    if (currentPath.startsWith('/book/')) {
      return {
        title: 'كتاب - منصة كتبي',
        description: 'اقرأ هذا الكتاب مجاناً على منصة كتبي',
        keywords: 'كتاب مجاني, قراءة اونلاين, تحميل كتاب, منصة كتبي',
        canonical,
        ogType: 'book' as const,
        breadcrumbs: [
          { label: 'الكتب', href: '/' },
          { label: 'تفاصيل الكتاب', active: true }
        ]
      };
    }
    
    if (currentPath.startsWith('/author/')) {
      return {
        title: 'مؤلف - منصة كتبي',
        description: 'تعرف على المؤلف وأعماله في منصة كتبي',
        keywords: 'مؤلف عربي, كتب المؤلف, السيرة الذاتية, منصة كتبي',
        canonical,
        ogType: 'profile' as const,
        breadcrumbs: [
          { label: 'المؤلفون', href: '/authors' },
          { label: 'صفحة المؤلف', active: true }
        ]
      };
    }
    
    if (currentPath === '/categories') {
      return {
        title: 'التصنيفات - منصة كتبي',
        description: 'تصفح الكتب حسب التصنيفات المختلفة في منصة كتبي',
        keywords: 'تصنيفات الكتب, أقسام الكتب, فهرس الكتب, منصة كتبي',
        canonical,
        ogType: 'website' as const,
        breadcrumbs: [
          { label: 'التصنيفات', active: true }
        ]
      };
    }
    
    if (currentPath === '/authors') {
      return {
        title: 'المؤلفون - منصة كتبي',
        description: 'تصفح قائمة المؤلفين وأعمالهم في منصة كتبي',
        keywords: 'مؤلفون عرب, كتاب عرب, أدباء عرب, منصة كتبي',
        canonical,
        ogType: 'website' as const,
        breadcrumbs: [
          { label: 'المؤلفون', active: true }
        ]
      };
    }
    
    // SEO افتراضي للصفحات الأخرى
    return {
      title: 'منصة كتبي - المكتبة الرقمية العربية المجانية',
      description: 'اكتشف آلاف الكتب العربية المجانية في منصة كتبي',
      keywords: 'كتب عربية مجانية, مكتبة رقمية, قراءة اونلاين',
      canonical,
      ogType: 'website' as const,
      breadcrumbs: []
    };
  }, [location.pathname]);

  return {
    ...defaultSEO,
    ...customData
  };
};