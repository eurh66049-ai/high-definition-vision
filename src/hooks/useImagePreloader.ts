import { useEffect, useCallback } from 'react';

interface PreloadImageOptions {
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const useImagePreloader = () => {
  // Cache للصور المحملة مسبقاً
  const imageCache = new Set<string>();

  const preloadImage = useCallback((src: string, options: PreloadImageOptions = {}) => {
    if (!src || imageCache.has(src)) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        imageCache.add(src);
        options.onLoad?.();
        resolve();
      };
      
      img.onerror = () => {
        options.onError?.();
        reject(new Error(`Failed to load image: ${src}`));
      };

      // تعيين خصائص التحسين
      if (options.priority) {
        img.loading = 'eager';
        img.decoding = 'sync';
      } else {
        img.loading = 'lazy';
        img.decoding = 'async';
      }

      img.src = src;
    });
  }, [imageCache]);

  const preloadImages = useCallback(async (urls: string[], options: PreloadImageOptions = {}) => {
    const promises = urls
      .filter(url => url && !imageCache.has(url))
      .map(url => preloadImage(url, options));
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.debug('Some images failed to preload:', error);
    }
  }, [preloadImage, imageCache]);

  // تنظيف Cache عند عدم الحاجة
  const clearCache = useCallback(() => {
    imageCache.clear();
  }, [imageCache]);

  return {
    preloadImage,
    preloadImages,
    clearCache,
    isImageCached: (src: string) => imageCache.has(src)
  };
};

// Hook للتحميل المسبق التلقائي لصور الكتب
export const useBookImagesPreloader = (books: Array<{ cover_image_url?: string }>) => {
  const { preloadImages } = useImagePreloader();

  useEffect(() => {
    const imageUrls = books
      .map(book => book.cover_image_url)
      .filter(Boolean) as string[];

    if (imageUrls.length > 0) {
      // تحميل جميع الصور دفعة واحدة - 24 صورة
      const allImages = imageUrls.slice(0, 24);
      
      // تحميل الصور كلها معاً لضمان ظهورها فوراً
      preloadImages(allImages, { priority: true });
      
      console.log(`🖼️ تحميل مسبق لـ ${allImages.length} صورة كتاب`);
    }
  }, [books, preloadImages]);
};

// Hook محسّن للتحميل المسبق للفئات
export const useCategoryImagesPreloader = (books: Array<{ cover_image_url?: string }>) => {
  const { preloadImages } = useImagePreloader();

  useEffect(() => {
    const imageUrls = books
      .map(book => book.cover_image_url)
      .filter(Boolean) as string[];

    if (imageUrls.length > 0) {
      // تحميل جميع صور الفئة دفعة واحدة
      const allImages = imageUrls.slice(0, 24);
      preloadImages(allImages, { priority: true });
      
      console.log(`🗂️ تحميل مسبق لصور فئة: ${allImages.length} كتاب`);
    }
  }, [books, preloadImages]);
};