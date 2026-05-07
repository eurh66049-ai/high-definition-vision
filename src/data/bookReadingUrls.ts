import { booksData } from './editableBooksData';

// إنشاء كائن يحتوي على معلومات القراءة لكل كتاب
export interface ReadingUrlInfo {
  urlTemplate: string;
  totalPages: number;
  pagePattern: string;
  // الإعدادات الرئيسية
  startIndex?: number;
  padLength?: number;
  specialFormat?: boolean;
  // إعدادات التحميل
  lazyLoadThreshold?: number;
  batchSize?: number;
  preloadPages?: number;
  highPriorityPages?: number;
  retryDelay?: number;
  maxRetries?: number;
  // إعدادات المسارات البديلة
  alternativeUrlTemplate?: string;
  enableAdvancedPreloading?: boolean;
  enableFailedImageRetry?: boolean;
  useAlternatingUrls?: boolean;
  alternativeUrlTemplates?: string[];
  // إعدادات تنسيق الصور
  alternateImageFormats?: string[]; 
  autoSwitchFormat?: boolean;
  useProgressiveLoading?: boolean;
  
  // إعدادات إضافية للكتب الكبيرة
  isLargeBook?: boolean;
  chunkSize?: number;
  useLowQualityPreview?: boolean;
  loadStrategy?: 'sequential' | 'ondemand' | 'hybrid';
}

export const bookReadingUrls: Record<string, ReadingUrlInfo> = {};

// تعريف وظيفة لمعالجة الكتب الكبيرة بشكل خاص
function configureLargeBookSettings(bookInfo: ReadingUrlInfo): ReadingUrlInfo {
  const totalPages = bookInfo.totalPages;
  const isVeryLargeBook = totalPages >= 900;
  
  if (isVeryLargeBook) {
    return {
      ...bookInfo,
      isLargeBook: true,
      // إعدادات محسنة للكتب الكبيرة جدًا (900+ صفحة)
      lazyLoadThreshold: 50,
      batchSize: 1,
      preloadPages: 2,
      maxRetries: 5,
      retryDelay: 1000,
      chunkSize: 100,
      loadStrategy: 'hybrid',
      useLowQualityPreview: true,
      padLength: getPadLengthForPages(totalPages),
      useProgressiveLoading: true,
      enableAdvancedPreloading: true,
    };
  } else if (totalPages >= 500) {
    return {
      ...bookInfo,
      isLargeBook: true,
      // إعدادات للكتب الكبيرة
      lazyLoadThreshold: 100,
      batchSize: 1,
      preloadPages: 3,
      maxRetries: 4,
      retryDelay: 800,
      padLength: getPadLengthForPages(totalPages)
    };
  }
  
  return {
    ...bookInfo,
    isLargeBook: false
  };
}

