import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PopularityRank {
  popularity_rank: number;
  total_books: number;
  popularity_score: number;
  category_rank: number;
  category_total: number;
}

export const useBookPopularityRank = (bookId: string | undefined) => {
  const [rank, setRank] = useState<PopularityRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) {
      setLoading(false);
      return;
    }

    const fetchRank = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_book_popularity_rank', { p_book_id: bookId });

        if (!error && data && data.length > 0) {
          setRank(data[0] as PopularityRank);
        }
      } catch (err) {
        console.error('Error fetching popularity rank:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRank();
  }, [bookId]);

  return { rank, loading };
};
