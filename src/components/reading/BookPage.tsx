import React from "react";
import { preloadImageWithRetry } from "@/data/bookReadingUrls";

interface BookPageProps {
  pageNumber: number;
  totalPages: number;
  imageUrl: string;
  bookTitle: string;
  onLoad: () => void;
  onError: () => void;
  isLoaded: boolean;
  retryCount: number;
  maxRetries: number;
  priority: boolean;
  isNahjBalagha: boolean;
}

const BookPage: React.FC<BookPageProps> = ({
  pageNumber,
  totalPages,
  imageUrl,
  bookTitle,
  onLoad,
  onError,
  isLoaded,
  retryCount,
  maxRetries,
  priority,
  isNahjBalagha,
}) => {
  const [status, setStatus] = React.useState<"idle" | "loading" | "loaded" | "error">(isLoaded ? "loaded" : "idle");
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(isLoaded ? imageUrl : undefined);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const loadImage = React.useCallback(() => {
    if (!imageUrl || status === "loaded" || status === "loading") return;
    
    setStatus("loading");
    console.log(`📖 [تحميل سريع] بدء تحميل الصفحة ${pageNumber}`);
    
    preloadImageWithRetry(bookTitle, pageNumber, priority ? 2 : 1)
      .then((img) => {
        if (img?.src) {
          setImgSrc(img.src);
          setStatus("loaded");
          onLoad?.();
          console.log(`✅ [تم التحميل] الصفحة ${pageNumber} جاهزة`);
        }
      })
      .catch((e) => {
        console.error(`❌ [خطأ] فشل تحميل الصفحة ${pageNumber}:`, e);
        setStatus("error");
        onError?.();
      });
  }, [imageUrl, pageNumber, bookTitle, priority, onLoad, onError, status]);

  React.useEffect(() => {
    if (isLoaded && imageUrl && status !== "loaded") {
      setStatus("loaded");
      setImgSrc(imageUrl);
      return;
    }
    
    if (imageUrl && (status === "idle" || status === "error")) {
      loadImage();
    }
  }, [imageUrl, isLoaded, loadImage, status]);

  const handleRetry = React.useCallback(() => {
    setStatus("idle");
    setTimeout(() => loadImage(), 100);
  }, [loadImage]);

  return (
    <div className="relative w-full min-h-[600px] bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
      {/* Page Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-book-primary/10 to-book-secondary/10 backdrop-blur-sm border-b border-book-primary/20">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-2 h-2 bg-book-primary rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-book-primary font-cairo">
              صفحة {pageNumber}
            </span>
          </div>
          
          {isNahjBalagha && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium font-amiri">
              نهج البلاغة
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-16 pb-4 px-4 h-full flex items-center justify-center">
        {/* Loading State */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center space-y-6 p-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-book-primary/20 rounded-full animate-spin"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-book-primary rounded-full animate-spin animation-delay-150"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-book-primary font-amiri">
                جاري تحميل الصفحة
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-cairo">
                يرجى الانتظار قليلاً...
              </p>
            </div>
          </div>
        )}

        {/* Loaded Image */}
        {status === "loaded" && imgSrc && (
          <div className="w-full h-full flex items-center justify-center">
            <img
              ref={imgRef}
              src={imgSrc}
              alt={`${bookTitle} - صفحة ${pageNumber}`}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className="max-w-full max-h-full object-contain rounded-xl shadow-lg transition-all duration-500 hover:shadow-xl"
              style={{ 
                height: "auto",
                maxHeight: "70vh",
                objectFit: "contain"
              }}
              draggable={false}
              onLoad={() => {
                if (imgRef.current) {
                  imgRef.current.style.opacity = "1";
                }
              }}
            />
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center space-y-6 p-12">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">📖</span>
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 font-amiri">
                فشل في تحميل الصفحة {pageNumber}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-cairo max-w-sm">
                حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى.
              </p>
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-book-primary hover:bg-book-secondary text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-cairo"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookPage;
