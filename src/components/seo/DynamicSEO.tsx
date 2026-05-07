import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface DynamicSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'book' | 'profile';
  author?: string;
  structuredData?: object;
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

export const DynamicSEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  structuredData,
  book
}: DynamicSEOProps) => {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://kotobi.xyz');
  const fullImageUrl = image ? (image.startsWith('http') ? image : `https://kotobi.xyz${image}`) : 'https://kotobi.xyz/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png';

  // تحديث الـ meta tags ديناميكياً
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // تحديث عنوان الصفحة في المتصفح
    if (title) {
      document.title = title;
    }

    // تحديث meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }

    // تحديث Open Graph tags
    const updateMetaProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    if (title) updateMetaProperty('og:title', title);
    if (description) updateMetaProperty('og:description', description);
    if (fullImageUrl) updateMetaProperty('og:image', fullImageUrl);
    updateMetaProperty('og:url', currentUrl);
    updateMetaProperty('og:type', type);

    // تحديث Twitter Card tags
    const updateTwitterMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    if (title) updateTwitterMeta('twitter:title', title);
    if (description) updateTwitterMeta('twitter:description', description);
    if (fullImageUrl) updateTwitterMeta('twitter:image', fullImageUrl);

    // إضافة structured data للكتب
    if (book && structuredData) {
      let scriptTag = document.querySelector('script[type="application/ld+json"]');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    }

  }, [title, description, keywords, fullImageUrl, currentUrl, type, author, structuredData, book]);

  // إنشاء structured data للكتاب
  const bookStructuredData = book ? {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": book.title,
    "author": {
      "@type": "Person",
      "name": book.author
    },
    "description": book.description || `كتاب ${book.title} للمؤلف ${book.author}`,
    "image": book.coverImage || fullImageUrl,
    "genre": book.category,
    "inLanguage": book.language || "ar",
    "numberOfPages": book.pageCount,
    "datePublished": book.publicationYear ? `${book.publicationYear}-01-01` : new Date().toISOString(),
    "publisher": {
      "@type": "Organization",
      "name": book.publisher || "منصة كتبي"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "url": currentUrl,
    "isAccessibleForFree": true,
    ...(book.rating && book.reviewCount && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": book.rating,
        "ratingCount": book.reviewCount,
        "bestRating": 5,
        "worstRating": 1
      }
    })
  } : structuredData;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph Meta Tags */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || 'منصة كتبي'} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="منصة كتبي - المكتبة الرقمية العربية المجانية" />
      <meta property="og:locale" content="ar_AR" />
      
      {/* Book specific Open Graph */}
      {book && (
        <>
          <meta property="book:author" content={book.author} />
          <meta property="book:tag" content={book.category} />
        </>
      )}
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@kotobi_app" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:image:alt" content={title || 'منصة كتبي'} />
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#dc2626" />
      
      {/* Language and direction - التوجه محدد في index.html */}
      
      {/* Structured Data */}
      {bookStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(bookStructuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default DynamicSEO;