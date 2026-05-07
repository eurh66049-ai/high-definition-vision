import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SelectBook {
  id: string;
  title: string;
  author: string;
  category: string;
  cover_image_url?: string;
}

export const useApprovedBooksForSelect = () => {
  const [books, setBooks] = useState<SelectBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('book_submissions')
        .select('id, title, author, category, cover_image_url')
        .eq('status', 'approved')
        .order('title');

      if (error) {
        throw error;
      }

      setBooks(data || []);
    } catch (err) {
      console.error('خطأ في جلب الكتب:', err);
      setError('فشل في تحميل الكتب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return {
    books,
    loading,
    error,
    refetch: fetchBooks
  };
};