// ملء الكائن من بيانات booksData مع تعديلات للكتب الكبيرة
booksData.forEach(book => {
  if (book.readingInfo) {
    const bookId = typeof book.id === 'number' ? book.id.toString() : book.id;
    const totalPages = book.readingInfo.totalPages;
    
    let bookInfo: ReadingUrlInfo = {
      urlTemplate: book.readingInfo.urlTemplate,
      totalPages: totalPages,
      pagePattern: book.readingInfo.pagePattern,
      startIndex: 0,
      padLength: getPadLengthForPages(totalPages),
      specialFormat: book.id === 'كتاب نهج البلاغة',
      // إعدادات أساسية
      lazyLoadThreshold: 150,
      batchSize: 2,
      preloadPages: 3,
      highPriorityPages: 2,
      retryDelay: 600,
      enableAdvancedPreloading: true,
      maxRetries: 3,
      useAlternatingUrls: true,
      enableFailedImageRetry: true,
      alternateImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      autoSwitchFormat: true,
      useProgressiveLoading: false,
    };
    
    // تطبيق إعدادات الكتب الكبيرة عند الحاجة
    bookInfo = configureLargeBookSettings(bookInfo);
    
    // إضافة إعدادات خاصة لكتاب نهج البلاغة
    if (book.id === 'كتاب نهج البلاغة') {
      bookInfo = {
        ...bookInfo,
        lazyLoadThreshold: 100,
        batchSize: 1,
        preloadPages: 2,
        highPriorityPages: 2,
        retryDelay: 800,
        maxRetries: 5,
        alternativeUrlTemplates: [
          "https://ia804605.us.archive.org/BookReader/BookReaderImages.php?zip=/11/items/nahj-albalaghe_202506/nahj-albalaghe_jp2.zip&file=nahj-albalaghe_jp2/nahj-albalaghe_{page}.jp2&id=nahj-albalaghe_202506&scale=2&rotate=0",
          "https://archive.org/download/nahj-albalaghe_202506/nahj-albalaghe_jp2/nahj-albalaghe_{page}.jp2",
          "https://mirror1.archive.org/download/nahj-albalaghe_202506/nahj-albalaghe_{page}.jpg"
        ]
      };
    }
    
    bookReadingUrls[bookId] = bookInfo;
  }
});

// وظيفة لتحديد طول التنسيق المناسب بناء على عدد الصفحات
function getPadLengthForPages(totalPages: number): number {
  if (totalPages >= 10000) {
    return 5; // استخدام 5 أرقام للكتب التي تحتوي على 10000 صفحة أو أكثر
  } else if (totalPages >= 1000) {
    return 4; // استخدام 4 أرقام للكتب التي تحتوي على 1000 صفحة أو أكثر
  } else {
    return 4; // القيمة الافتراضية هي 4
  }
}

// وظيفة مساعدة للحصول على معلومات الصفحة التالية والسابقة
export const getAdjacentPages = (bookId: string, currentPage: number): { 
  nextPage: number | null; 
  prevPage: number | null;
  hasNext: boolean;
  hasPrev: boolean;
} => {
  const bookInfo = bookReadingUrls[bookId];
  
  if (!bookInfo) {
    return {
      nextPage: null,
      prevPage: null,
      hasNext: false,
      hasPrev: false
    };
  }
  
  const totalPages = bookInfo.totalPages;
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  
  return {
    nextPage: hasNext ? currentPage + 1 : null,
    prevPage: hasPrev ? currentPage - 1 : null,
    hasNext,
    hasPrev
  };
};

// سجل الصور التي فشل تحميلها وعدد المحاولات
const failedImages: Record<string, number> = {};
// تتبع فشل تحميل الصور عن طريق المسار
const failedImageUrls: Record<string, number> = {};
// سجل الصيغ التي تم تجربتها لكل صورة
const triedFormats: Record<string, string[]> = {};
// كاش لحفظ الصور المحملة مسبقًا
const imageCache: Record<string, HTMLImageElement> = {};
// متغير عام لتتبع المحاولة الحالية والتبديل بين العناوين البديلة
let alternateUrlCounter = 0;

