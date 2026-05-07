
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SinglePageNavigationProps {
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  playSound: () => void;
}

const SinglePageNavigation = ({
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
  playSound
}: SinglePageNavigationProps) => {
  return (
    <div className="flex items-center justify-center gap-4 my-8 w-full">
      <Button
        variant="outline"
        size="lg"
        className={`flex items-center gap-2 px-6 py-3 font-cairo text-book-primary border-book-primary hover:bg-book-light/50 transition-all duration-200 focus:ring-2 focus:ring-book-primary/20 ${
          currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => {
          if (currentPage > 1) {
            onPrevPage();
            playSound();
          }
        }}
        disabled={currentPage <= 1}
        aria-label="الصفحة السابقة"
        type="button"
      >
        <span>السابق</span>
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      <div className="bg-white/90 px-6 py-3 rounded-md shadow-sm border border-gray-200 text-book-primary font-cairo">
        <span className="text-lg font-semibold">
          {currentPage} / {totalPages}
        </span>
      </div>
      
      <Button
        variant="outline"
        size="lg"
        className={`flex items-center gap-2 px-6 py-3 font-cairo text-book-primary border-book-primary hover:bg-book-light/50 transition-all duration-200 focus:ring-2 focus:ring-book-primary/20 ${
          currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => {
          if (currentPage < totalPages) {
            onNextPage();
            playSound();
          }
        }}
        disabled={currentPage >= totalPages}
        aria-label="الصفحة التالية"
        type="button"
      >
        <ChevronLeft className="h-5 w-5" />
        <span>التالي</span>
      </Button>
    </div>
  );
};

export default SinglePageNavigation;
