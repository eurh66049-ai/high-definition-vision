import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBooksCount = () => {
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooksCount = async () => {
      try {
        setLoading(true);
        
        const { count, error } = await supabase
          .from('book_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved');

        if (error) {
          console.error('خطأ في جلب عدد الكتب:', error);
          setError('فشل في جلب عدد الكتب');
          return;
        }

        setTotalBooks(count || 0);
        setError(null);
      } catch (err) {
        console.error('خطأ غير متوقع:', err);
        setError('حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    };

    fetchBooksCount();
  }, []);

  return { totalBooks, loading, error };
};