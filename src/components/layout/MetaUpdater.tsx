import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface MetaUpdaterProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  author?: string;
}

export const MetaUpdater = ({
  title,
  description,
  keywords,
  image,
  type = 'website',
  author
}: MetaUpdaterProps) => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.origin + window.location.pathname;
    const fullImageUrl = image ? 
      (image.startsWith('http') ? image : `https://kotobi.xyz${image}`) : 
      'https://kotobi.xyz/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png';

    // تحديث title
    if (title) {
      document.title = title;
    }

    // تحديث description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    // تحديث keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = keywords;
    }

    // تحديث author
    if (author) {
      let metaAuthor = document.querySelector('meta[name="author"]') as HTMLMetaElement;
      if (!metaAuthor) {
        metaAuthor = document.createElement('meta');
        metaAuthor.name = 'author';
        document.head.appendChild(metaAuthor);
      }
      metaAuthor.content = author;
    }

    // تحديث Open Graph
    const updateOGMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    if (title) updateOGMeta('og:title', title);
    if (description) updateOGMeta('og:description', description);
    updateOGMeta('og:image', fullImageUrl);
    updateOGMeta('og:url', currentUrl);
    updateOGMeta('og:type', type);
    updateOGMeta('og:site_name', 'منصة كتبي - المكتبة الرقمية العربية المجانية');
    updateOGMeta('og:locale', 'ar_AR');

    // تحديث Twitter Card
    const updateTwitterMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateTwitterMeta('twitter:card', 'summary_large_image');
    updateTwitterMeta('twitter:site', '@kotobi_app');
    if (title) updateTwitterMeta('twitter:title', title);
    if (description) updateTwitterMeta('twitter:description', description);
    updateTwitterMeta('twitter:image', fullImageUrl);

    // تحديث canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = currentUrl;

  }, [title, description, keywords, image, type, author, location.pathname]);

  return null;
};

export default MetaUpdater;