
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowLeft, BookOpen, Share2, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface FloatingControlsProps {
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onScrollToTop: () => void;
  playSound: () => void;
  bookTitle: string;
  handleAddToFavorites: () => void;
  isFavorite: boolean;
  isUserLoggedIn: boolean;
  handleShare: () => void;
  handleDownload: () => void;
}

const FloatingControls = ({
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
  onScrollToTop,
  playSound,
  bookTitle,
  handleAddToFavorites,
  isFavorite,
  isUserLoggedIn,
  handleShare,
  handleDownload
}: FloatingControlsProps) => {
  const isMobile = useIsMobile();
  
  // التحقق من إذا كان هذا كتاب الإخوة كارامازوف
  const isKaramazovBook = bookTitle.includes("الإخوة كارامازوف") || bookTitle.includes("كارامازوف");
  
  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-gray-900/70 border-b border-white/20 dark:border-white/10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="max-w-[200px] md:max-w-none"
              >
                <h1 className="truncate font-amiri font-bold text-base md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-book-primary to-book-secondary">
                  {bookTitle}
                </h1>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="bg-gradient-to-r from-book-primary/10 to-book-secondary/10 border border-book-primary/20 backdrop-blur-md text-book-primary rounded-full px-4 py-1.5 shadow-md">
                <span className="text-book-primary font-amiri text-sm font-medium">
                  صفحة <strong>{currentPage}</strong> من <strong>{totalPages}</strong>
                </span>
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-book-primary/50 to-transparent"></div>
            </motion.div>
            
            <div className="flex items-center gap-2">
              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full border-book-primary/20 ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-book-primary/10'} text-book-primary px-3 py-1 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-1`}
                  onClick={() => {
                    if (currentPage > 1) {
                      onPrevPage();
                      playSound();
                    }
                  }}
                  disabled={currentPage <= 1}
                  title="الصفحة السابقة"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-medium">السابقة</span>
                </Button>
              </motion.div>
              
              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full border-book-primary/20 ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-book-primary/10'} text-book-primary px-3 py-1 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-1`}
                  onClick={() => {
                    if (currentPage < totalPages) {
                      onNextPage();
                      playSound();
                    }
                  }}
                  disabled={currentPage >= totalPages}
                  title="الصفحة التالية"
                >
                  <span className="hidden sm:inline text-xs font-medium">التالية</span>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed right-4 top-24 z-40 flex flex-col gap-3">
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
        >
          <motion.div 
            whileHover={{ scale: 1.1, y: -3 }} 
            whileTap={{ scale: 0.92 }}
          >
            <Button
              size="icon"
              className={`rounded-full h-12 w-12 shadow-lg ${
                isFavorite 
                  ? 'bg-gradient-to-br from-book-primary to-book-secondary text-white hover:shadow-book-primary/30' 
                  : 'bg-white/90 dark:bg-gray-800/90 hover:bg-white border border-book-primary/20 text-book-primary'
              } transition-all duration-300`}
              onClick={() => {
                handleAddToFavorites();
                playSound();
              }}
              title={isUserLoggedIn ? (isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة") : "تسجيل الدخول للإضافة للمفضلة"}
            >
              <Bookmark 
                className={`h-5 w-5 ${isFavorite ? 'animate-pulse' : ''}`} 
                fill={isFavorite ? "white" : "none"} 
              />
              {isFavorite && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-book-primary animate-ping"></span>
              )}
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.15 }}
        >
          <motion.div 
            whileHover={{ scale: 1.1, y: -3 }} 
            whileTap={{ scale: 0.92 }}
          >
            <Button
              size="icon"
              className="rounded-full h-12 w-12 shadow-lg bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 border border-book-primary/20 dark:border-book-primary/30 text-book-primary hover:text-book-secondary transition-all duration-300"
              onClick={() => {
                handleShare();
                playSound();
              }}
              title="مشاركة الكتاب"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.25 }}
        >
          <motion.div 
            whileHover={{ scale: 1.1, y: -3 }} 
            whileTap={{ scale: 0.92 }}
          >
            <Button
              size="icon"
              className="rounded-full h-12 w-12 shadow-lg bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 border border-book-primary/20 dark:border-book-primary/30 text-book-primary hover:text-book-secondary transition-all duration-300"
              onClick={() => {
                onScrollToTop();
                playSound();
              }}
              title="العودة للأعلى"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default FloatingControls;