// وظيفة جديدة لمعالجة تحميل الكتب الكبيرة
export function getLargeBookPageUrl(bookId: string, pageNumber: number): string | null {
  const bookInfo = bookReadingUrls[bookId];
  
  if (!bookInfo || !bookInfo.isLargeBook) {
    return getPageImageUrl(bookId, pageNumber);
  }
  
  try {
    // للكتب الكبيرة، نستخدم استراتيجية مختلفة لتنسيق الأرقام وإضافة طابع زمني
    const startIndex = bookInfo.startIndex ?? 0;
    const imageIndex = pageNumber - 1 + startIndex;
    const padLength = bookInfo.padLength || 5; // نستخدم تنسيق أطول للكتب الكبيرة
    
    // تنسيق رقم الصفحة مع التأكد من أنه يحتوي على العدد الصحيح من الأرقام
    let formattedPageNumber = String(imageIndex).padStart(padLength, '0');
    
    // تحديد المسار المناسب - دعم كلا التنسيقين {page} و ${pageNum}
    let url = bookInfo.urlTemplate
      .replace(/\{page\}/g, formattedPageNumber)
      .replace(/\$\{pageNum\}/g, formattedPageNumber);
    
    // إضافة طابع زمني فريد لمنع مشاكل التخزين المؤقت
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    url = `${url}?t=${timestamp}_${randomSuffix}`;
    
    // إضافة معلمة الجودة للكتب الكبيرة جدًا
    if (bookInfo.useLowQualityPreview) {
      url += `&quality=low`;
    }
    
    return url;
  } catch (error) {
    console.error(`خطأ في إنشاء URL لصفحة كتاب كبير ${pageNumber} من الكتاب ${bookId}:`, error);
    return null;
  }
}

// تحسين وظيفة الحصول على رابط صورة الصفحة مع دعم متعدد للصيغ والمصادر
export const getPageImageUrl = (bookId: string, pageNumber: number): string | null => {
  const bookInfo = bookReadingUrls[bookId];
  
  // للكتب الكبيرة، استخدم الوظيفة المتخصصة
  if (bookInfo?.isLargeBook && bookInfo.totalPages > 900) {
    return getLargeBookPageUrl(bookId, pageNumber);
  }
  
  if (!bookInfo) {
    console.error(`لم يتم العثور على معلومات القراءة للكتاب: ${bookId}`);
    return null;
  }
  
  try {
    const startIndex = bookInfo.startIndex ?? 0;
    const imageIndex = pageNumber - 1 + startIndex;
    const padLength = bookInfo.padLength || 4;
    
    // تنسيق رقم الصفحة حسب النمط المحدد وطول التنسيق المناسب
    let formattedPageNumber = String(imageIndex).padStart(padLength, '0');
    
    // التعامل مع المعرف الفريد للصورة
    const imageId = `${bookId}-${pageNumber}`;
    
    // معالجة خاصة لكتاب نهج البلاغة
    if (bookInfo.specialFormat && bookId === 'كتاب نهج البلاغة') {
      formattedPageNumber = String(imageIndex).padStart(4, '0');
    }
    
    // البحث عن الصورة في سجل المحاولات الفاشلة وتحديد المسار البديل
    const failedCount = failedImages[imageId] || 0;
    
    // تحديد المسار المناسب بناءً على عدد المحاولات الفاشلة
    let url: string;
    let currentFormat: string | undefined;
    
    // استراتيجية التبديل بين URLs المتعددة والصيغ
    if (bookInfo.useAlternatingUrls && bookInfo.alternativeUrlTemplates && bookInfo.alternativeUrlTemplates.length > 0) {
      const urlIndex = (failedCount + alternateUrlCounter) % (bookInfo.alternativeUrlTemplates.length + 1);
      alternateUrlCounter = (alternateUrlCounter + 1) % 1000;
      
      if (urlIndex === 0) {
        // دعم كلا التنسيقين {page} و ${pageNum} في المسار الأساسي
        url = bookInfo.urlTemplate
          .replace(/\{page\}/g, formattedPageNumber)
          .replace(/\$\{pageNum\}/g, formattedPageNumber);
      } else {
        // دعم كلا التنسيقين {page} و ${pageNum} في المسارات البديلة
        url = bookInfo.alternativeUrlTemplates[urlIndex - 1]
          .replace(/\{page\}/g, formattedPageNumber)
          .replace(/\$\{pageNum\}/g, formattedPageNumber);
      }
      
      // تطبيق تنسيق الصورة البديل
      if (bookInfo.autoSwitchFormat && failedCount > 0 && bookInfo.alternateImageFormats) {
        if (!triedFormats[imageId]) {
          triedFormats[imageId] = [];
        }
        
        const formatIndex = failedCount % bookInfo.alternateImageFormats.length;
        currentFormat = bookInfo.alternateImageFormats[formatIndex];
        
        if (!triedFormats[imageId].includes(currentFormat)) {
          triedFormats[imageId].push(currentFormat);
        }
        
        // تغيير امتداد الملف في URL
        const urlParts = url.split('.');
        if (urlParts.length > 1) {
          const lastPartIndex = urlParts.length - 1;
          urlParts[lastPartIndex] = currentFormat;
          url = urlParts.join('.');
        } else {
          url = `${url}.${currentFormat}`;
        }
      }
      
      // إضافة معلمة عشوائية لمنع التخزين المؤقت
      if (failedCount > 0) {
        url = `${url}?t=${Date.now()}_${Math.floor(Math.random() * 1000)}_r${failedCount}`;
      }
    } else if (failedCount > 0 && bookInfo.alternativeUrlTemplate) {
      // دعم كلا التنسيقين {page} و ${pageNum} في المسار البديل
      url = bookInfo.alternativeUrlTemplate
        .replace(/\{page\}/g, formattedPageNumber)
        .replace(/\$\{pageNum\}/g, formattedPageNumber);
      url = `${url}?retry=${failedCount}&t=${Date.now()}`;
    } else {
      // دعم كلا التنسيقين {page} و ${pageNum} في المسار الأساسي
      url = bookInfo.urlTemplate
        .replace(/\{page\}/g, formattedPageNumber)
        .replace(/\$\{pageNum\}/g, formattedPageNumber);
      
      if (bookInfo.totalPages > 500 || failedCount > 0) {
        url = `${url}?t=${Date.now()}_${failedCount}`;
      }
    }
    
    // إضافة معلمات للتحميل التدريجي
    if (bookInfo.useProgressiveLoading) {
      const hasParams = url.includes('?');
      const connector = hasParams ? '&' : '?';
      url = `${url}${connector}quality=${failedCount > 1 ? 'low' : 'high'}`;
    }
    
    return url;
  } catch (error) {
    console.error(`خطأ في إنشاء URL للصفحة ${pageNumber} من الكتاب ${bookId}:`, error);
    return null;
  }
};

