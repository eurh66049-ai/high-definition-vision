// دوال مساعدة لتحديث SEO بشكل ديناميكي

export const updatePageTitle = (title: string) => {
  if (typeof window === 'undefined') return;
  document.title = title;
};

export const updateMetaTag = (name: string, content: string, attribute: 'name' | 'property' = 'name') => {
  if (typeof window === 'undefined') return;
  
  let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  meta.content = content;
};

export const updateCanonicalUrl = (url: string) => {
  if (typeof window === 'undefined') return;
  
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
};

export const updateStructuredData = (data: object, id?: string) => {
  if (typeof window === 'undefined') return;
  
  // إزالة البيانات المنظمة السابقة إذا كان لها ID
  if (id) {
    const existing = document.querySelector(`script[data-schema-id="${id}"]`);
    if (existing) {
      existing.remove();
    }
  }
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  if (id) script.setAttribute('data-schema-id', id);
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

export const updateAllBookMeta = (book: {
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
}) => {
  const currentUrl = window.location.href;
  const fullImageUrl = book.coverImage ? 
    (book.coverImage.startsWith('http') ? book.coverImage : `https://kotobi.xyz${book.coverImage}`) : 
    'https://kotobi.xyz/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png';

  const title = `${book.title} - ${book.author} | منصة كتبي`;
  const description = `اكتشف كتاب "${book.title}" للمؤلف ${book.author}. ${book.description ? book.description.substring(0, 140) : 'اقرأ وحمل مجاناً من منصة كتبي - المكتبة الرقمية العربية'}`;
  const keywords = `${book.title}, ${book.author}, ${book.category}, كتب عربية مجانية, قراءة اونلاين, تحميل كتب PDF, منصة كتبي`;

  // تحديث العنوان والوصف
  updatePageTitle(title);
  updateMetaTag('description', description);
  updateMetaTag('keywords', keywords);
  updateMetaTag('author', book.author);

  // تحديث Open Graph
  updateMetaTag('og:title', title, 'property');
  updateMetaTag('og:description', description, 'property');
  updateMetaTag('og:image', fullImageUrl, 'property');
  updateMetaTag('og:image:width', '1200', 'property');
  updateMetaTag('og:image:height', '630', 'property');
  updateMetaTag('og:image:alt', `غلاف كتاب ${book.title} للمؤلف ${book.author}`, 'property');
  updateMetaTag('og:url', currentUrl, 'property');
  updateMetaTag('og:type', 'book', 'property');
  updateMetaTag('og:site_name', 'منصة كتبي - المكتبة الرقمية العربية المجانية', 'property');
  updateMetaTag('og:locale', 'ar_AR', 'property');

  // Book specific Open Graph
  updateMetaTag('book:author', book.author, 'property');
  updateMetaTag('book:tag', book.category, 'property');

  // تحديث Twitter Card
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:site', '@kotobi_app');
  updateMetaTag('twitter:creator', '@kotobi_app');
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', fullImageUrl);
  updateMetaTag('twitter:image:alt', `غلاف كتاب ${book.title} للمؤلف ${book.author}`);

  // تحديث canonical URL
  updateCanonicalUrl(currentUrl);

  // تحديث البيانات المنظمة
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": book.title,
    "author": {
      "@type": "Person",
      "name": book.author
    },
    "description": book.description || `كتاب ${book.title} للمؤلف ${book.author} - متاح للقراءة والتحميل مجاناً`,
    "image": fullImageUrl,
    "genre": book.category,
    "inLanguage": book.language || "ar",
    "numberOfPages": book.pageCount,
    "datePublished": book.publicationYear ? `${book.publicationYear}-01-01` : new Date().toISOString().split('T')[0],
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
  };

  updateStructuredData(structuredData, 'book-schema');
};