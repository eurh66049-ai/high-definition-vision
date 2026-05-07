
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImageUrl } from '@/utils/imageProxy';

interface OptimizedBook {
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
  cover_image_url: string;
  optimized_cover_url: string;
  language: string;
  page_count: number;
  slug: string;
  book_file_type?: string;
  display_only?: boolean;
}

// دالة لترتيب الكتب حسب الترتيب العالمي
const sortBooksByGlobalOrder = (books: OptimizedBook[], globalOrder: string[]): OptimizedBook[] => {
  if (globalOrder.length === 0) return books;
  
  // إنشاء خريطة للوصول السريع للكتب
  const bookMap = new Map(books.map(book => [book.id, book]));
  
  // ترتيب الكتب حسب الترتيب العالمي
  const orderedBooks: OptimizedBook[] = [];
  const remainingBooks: OptimizedBook[] = [];
  
  // إضافة الكتب حسب الترتيب العالمي
  globalOrder.forEach(bookId => {
    const book = bookMap.get(bookId);
    if (book) {
      orderedBooks.push(book);
      bookMap.delete(bookId);
    }
  });
  
  // إضافة الكتب الجديدة التي لم تكن في الترتيب العالمي (في نهاية القائمة)
  bookMap.forEach(book => remainingBooks.push(book));
  
  return [...orderedBooks, ...remainingBooks];
};

const BOOKS_PER_PAGE = 24;

export const useOptimizedBooks = () => {
  const [books, setBooks] = useState<OptimizedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const fetchOptimizedBooks = useCallback(async (page = 0, append = false) => {
    try {
      if (page === 0) {
        setLoading(true);
        setBooks([]);
      } else {
        setLoadingMore(true);
      }
      
      // جلب الكتب من الجدول الصحيح بترتيب عشوائي - بيانات محدودة فقط
      const { data, error } = await supabase
        .from('book_submissions')
        .select('id, title, author, category, description, cover_image_url, views, rating, created_at, language, page_count, slug, display_type, book_file_type')
        .eq('status', 'approved')
        .range(page * BOOKS_PER_PAGE, (page + 1) * BOOKS_PER_PAGE - 1)
        .order('id', { ascending: false });
      
      // جلب العدد الإجمالي فقط
      const { count } = await supabase
        .from('book_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      if (error) {
        console.error('Error fetching books:', error);
        setError('فشل في تحميل الكتب');
        return;
      }

      // تنسيق البيانات - محدود البيانات فقط
      let formattedBooks = (data || []).map(book => ({
        id: book.id,
        title: book.title || 'عنوان غير متوفر',
        author: book.author || 'مؤلف غير معروف',
        category: book.category || 'أخرى',
        description: book.description || '',
        cover_image: optimizeImageUrl(book.cover_image_url || '/placeholder.svg', 'cover'),
        book_type: 'uploaded',
        views: book.views || 0,
        rating: book.rating || 0,
        is_free: true,
        created_at: book.created_at,
        cover_image_url: optimizeImageUrl(book.cover_image_url || '/placeholder.svg', 'cover'),
        optimized_cover_url: optimizeImageUrl(book.cover_image_url || '/placeholder.svg', 'cover'),
        language: book.language || 'العربية',
        page_count: book.page_count || 0,
        slug: book.slug || '',
        book_file_type: book.book_file_type || 'pdf',
        display_only: book.display_type === 'no_access'
      }));

      // إزالة الخلط العشوائي - سيتم التحكم به عبر useShuffledBooks

      // تحديث الكتب
      if (append) {
        setBooks(prevBooks => [...prevBooks, ...formattedBooks]);
      } else {
        setBooks(formattedBooks);
      }

      // فحص ما إذا كان هناك المزيد من الكتب
      const totalFetched = (page + 1) * BOOKS_PER_PAGE;
      setHasMore(totalFetched < (count || 0));
      setCurrentPage(page);

      console.log(`تم جلب ${formattedBooks.length} كتاب - الصفحة ${page + 1}`);
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
    refetch: refreshBooks 
  };
};