// تسجيل الصور الفاشلة بالمعرف
export const registerFailedImage = (bookId: string, pageNumber: number): void => {
  const imageId = `${bookId}-${pageNumber}`;
  failedImages[imageId] = (failedImages[imageId] || 0) + 1;
  
  const bookInfo = bookReadingUrls[bookId];
  const maxRetries = bookInfo?.maxRetries || 3;
  
  if (failedImages[imageId] > maxRetries) {
    console.warn(`فشل تحميل الصورة ${imageId} بعد ${maxRetries} محاولات.`);
  } else {
    console.log(`فشل تحميل الصورة ${imageId} - محاولة رقم ${failedImages[imageId]} من ${maxRetries}`);
  }
};

// تسجيل الصور الفاشلة بمسار الصورة
export const resetFailedImage = (imageUrl: string, attempt: number = 0): void => {
  if (failedImageUrls[imageUrl]) {
    delete failedImageUrls[imageUrl];
  }
  
  if (attempt > 0) {
    failedImageUrls[imageUrl] = attempt;
  }
};

// تسجيل الصور الفاشلة بالمعرف
export const resetFailedImageById = (bookId: string, pageNumber: number): void => {
  const imageId = `${bookId}-${pageNumber}`;
  delete failedImages[imageId];
  delete triedFormats[imageId];
};

