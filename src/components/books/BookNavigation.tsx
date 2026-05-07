
import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";

interface BookNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  currentPage: number;
  totalPages: number;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  variant?: 'horizontal' | 'vertical';
}

const BookNavigation = ({
  onPrevious,
  onNext,
  currentPage,
  totalPages,
  isPreviousDisabled = false,
  isNextDisabled = false,
  variant = 'horizontal'
}: BookNavigationProps) => {
  // Use useCallback to memoize the click handlers
  const handlePrevClick = useCallback(() => {
    if (!isPreviousDisabled) {
      setTimeout(() => onPrevious(), 10);
    }
  }, [onPrevious, isPreviousDisabled]);

  const handleNextClick = useCallback(() => {
    if (!isNextDisabled) {
      setTimeout(() => onNext(), 10);
    }
  }, [onNext, isNextDisabled]);

  // تحديد الأيقونات بناءً على النوع - السابق في اليمين والتالي في اليسار
  const PreviousIcon = variant === 'horizontal' ? ChevronRight : ArrowUp;
  const NextIcon = variant === 'horizontal' ? ChevronLeft : ArrowDown;

  return (
    <div className={`flex items-center ${variant === 'horizontal' ? 'justify-between gap-4 w-full max-w-sm mx-auto' : 'flex-col gap-3'}`}>
      {/* زر السابق - في اليمين */}
      <Button
        variant="outline"
        size={variant === 'horizontal' ? "default" : "pagination"}
        className={`${
          variant === 'horizontal' 
            ? "flex items-center gap-2 px-4 py-2 font-cairo text-book-primary border-book-primary/30 bg-white/95 dark:bg-gray-800/95 hover:bg-book-primary/10 transition-all duration-200 focus:ring-2 focus:ring-book-primary/20 shadow-md backdrop-blur-sm" 
            : "rounded-full bg-white/80 dark:bg-gray-800/80 text-book-primary backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-gray-800 border border-book-primary/20 transition-all duration-300"
        } ${isPreviousDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handlePrevClick}
        disabled={isPreviousDisabled}
        aria-label="الصفحة السابقة"
        type="button"
      >
        <PreviousIcon className={variant === 'horizontal' ? "h-4 w-4" : "h-5 w-5"} />
        {variant === 'horizontal' && <span className="text-sm font-medium">السابق</span>}
      </Button>

      {variant === 'horizontal' && (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-md border border-book-primary/20 text-book-primary font-cairo text-sm font-semibold">
          {currentPage} / {totalPages}
        </div>
      )}

      {/* زر التالي - في اليسار */}
      <Button
        variant="outline"
        size={variant === 'horizontal' ? "default" : "pagination"}
        className={`${
          variant === 'horizontal' 
            ? "flex items-center gap-2 px-4 py-2 font-cairo text-book-primary border-book-primary/30 bg-white/95 dark:bg-gray-800/95 hover:bg-book-primary/10 transition-all duration-200 focus:ring-2 focus:ring-book-primary/20 shadow-md backdrop-blur-sm" 
            : "rounded-full bg-white/80 dark:bg-gray-800/80 text-book-primary backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-gray-800 border border-book-primary/20 transition-all duration-300"
        } ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleNextClick}
        disabled={isNextDisabled}
        aria-label="الصفحة التالية"
        type="button"
      >
        {variant === 'horizontal' && <span className="text-sm font-medium">التالي</span>}
        <NextIcon className={variant === 'horizontal' ? "h-4 w-4" : "h-5 w-5"} />
      </Button>
    </div>
  );
};

export default BookNavigation;