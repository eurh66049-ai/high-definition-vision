
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ApprovedBook {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  cover_image: string;
  book_type: string;
  views: number;
  rating: number;
  is_free: boolean;
  created_at: string;
  slug: string;
}

export const useApprovedBooks = () => {
  const [books, setBooks] = useState<ApprovedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

const fetchBooks = async (page: number = 0, append: boolean = false) => {
    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const limit = 24;
      const offset = page * limit;
      
      const { data, error } = await supabase.rpc('get_approved_books_with_pagination', {
        p_limit: limit,
        p_offset: offset
      });
      
      if (error) {
        console.error('Error fetching books:', error);
        setError('فشل في تحميل الكتب');
        return;
      }

      if (append) {
        setBooks(prev => [...prev, ...(data || [])]);
      } else {
        setBooks(data || []);
      }
      
      setHasMore((data || []).length === limit);
      setCurrentPage(page);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBooks(0, false);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setTimeout(() => {
        fetchBooks(currentPage + 1, true);
      }, 2000);
    }
  };

  return { 
    books, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    refetch: () => fetchBooks(0, false) 
  };
};