// وظيفة محسنة للتحميل المسبق للصور
export const preloadImage = (imageUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    // التحقق من وجود الصورة في الكاش
    if (imageCache[imageUrl]) {
      resolve(imageCache[imageUrl]);
      return;
    }
    
    // التعامل مع حالات الإدخال غير الصالحة
    if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
      reject(new Error('URL صورة غير صالح'));
      return;
    }
    
    const img = new Image();
    
    // تعيين معلمات تحميل الصورة
    img.decoding = 'async'; 
    img.fetchPriority = 'high'; 
    img.loading = 'eager'; 
    
    // تعيين معالجات الأحداث
    img.onload = () => {
      imageCache[imageUrl] = img;
      resolve(img);
    };
    
    img.onerror = (error) => {
      failedImageUrls[imageUrl] = (failedImageUrls[imageUrl] || 0) + 1;
      reject(error);
    };
    
    // تعيين مصدر الصورة
    img.src = imageUrl;
  });
};

// وظيفة محسنة للتحميل المسبق للصور مع إعادة المحاولة
export const preloadImageWithRetry = (bookId: string, pageNumber: number, maxRetries = 3): Promise<HTMLImageElement> => {
  let attempt = 0;
  
  const tryLoad = (): Promise<HTMLImageElement> => {
    attempt++;
    
    let imageUrl: string | null;
    
    // استخدام دالة مخصصة للكتب الكبيرة
    const bookInfo = bookReadingUrls[bookId];
    if (bookInfo?.isLargeBook && bookInfo.totalPages > 900) {
      imageUrl = getLargeBookPageUrl(bookId, pageNumber);
    } else {
      imageUrl = getPageImageUrl(bookId, pageNumber);
    }
    
    if (!imageUrl) {
      return Promise.reject(new Error('لا يمكن الحصول على عنوان URL للصورة'));
    }
    
    return preloadImage(imageUrl).catch(error => {
      registerFailedImage(bookId, pageNumber);
      
      if (attempt < maxRetries) {
        const bookInfo = bookReadingUrls[bookId];
        const retryDelay = bookInfo?.retryDelay || 600;
        const scaledDelay = retryDelay * Math.pow(1.5, attempt - 1);
        
        console.log(`إعادة محاولة تحميل الصفحة ${pageNumber} من الكتاب ${bookId} (${attempt}/${maxRetries}) بعد ${scaledDelay}ms`);
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(tryLoad());
          }, scaledDelay);
        });
      }
      
      throw error;
    });
  };
  
  return tryLoad();
};

