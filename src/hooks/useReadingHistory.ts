import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { createBookSlug } from '@/utils/bookSlug';

export interface ReadingHistoryItem {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string | null;
  book_cover_url: string | null;
  book_slug: string | null;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  last_read_at: string;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
}

export const useReadingHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Fetch slugs for all books
      const bookIds = (data || []).map(item => item.book_id);
      const { data: booksData } = await supabase
        .from('book_submissions')
        .select('id, slug, title, author')
        .in('id', bookIds);
      
      // Create a map of book_id to slug
      const slugMap = new Map<string, string>();
      booksData?.forEach(book => {
        if (book.slug) {
          slugMap.set(book.id, book.slug);
        } else if (book.title && book.author) {
          // Generate slug if not present
          slugMap.set(book.id, createBookSlug(book.title, book.author));
        }
      });
      
      // Add slug to history items
      const historyWithSlugs = (data || []).map(item => ({
        ...item,
        book_slug: slugMap.get(item.book_id) || null
      }));
      
      setHistory(historyWithSlugs);
      setError(null);
    } catch (err) {
      console.error('Error fetching reading history:', err);
      setError('فشل تحميل سجل القراءة');
    } finally {
      setLoading(false);
    }
  };

  const saveReadingProgress = async (
    bookId: string,
    bookTitle: string,
    currentPage: number,
    totalPages: number,
    bookAuthor?: string,
    bookCoverUrl?: string
  ) => {
    if (!user) return;

    try {
      const { error: upsertError } = await supabase
        .from('reading_history')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          book_title: bookTitle,
          book_author: bookAuthor,
          book_cover_url: bookCoverUrl,
          current_page: currentPage,
          total_pages: totalPages,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,book_id'
        });

      if (upsertError) throw upsertError;
      
      // Refresh history
      await fetchHistory();
    } catch (err) {
      console.error('Error saving reading progress:', err);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('reading_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      
      // Refresh history
      await fetchHistory();
    } catch (err) {
      console.error('Error deleting history item:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  return {
    history,
    loading,
    error,
    saveReadingProgress,
    deleteHistoryItem,
    refreshHistory: fetchHistory,
  };
};