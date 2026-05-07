/**
 * أداة لتحويل روابط Supabase Storage إلى روابط نطاق الموقع
 */

interface ImageProxyOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

const SUPABASE_STORAGE_BASE = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/';
const PROXY_BASE = '/i/';

/**
 * تحويل رابط Supabase Storage إلى رابط proxy
 */
export const convertToProxyUrl = (
  originalUrl: string, 
  options: ImageProxyOptions = {}
): string => {
  try {
    // التحقق من أن الرابط من Supabase Storage
    if (!originalUrl.includes(SUPABASE_STORAGE_BASE)) {
      return originalUrl; // إرجاع الرابط الأصلي إذا لم يكن من Supabase
    }

    // استخراج bucket واسم الملف
    const pathAfterBase = originalUrl.replace(SUPABASE_STORAGE_BASE, '');
    const [bucket, ...pathParts] = pathAfterBase.split('/');
    const filePath = pathParts.join('/');

    if (!bucket || !filePath) {
      console.warn('Invalid Supabase storage URL:', originalUrl);
      return originalUrl;
    }

    // Return the original URL directly — the /i/ proxy only works
    // on Netlify and causes 404s on other hosts.
    return originalUrl;
  } catch (error) {
    console.error('Error converting URL to proxy:', error);
    return originalUrl;
  }
};

/**
 * معالج مبسط للصور مع تحسين افتراضي - محسّن للسرعة
 */
export const optimizeImageUrl = (
  url: string,
  type: 'cover' | 'avatar' | 'thumbnail' = 'cover'
): string => {
  const options: ImageProxyOptions = {
    quality: 45, // جودة منخفضة = حجم أصغر بكثير = تحميل أسرع
    format: 'webp'
  };

  switch (type) {
    case 'cover':
      options.width = 200; // حجم أصغر للأغلفة - كافي للعرض
      options.height = 300;
      options.resize = 'cover';
      break;
    case 'avatar':
      options.width = 64;
      options.height = 64;
      options.resize = 'cover';
      break;
    case 'thumbnail':
      options.width = 120;
      options.height = 180;
      options.resize = 'cover';
      break;
  }

  // Normalize possible relative storage paths (common for avatars)
  let normalizedUrl = url;
  try {
    const isAbsolute = typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'));
    const isSupabase = typeof url === 'string' && url.includes(SUPABASE_STORAGE_BASE);
    if (!isAbsolute && !isSupabase && typeof url === 'string') {
      if (type === 'avatar') {
        const path = url.startsWith('avatars/') ? url : `avatars/${url}`;
        normalizedUrl = `${SUPABASE_STORAGE_BASE}${path}`;
      }
    }
  } catch (_) {
    // ignore normalization errors, fallback to original url
  }

  return convertToProxyUrl(normalizedUrl, options);
};

/**
 * تحويل رابط PDF Supabase إلى رابط proxy
 */
export const convertPdfToProxyUrl = (originalUrl: string): string => {
  try {
    // التحقق من أن الرابط من Supabase Storage
    if (!originalUrl.includes(SUPABASE_STORAGE_BASE)) {
      return originalUrl; // إرجاع الرابط الأصلي إذا لم يكن من Supabase
    }

    // استخراج bucket واسم الملف
    const pathAfterBase = originalUrl.replace(SUPABASE_STORAGE_BASE, '');
    const [bucket, ...pathParts] = pathAfterBase.split('/');
    const filePath = pathParts.join('/');

    if (!bucket || !filePath) {
      console.warn('Invalid Supabase storage URL:', originalUrl);
      return originalUrl;
    }

    // بناء رابط الـ proxy للملفات (بدون معاملات تحسين للـ PDF)
    return `/f/${bucket}/${filePath}`;
  } catch (error) {
    console.error('Error converting PDF URL to proxy:', error);
    return originalUrl;
  }
};

/**
 * تحويل رابط proxy للملف (/f/...) إلى رابط Supabase مباشر للتحميل
 * هذا مفيد في بيئة التطوير حيث قد لا تعمل Netlify Edge Functions.
 */
export const resolvePdfDownloadUrl = (url: string): string => {
  try {
    if (!url) return url;

    const fileProxyPrefix = '/f/';

    // حالة الرابط النسبي: /f/<bucket>/<path>
    if (url.startsWith(fileProxyPrefix)) {
      return `${SUPABASE_STORAGE_BASE}${url.slice(fileProxyPrefix.length)}`;
    }

    // حالة الرابط المطلق: https://domain.com/f/<bucket>/<path>
    if (url.includes('/f/')) {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith(fileProxyPrefix)) {
        return `${SUPABASE_STORAGE_BASE}${parsed.pathname.slice(fileProxyPrefix.length)}`;
      }
    }

    return url;
  } catch {
    return url;
  }
};

/**
 * التحقق من أن الرابط من Supabase Storage
 */
export const isSupabaseStorageUrl = (url: string): boolean => {
  return url.includes('supabase.co/storage/v1/object/public/');
};