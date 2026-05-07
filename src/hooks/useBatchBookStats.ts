import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BookStats {
  book_id: string;
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}

export const useBatchBookStats = (bookIds: string[]) => {
  const [stats, setStats] = useState<Map<string, BookStats>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إنشاء مفتاح فريد للكتب لتجنب الطلبات المتكررة
  const booksKey = useMemo(() => {
    return [...bookIds].sort().join(',');
  }, [bookIds]);

  useEffect(() => {
    const fetchBatchStats = async () => {
      if (bookIds.length === 0) {
        setStats(new Map());
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('جلب إحصائيات مجمعة للكتب:', bookIds.length, 'كتاب');
        
        const { data, error: supabaseError } = await supabase
          .rpc('get_books_batch_stats_fixed', { book_ids: bookIds });

        if (supabaseError) {
          console.error('خطأ في جلب إحصائيات الكتب المجمعة:', supabaseError);
          setError(supabaseError.message);
          return;
        }

        if (data) {
          const statsMap = new Map<string, BookStats>();
          data.forEach(stat => {
            statsMap.set(stat.book_id, {
              book_id: stat.book_id,
              total_reviews: stat.total_reviews || 0,
              average_rating: Number(stat.average_rating) || 0,
              rating_distribution: (typeof stat.rating_distribution === 'object' && stat.rating_distribution !== null) 
                ? stat.rating_distribution as Record<string, number> 
                : {}
            });
          });

          // إضافة إحصائيات افتراضية للكتب التي لا توجد لها إحصائيات
          bookIds.forEach(bookId => {
            if (!statsMap.has(bookId)) {
              statsMap.set(bookId, {
                book_id: bookId,
                total_reviews: 0,
                average_rating: 0,
                rating_distribution: {}
              });
            }
          });

          setStats(statsMap);
          console.log(`تم جلب إحصائيات ${data.length} كتاب بنجاح`);
        }
      } catch (err) {
        console.error('خطأ في جلب إحصائيات الكتب:', err);
        setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchStats();
  }, [booksKey]); // استخدام booksKey بدلاً من bookIds لتجنب الطلبات المتكررة

  // الحصول على إحصائيات كتاب معين
  const getBookStats = (bookId: string): BookStats => {
    return stats.get(bookId) || {
      book_id: bookId,
      total_reviews: 0,
      average_rating: 0,
      rating_distribution: {}
    };
  };

  return { 
    stats, 
    loading, 
    error, 
    getBookStats 
  };
};