// وظيفة محسنة للتحميل المسبق لمجموعة من الصفحات
export const preloadBookPages = (bookId: string, currentPage: number, range: number = 2): void => {
  const bookInfo = bookReadingUrls[bookId];
  if (!bookInfo || !bookInfo.enableAdvancedPreloading) return;
  
  // تقليل نطاق التحميل المسبق للكتب الكبيرة
  if (bookInfo.isLargeBook && bookInfo.totalPages > 900) {
    range = 1; // تقليل النطاق للكتب الكبيرة جدًا
  }
  
  const totalPages = bookInfo.totalPages;
  const start = Math.max(1, currentPage - range);
  const end = Math.min(totalPages, currentPage + range);
  
  // جمع قائمة الصفحات للتحميل المسبق بأولويات مختلفة
  const criticalPages = [currentPage]; // الصفحة الحالية
  const highPriorityPages = []; // الصفحات ذات الأولوية العالية
  const normalPriorityPages = []; // باقي الصفحات في النطاق
  
  // إضافة الصفحة التالية والسابقة إلى قائمة الأولوية العالية
  if (currentPage + 1 <= totalPages) highPriorityPages.push(currentPage + 1);
  if (currentPage - 1 >= 1) highPriorityPages.push(currentPage - 1);
  
  // إضافة باقي الصفحات في النطاق
  for (let i = start; i <= end; i++) {
    if (i !== currentPage && !highPriorityPages.includes(i)) {
      normalPriorityPages.push(i);
    }
  }
  
  // للكتب الكبيرة جدًا، تحميل الصفحات الحرجة والعالية الأولوية فقط
  if (bookInfo.isLargeBook && bookInfo.totalPages > 900) {
    // تحميل الصفحة الحالية والصفحات المجاورة فقط
    criticalPages.forEach(pageNumber => {
      const maxRetries = bookInfo.maxRetries || 5;
      preloadImageWithRetry(bookId, pageNumber, maxRetries)
        .then(() => resetFailedImageById(bookId, pageNumber))
        .catch(() => console.warn(`فشل تحميل الصفحة الحرجة ${pageNumber}`));
    });
    
    // للكتب الكبيرة جدًا، تحميل الصفحات عالية الأولوية بتأخير أكبر
    if (highPriorityPages.length > 0) {
      setTimeout(() => {
        highPriorityPages.forEach(pageNumber => {
          preloadImageWithRetry(bookId, pageNumber, 3)
            .then(() => resetFailedImageById(bookId, pageNumber))
            .catch(() => {/* تجاهل الأخطاء */});
        });
      }, 500);
    }
  } else {
    // للكتب العادية، تحميل جميع الصفحات بالنطاق المحدد
    // 1. تحميل الصفحات الحرجة فورًا
    criticalPages.forEach(pageNumber => {
      const maxRetries = bookInfo.maxRetries || 5;
      preloadImageWithRetry(bookId, pageNumber, maxRetries)
        .then(() => resetFailedImageById(bookId, pageNumber))
        .catch(() => console.warn(`فشل تحميل الصفحة الحرجة ${pageNumber}`));
    });
    
    // 2. تحميل الصفحات عالية الأولوية بعد تأخير قصير
    setTimeout(() => {
      highPriorityPages.forEach((pageNumber, index) => {
        setTimeout(() => {
          const maxRetries = bookInfo.maxRetries || 3;
          preloadImageWithRetry(bookId, pageNumber, maxRetries)
            .then(() => resetFailedImageById(bookId, pageNumber))
            .catch(() => {/* تجاهل الأخطاء */});
        }, index * 150);
      });
    }, 200);
    
    // 3. تحميل الصفحات العادية بعد تأخير أطول
    setTimeout(() => {
      normalPriorityPages.forEach((pageNumber, index) => {
        setTimeout(() => {
          const maxRetries = bookInfo.maxRetries || 2;
          preloadImageWithRetry(bookId, pageNumber, maxRetries)
            .then(() => resetFailedImageById(bookId, pageNumber))
            .catch(() => {/* تجاهل الأخطاء */});
        }, index * 250);
      });
    }, 500);
  }
};

// وظيفة للحصول على إعدادات التحميل الكسول
export const getLazyLoadSettings = (bookId: string): {
  lazyLoadThreshold: number;
  batchSize: number;
  preloadPages: number;
  highPriorityPages: number;
  retryDelay: number;
  maxRetries: number;
  enableFailedImageRetry: boolean;
  useProgressiveLoading: boolean;
  isLargeBook: boolean;
} => {
  const bookInfo = bookReadingUrls[bookId];
  
  if (!bookInfo) {
    return {
      lazyLoadThreshold: 100,
      batchSize: 2,
      preloadPages: 3,
      highPriorityPages: 2,
      retryDelay: 600,
      maxRetries: 3,
      enableFailedImageRetry: true,
      useProgressiveLoading: false,
      isLargeBook: false
    };
  }
  
  return {
    lazyLoadThreshold: bookInfo.lazyLoadThreshold || 100,
    batchSize: bookInfo.batchSize || 2,
    preloadPages: bookInfo.preloadPages || 3,
    highPriorityPages: bookInfo.highPriorityPages || 2,
    retryDelay: bookInfo.retryDelay || 600,
    maxRetries: bookInfo.maxRetries || 3,
    enableFailedImageRetry: bookInfo.enableFailedImageRetry !== false,
    useProgressiveLoading: bookInfo.useProgressiveLoading === true,
    isLargeBook: bookInfo.isLargeBook === true
  };
};
