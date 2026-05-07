import { useEffect } from 'react';

interface UseDynamicSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'book' | 'profile';
  author?: string;
  book?: {
    title: string;
    author: string;
    description?: string;
    category: string;
    coverImage?: string;
    publisher?: string;
    pageCount?: number;
    language?: string;
    publicationYear?: number;
    rating?: number;
    reviewCount?: number;
  };
}

export const useDynamicSEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  book
}: UseDynamicSEOProps) => {
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = url || window.location.href;
    const fullImageUrl = image ? 
      (image.startsWith('http') ? image : `https://kotobi.xyz${image}`) : 
      'https://kotobi.xyz/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png';

    // تحديث عنوان الصفحة
    if (title) {
      document.title = title;
    }

    // دالة مساعدة لتحديث أو إنشاء meta tag
    const updateOrCreateMeta = (selector: string, attribute: string, attributeValue: string, content: string) => {
      let meta = document.querySelector(selector) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, attributeValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // تحديث meta description
    if (description) {
      updateOrCreateMeta('meta[name="description"]', 'name', 'description', description);
    }

    // تحديث keywords
    if (keywords) {
      updateOrCreateMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
    }

    // تحديث author
    if (author) {
      updateOrCreateMeta('meta[name="author"]', 'name', 'author', author);
    }

    // تحديث Open Graph tags
    if (title) {
      updateOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', title);
    }
    
    if (description) {
      updateOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', description);
    }

    updateOrCreateMeta('meta[property="og:image"]', 'property', 'og:image', fullImageUrl);
    updateOrCreateMeta('meta[property="og:image:width"]', 'property', 'og:image:width', '1200');
    updateOrCreateMeta('meta[property="og:image:height"]', 'property', 'og:image:height', '630');
    updateOrCreateMeta('meta[property="og:url"]', 'property', 'og:url', currentUrl);
    updateOrCreateMeta('meta[property="og:type"]', 'property', 'og:type', type);
    updateOrCreateMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'منصة كتبي - المكتبة الرقمية العربية المجانية');
    updateOrCreateMeta('meta[property="og:locale"]', 'property', 'og:locale', 'ar_AR');

    // تحديث Twitter Card tags
    updateOrCreateMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    updateOrCreateMeta('meta[name="twitter:site"]', 'name', 'twitter:site', '@kotobi_app');
    
    if (title) {
      updateOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    }
    
    if (description) {
      updateOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    
    updateOrCreateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', fullImageUrl);

    // إضافة meta tags خاصة بالكتب
    if (book) {
      updateOrCreateMeta('meta[property="book:author"]', 'property', 'book:author', book.author);
      updateOrCreateMeta('meta[property="book:tag"]', 'property', 'book:tag', book.category);
      
      if (book.language) {
        updateOrCreateMeta('meta[property="book:language"]', 'property', 'book:language', book.language);
      }
    }

    // تحديث canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // إضافة أو تحديث structured data للكتب
    if (book) {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Book",
        "@id": currentUrl,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": currentUrl
        },
        "name": book.title,
        "author": {
          "@type": "Person",
          "name": book.author,
          "url": `https://kotobi.xyz/author/${encodeURIComponent(book.author)}`
        },
        "description": book.description || `كتاب ${book.title} للمؤلف ${book.author} - متاح للقراءة والتحميل مجاناً`,
        "image": {
          "@type": "ImageObject",
          "url": book.coverImage || fullImageUrl,
          "width": 400,
          "height": 600
        },
        "genre": book.category,
        "inLanguage": book.language || "ar",
        "numberOfPages": book.pageCount,
        "datePublished": book.publicationYear ? `${book.publicationYear}-01-01` : undefined,
        "publisher": {
          "@type": "Organization",
          "name": book.publisher || "منصة كتبي",
          "url": "https://kotobi.xyz"
        },
        "workExample": {
          "@type": "Book",
          "bookFormat": "https://schema.org/EBook",
          "inLanguage": book.language || "ar"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": currentUrl
        },
        "url": currentUrl,
        "isAccessibleForFree": true,
        ...(book.rating && book.reviewCount && {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": book.rating.toFixed(1),
            "ratingCount": book.reviewCount,
            "bestRating": "5",
            "worstRating": "1"
          }
        })
      };

      // إضافة BreadcrumbList للـ SEO
      const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "https://kotobi.xyz"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": book.category,
            "item": `https://kotobi.xyz/category/${encodeURIComponent(book.category)}`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": book.title,
            "item": currentUrl
          }
        ]
      };

      // إزالة أي structured data سابق وإضافة الجديد
      const existingScript = document.querySelector('script[type="application/ld+json"][data-book-schema]');
      if (existingScript) {
        existingScript.remove();
      }

      const existingBreadcrumb = document.querySelector('script[type="application/ld+json"][data-breadcrumb-schema]');
      if (existingBreadcrumb) {
        existingBreadcrumb.remove();
      }

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-book-schema', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);

      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.setAttribute('data-breadcrumb-schema', 'true');
      breadcrumbScript.textContent = JSON.stringify(breadcrumbData);
      document.head.appendChild(breadcrumbScript);
    }

    // تنظيف البيانات عند مغادرة الصفحة
    return () => {
      // إزالة structured data المؤقت
      const tempScript = document.querySelector('script[type="application/ld+json"][data-book-schema]');
      if (tempScript) {
        tempScript.remove();
      }
      const tempBreadcrumb = document.querySelector('script[type="application/ld+json"][data-breadcrumb-schema]');
      if (tempBreadcrumb) {
        tempBreadcrumb.remove();
      }
    };

  }, [title, description, keywords, image, url, type, author, book]);

  return {
    updateSEO: (newData: Partial<UseDynamicSEOProps>) => {
      // يمكن استخدام هذه الدالة لتحديث SEO في منتصف دورة حياة المكون
      // سيتم تنفيذها في useEffect التالي
    }
  };
};