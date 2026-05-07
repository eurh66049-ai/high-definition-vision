import { useState, useEffect, useCallback } from 'react';
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

const INITIAL_BOOKS = 42;
const BOOKS_PER_PAGE = 24;
const LOAD_MORE_DELAY = 2000;

export const useOptimizedBooksHome = () => {
  const [books, setBooks] = useState<OptimizedBook[]>([]);
  const [bookStats, setBookStats] = useState<Map<string, BookStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const fetchOptimizedBooks = useCallback(async (page = 0, append = false) => {
    try {
      if (page === 0) {
        setLoading(true);
        // لا نمسح الكتب هنا لتجنب وميض الواجهة (سيتم استبدالها عند وصول البيانات)
      } else {
        setLoadingMore(true);
      }

      // الصفحة الأولى تجلب 42 كتاب، والصفحات التالية 24 كتاب
      const limit = page === 0 ? INITIAL_BOOKS : BOOKS_PER_PAGE;
      const offset = page === 0 ? 0 : INITIAL_BOOKS + (page - 1) * BOOKS_PER_PAGE;

      const { data: booksData, error: booksError } = await supabase
        .rpc('get_optimized_books_home_shuffled', {
          p_limit: limit,
          p_offset: offset
        });
      
      if (booksError) {
        console.error('Error fetching books:', booksError);
        setError('فشل في تحميل الكتب');
        return;
      }

      if (!booksData || booksData.length === 0) {
        if (page === 0) {
          setBooks([]);
        }
        setHasMore(false);
        setError(null);
        return;
      }

      // تنسيق البيانات
      const formattedBooks: OptimizedBook[] = booksData.map(book => ({
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
              // دمج بدون إعادة إنشاء كاملة - تحديث الـ Map الحالي
              setBookStats(prevStats => {
                const merged = new Map(prevStats);
                newStatsMap.forEach((v, k) => merged.set(k, v));
                return merged;
              });
            } else {
              setBookStats(newStatsMap);
            }
          }
        } catch (statsErr) {
          // نواصل بدون إحصائيات في حالة الخطأ
          console.debug('تم تخطي إحصائيات التقييمات');
        }
      }

      // فحص ما إذا كان هناك المزيد من الكتب
      setHasMore(formattedBooks.length === limit);
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
      // انتظار ثانيتين قبل جلب الدفعة التالية كما طُلب
      setLoadingMore(true);
      setTimeout(() => {
        fetchOptimizedBooks(currentPage + 1, true);
      }, LOAD_MORE_DELAY);
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
    bookStats,
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMoreBooks,
    refetch: refreshBooks
  };
};