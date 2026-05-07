import React, { useMemo, useCallback } from 'react';
import { SimpleBookCard } from './SimpleBookCard';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';

interface OptimizedBook {
  id: string;
  title: string;
  author: string;
  category: string;
  cover_image_url: string;
  rating: number;
  views: number;
  created_at: string;
  slug: string;
  language: string;
  page_count: number;
  book_file_type: string;
  display_only: boolean;
}

interface BookStats {
  book_id: string;
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}

interface OptimizedBookGridProps {
  books: OptimizedBook[];
  bookStats: Map<string, BookStats>;
  loading: boolean;
  onBookClick?: (book: OptimizedBook) => void;
}

export const OptimizedBookGrid: React.FC<OptimizedBookGridProps> = React.memo(({
  books,
  bookStats,
  loading,
  onBookClick
}) => {
  const { navigateToBook } = useNavigationHistory();

  const handleBookClick = useCallback((book: OptimizedBook) => {
    if (onBookClick) {
      onBookClick(book);
    } else {
      navigateToBook(book.id);
    }
  }, [onBookClick, navigateToBook]);

  // تحسين إحصائيات الكتب
  const getBookStatsOptimized = useCallback((bookId: string) => {
    return bookStats.get(bookId) || {
      book_id: bookId,
      total_reviews: 0,
      average_rating: 0,
      rating_distribution: {}
    };
  }, [bookStats]);

  if (loading && books.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-muted aspect-[3/4] rounded-lg mb-3"></div>
            <div className="bg-muted h-4 rounded mb-2"></div>
            <div className="bg-muted h-3 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 grid-optimized">
      {books.map((book, index) => {
        const stats = getBookStatsOptimized(book.id);

        return (
          <SimpleBookCard
            key={book.id}
            id={book.id}
            title={book.title}
            author={book.author}
            cover_image={book.cover_image_url}
            category={book.category}
            created_at={book.created_at}
            display_only={book.display_only}
            rating={stats.average_rating || book.rating || 0}
            bookStats={stats}
            onNavigate={() => handleBookClick(book)}
            compact={true}
            index={index}
          />
        );
      })}
    </div>
  );
});

OptimizedBookGrid.displayName = 'OptimizedBookGrid';