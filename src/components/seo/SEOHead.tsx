import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'book' | 'profile';
  structuredData?: object;
  noindex?: boolean;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export const SEOHead = ({
  title = 'منصة كتبي | مكتبة رقمية عربية مجانية - آلاف الكتب والروايات PDF',
  description = 'منصة كتبي أكبر مكتبة رقمية عربية مجانية. اقرأ وحمّل أكثر من 10,000 كتاب ورواية PDF مجاناً في الأدب والعلوم والتنمية الذاتية والتاريخ والفلسفة.',
  keywords = 'كتب عربية مجانية, مكتبة رقمية عربية, تحميل كتب PDF مجانا, قراءة كتب اون لاين, روايات عربية, كتبي',
  canonical,
  ogImage = '/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png',
  ogType = 'website',
  structuredData,
  noindex = false,
  author,
  publishedTime,
  modifiedTime,
  breadcrumbs
}: SEOHeadProps) => {
  const currentUrl = canonical || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://kotobi.xyz');
  const fullImageUrl = ogImage.startsWith('http') ? ogImage : `https://kotobi.xyz${ogImage}`;
  
  // Ensure title is under 60 chars for Google
  const seoTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  // Ensure description is under 160 chars  
  const seoDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;

  const breadcrumbStructuredData = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  } : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={keywords} />
      {author && <meta name="author" content={author} />}
      
      {/* Canonical URL - always set */}
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={seoTitle} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="منصة كتبي" />
      <meta property="og:locale" content="ar_AR" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:image:alt" content={seoTitle} />
      <meta name="twitter:site" content="@kotobi_app" />
      
      {/* Article specific meta tags */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      
      {/* Robots meta */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />}
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Breadcrumb Structured Data */}
      {breadcrumbStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbStructuredData)}
        </script>
      )}
    </Helmet>
  );
};
