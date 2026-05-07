import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImageUrl } from '@/utils/imageProxy';

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

const BOOKS_PER_PAGE = 24;

export const useOptimizedBooksPerformance = () => {
  const [books, setBooks] = useState<OptimizedBook[]>([]);
  const [bookStats, setBookStats] = useState<Map<string, BookStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // تحميل محسّن للكتب مع الإحصائيات
  const fetchOptimizedBooks = useCallback(async (page = 0, append = false) => {
    try {
      if (page === 0) {
        setLoading(true);
        setBooks([]);
      } else {
        setLoadingMore(true);
      }
      
      // جلب الكتب بطريقة محسّنة
      const { data, error } = await supabase
        .rpc('get_optimized_books_home_shuffled', {
          p_limit: BOOKS_PER_PAGE,
          p_offset: page * BOOKS_PER_PAGE
        });
      
      if (error) {
        console.error('Error fetching books:', error);
        setError('فشل في تحميل الكتب');
        return;
      }

      if (!data || data.length === 0) {
        if (page === 0) {
          setBooks([]);
        }
        setHasMore(false);
        setError(null);
        return;
      }

      // تنسيق البيانات
      const formattedBooks: OptimizedBook[] = data.map(book => ({
        id: book.id,
        title: book.title || 'عنوان غير متوفر',
        author: book.author || 'مؤلف غير معروف',
        category: book.category || 'أخرى',
        cover_image_url: optimizeImageUrl(book.cover_image_url || '/placeholder.svg', 'cover'),
        rating: Number(book.rating) || 0,
        views: book.views || 0,
        created_at: book.created_at,
        slug: book.slug || '',
        language: book.language || 'العربية',
        page_count: book.page_count || 0,
        book_file_type: book.book_file_type || 'pdf',
        display_only: book.display_type === 'no_access'
      }));

      // تحديث الكتب
      if (append) {
        setBooks(prevBooks => [...prevBooks, ...formattedBooks]);
      } else {
        setBooks(formattedBooks);
      }

      // جلب إحصائيات التقييمات بطريقة محسّنة
      if (formattedBooks.length > 0) {
        const bookIds = formattedBooks.map(book => book.id);
        
        try {
          const { data: statsData, error: statsError } = await supabase
            .rpc('get_books_batch_stats_fixed', { book_ids: bookIds });

          if (!statsError && statsData && Array.isArray(statsData)) {
            const newStatsMap = new Map<string, BookStats>();
            statsData.forEach((stat: any) => {
              newStatsMap.set(stat.book_id, {
                book_id: stat.book_id,
                total_reviews: stat.total_reviews || 0,
                average_rating: Number(stat.average_rating) || 0,
                rating_distribution: (typeof stat.rating_distribution === 'object' && stat.rating_distribution !== null) 
                  ? stat.rating_distribution as Record<string, number> 
                  : {}
              });
            });

            if (append) {
              setBookStats(prevStats => new Map([...prevStats, ...newStatsMap]));
            } else {
              setBookStats(newStatsMap);
            }
            
            console.log('✅ تم جلب إحصائيات', statsData.length, 'كتاب بنجاح');
          }
        } catch (statsErr) {
          console.warn('فشل في جلب إحصائيات التقييمات:', statsErr);
        }
      }

      setHasMore(formattedBooks.length === BOOKS_PER_PAGE);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMoreBooks = useCallback(() => {
    if (!loadingMore && hasMore) {
      setTimeout(() => {
        fetchOptimizedBooks(currentPage + 1, true);
      }, 2000);
    }
  }, [fetchOptimizedBooks, currentPage, loadingMore, hasMore]);

  const refreshBooks = useCallback(() => {
    setCurrentPage(0);
    setHasMore(true);
    fetchOptimizedBooks(0, false);
  }, [fetchOptimizedBooks]);

  // الحصول على إحصائيات كتاب معين
  const getBookStats = useCallback((bookId: string) => {
    return bookStats.get(bookId) || {
      book_id: bookId,
      total_reviews: 0,
      average_rating: 0,
      rating_distribution: {}
    };
  }, [bookStats]);

  useEffect(() => {
    fetchOptimizedBooks();
  }, [fetchOptimizedBooks]);

  return { 
    books, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMoreBooks,
    refetch: refreshBooks,
    getBookStats
  };
};