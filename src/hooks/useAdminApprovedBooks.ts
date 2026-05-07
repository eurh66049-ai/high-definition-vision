import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminApprovedBook {
  id: string;
  title: string;
  subtitle: string | null;
  author: string;
  category: string;
  publisher: string | null;
  translator: string | null;
  description: string;
  language: string;
  publication_year: number | null;
  page_count: number | null;
  cover_image_url: string | null;
  book_file_url: string | null;
  file_type: string | null;
  display_type: string;
  rights_confirmation: boolean | null;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  views: number;
  rating: number;
  file_size: number | null;
  is_active: boolean;
}

const BOOKS_PER_PAGE = 10;

export const useAdminApprovedBooks = () => {
  const [books, setBooks] = useState<AdminApprovedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchBooks = useCallback(async (page: number = 0, append: boolean = false, query: string = '') => {
    try {
      if (page === 0) {
        setLoading(true);
        setBooks([]);
      } else {
        setLoadingMore(true);
      }
      
      const offset = page * BOOKS_PER_PAGE;
      
      let supabaseQuery = supabase
        .from('approved_books')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + BOOKS_PER_PAGE - 1);

      // إضافة البحث إذا وُجد
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,author.ilike.%${query}%,category.ilike.%${query}%`
        );
      }
      
      const { data, error, count } = await supabaseQuery;
      
      if (error) {
        console.error('Error fetching admin approved books:', error);
        setError('فشل في تحميل الكتب المعتمدة');
        return;
      }

      const formattedBooks = data || [];
      
      if (append) {
        setBooks(prev => [...prev, ...formattedBooks]);
      } else {
        setBooks(formattedBooks);
        setTotalCount(count || 0);
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

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setTimeout(() => {
        fetchBooks(currentPage + 1, true, searchQuery);
      }, 2000);
    }
  }, [fetchBooks, currentPage, loadingMore, hasMore, searchQuery]);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(0);
    setHasMore(true);
    fetchBooks(0, false, query);
  }, [fetchBooks]);

  const refetch = useCallback(() => {
    setCurrentPage(0);
    setHasMore(true);
    fetchBooks(0, false, searchQuery);
  }, [fetchBooks, searchQuery]);

  useEffect(() => {
    fetchBooks(0, false, '');
  }, [fetchBooks]);

  return { 
    books, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    totalCount,
    searchQuery,
    loadMore,
    search,
    refetch
  };
};