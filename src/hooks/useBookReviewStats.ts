import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BookReviewStats {
  total_reviews: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  recommend_count: number;
  not_recommend_count: number;
}

export const useBookReviewStats = (bookId: string) => {
  const [stats, setStats] = useState<BookReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviewStats = async () => {
      if (!bookId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('جلب إحصائيات التقييمات للكتاب:', bookId);
        console.log('نوع bookId:', typeof bookId);
        
        const { data, error: supabaseError } = await supabase
          .rpc('get_book_review_stats', { p_book_id: bookId });

        console.log('نتيجة get_book_review_stats للكتاب', bookId, ':', { data, error: supabaseError });

        if (supabaseError) {
          console.error('خطأ في جلب إحصائيات التقييمات:', supabaseError);
          setError(supabaseError.message);
          return;
        }

        console.log('البيانات المجلبة:', data);
        
        if (data && data.length > 0) {
          console.log('تم العثور على إحصائيات للكتاب:', data[0]);
          const rawData = data[0];
          const ratingDistribution = rawData.rating_distribution;
          
          // تحويل البيانات للشكل المطلوب
          const transformedStats: BookReviewStats = {
            total_reviews: rawData.total_reviews,
            average_rating: rawData.average_rating,
            five_star_count: ratingDistribution?.['5'] || 0,
            four_star_count: ratingDistribution?.['4'] || 0,
            three_star_count: ratingDistribution?.['3'] || 0,
            two_star_count: ratingDistribution?.['2'] || 0,
            one_star_count: ratingDistribution?.['1'] || 0,
            recommend_count: 0, // سنضيفها لاحقاً من جدول المراجعات
            not_recommend_count: 0 // سنضيفها لاحقاً من جدول المراجعات
          };
          
          setStats(transformedStats);
        } else {
          console.log('لم يتم العثور على إحصائيات للكتاب، إضافة قيم افتراضية');
          // إذا لم توجد إحصائيات، ضع قيم افتراضية
          setStats({
            total_reviews: 0,
            average_rating: 0,
            five_star_count: 0,
            four_star_count: 0,
            three_star_count: 0,
            two_star_count: 0,
            one_star_count: 0,
            recommend_count: 0,
            not_recommend_count: 0
          });
        }
      } catch (err) {
        console.error('خطأ في جلب إحصائيات التقييمات:', err);
        setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewStats();
    
    // إضافة real-time updates للتقييمات
    const channel = supabase
      .channel(`book-reviews-${bookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'book_reviews',
          filter: `book_id=eq.${bookId}`
        },
        (payload) => {
          console.log('تحديث في التقييمات للكتاب:', bookId, payload);
          // إعادة جلب الإحصائيات عند أي تغيير في التقييمات لهذا الكتاب
          setTimeout(() => {
            fetchReviewStats();
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log('حالة الاشتراك في تحديثات التقييمات:', status, 'للكتاب:', bookId);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId]);

  return { stats, loading, error };
};