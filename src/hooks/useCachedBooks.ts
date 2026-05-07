import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedBook {
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

interface CacheEntry {
  books: CachedBook[];
  timestamp: number;
  order: string[];
  [key: string]: any; // إضافة index signature للتوافق مع Json
}

const CACHE_DURATION = 2 * 60 * 60 * 1000; // ساعتان بالميلي ثانية
const BOOKS_PER_PAGE = 24;

export const useCachedBooks = () => {
  const [books, setBooks] = useState<CachedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // دالة لإنتاج seed ثابت لكل ساعتين
  const getCacheKey = useCallback(() => {
    const now = Date.now();
    const cacheWindow = Math.floor(now / CACHE_DURATION);
    return `books_cache_${cacheWindow}`;
  }, []);

  // دالة لخلط الكتب بناءً على seed ثابت لنفس الفترة
  const shuffleBooks = useCallback((books: CachedBook[], seed: number): CachedBook[] => {
    const shuffled = [...books];
    let currentIndex = shuffled.length;
    let randomIndex: number;

    // استخدام seed ثابت لإنتاج نفس الترتيب في نفس الفترة
    let rng = seed;
    const seededRandom = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };

    // خوارزمية Fisher-Yates مع RNG مخصص
    while (currentIndex !== 0) {
      randomIndex = Math.floor(seededRandom() * currentIndex);
      currentIndex--;

      [shuffled[currentIndex], shuffled[randomIndex]] = [
        shuffled[randomIndex], shuffled[currentIndex]
      ];
    }

    return shuffled;
  }, []);

  // دالة للحصول على البيانات من الذاكرة المؤقتة أو قاعدة البيانات
  const getCachedBooks = useCallback(async (): Promise<CacheEntry | null> => {
    try {
      const cacheKey = getCacheKey();
      
      // محاولة الحصول على البيانات من الذاكرة المؤقتة
      const { data: cacheData, error: cacheError } = await supabase
        .from('page_state_cache')
        .select('data_payload, timestamp')
        .eq('cache_key', cacheKey)
        .eq('page_path', '/')
        .maybeSingle();

      if (cacheError) {
        console.log('لا توجد بيانات مخزنة مؤقتاً:', cacheError.message);
        return null;
      }

      if (cacheData && cacheData.data_payload) {
        const cacheEntry = cacheData.data_payload as unknown as CacheEntry;
        const now = Date.now();
        
        // التحقق من صلاحية البيانات المخزنة مؤقتاً
        if (now - cacheEntry.timestamp < CACHE_DURATION) {
          console.log('استخدام البيانات المخزنة مؤقتاً');
          return cacheEntry;
        }
      }

      return null;
    } catch (error) {
      console.error('خطأ في قراءة الذاكرة المؤقتة:', error);
      return null;
    }
  }, [getCacheKey]);

  // دالة لحفظ البيانات في الذاكرة المؤقتة
  const saveBooksToCache = useCallback(async (books: CachedBook[], order: string[]) => {
    try {
      const cacheKey = getCacheKey();
      const timestamp = Date.now();
      const sessionId = Math.random().toString(36).substr(2, 9);
      
      const cacheEntry: CacheEntry = {
        books,
        timestamp,
        order
      };

      const { error } = await supabase
        .from('page_state_cache')
        .upsert({
          cache_key: cacheKey,
          page_path: '/',
          session_id: sessionId,
          timestamp,
          data_payload: cacheEntry as any,
          expires_at: new Date(timestamp + CACHE_DURATION).toISOString()
        });

      if (error) {
        console.error('خطأ في حفظ البيانات في الذاكرة المؤقتة:', error);
      } else {
        console.log('تم حفظ البيانات في الذاكرة المؤقتة بنجاح');
      }
    } catch (error) {
      console.error('خطأ في حفظ الذاكرة المؤقتة:', error);
    }
  }, [getCacheKey]);

  // دالة لجلب البيانات من قاعدة البيانات
  const fetchBooksFromDatabase = useCallback(async (page = 0): Promise<CachedBook[]> => {
    const { data, error } = await supabase
      .from('book_submissions')
      .select('id, title, author, category, description, cover_image_url, views, rating, created_at, language, page_count, slug, display_type, book_file_type')
      .eq('status', 'approved')
      .range(page * BOOKS_PER_PAGE, (page + 1) * BOOKS_PER_PAGE - 1)
      .order('id', { ascending: false });

    if (error) {
      throw new Error('فشل في تحميل الكتب من قاعدة البيانات');
    }

    return (data || []).map(book => ({
      id: book.id,
      title: book.title || 'عنوان غير متوفر',
      author: book.author || 'مؤلف غير معروف',
      category: book.category || 'أخرى',
      description: book.description || '',
      cover_image: book.cover_image_url || '/placeholder.svg',
      book_type: 'uploaded',
      views: book.views || 0,
      rating: book.rating || 0,
      is_free: true,
      created_at: book.created_at,
      cover_image_url: book.cover_image_url || '/placeholder.svg',
      optimized_cover_url: book.cover_image_url || '/placeholder.svg',
      language: book.language || 'العربية',
      page_count: book.page_count || 0,
      slug: book.slug || '',
      book_file_type: book.book_file_type || 'pdf',
      display_only: book.display_type === 'no_access'
    }));
  }, []);

  // دالة لتحميل الكتب
  const fetchBooks = useCallback(async (page = 0, append = false) => {
    try {
      if (page === 0) {
        setLoading(true);
        setError(null);

        // محاولة الحصول على البيانات المخزنة مؤقتاً أولاً
        const cachedData = await getCachedBooks();
        
        if (cachedData && cachedData.books.length > 0) {
          // استخدام البيانات المخزنة مؤقتة
          const orderedBooks = cachedData.order.length > 0
            ? cachedData.order.map(id => cachedData.books.find(book => book.id === id)).filter(Boolean) as CachedBook[]
            : cachedData.books;
          
          setBooks(orderedBooks);
          setCurrentPage(0);
          setHasMore(orderedBooks.length >= BOOKS_PER_PAGE);
          setLoading(false);
          
          console.log(`تم استخدام ${orderedBooks.length} كتاب من الذاكرة المؤقتة`);
          return;
        }

        // إذا لم توجد بيانات مخزنة مؤقتاً، جلب من قاعدة البيانات
        console.log('جلب الكتب من قاعدة البيانات وإنشاء ذاكرة مؤقتة جديدة');
        
        // جلب كل الكتب المتاحة لإنشاء ترتيب ثابت
        const { count } = await supabase
          .from('book_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved');

        const totalBooks = count || 0;
        const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
        
        let allBooks: CachedBook[] = [];
        
        // جلب جميع الكتب (محدود بـ 500 كتاب لتجنب بطء التحميل)
        const maxBooks = Math.min(totalBooks, 500);
        const maxPages = Math.ceil(maxBooks / BOOKS_PER_PAGE);
        
        for (let i = 0; i < maxPages; i++) {
          const pageBooks = await fetchBooksFromDatabase(i);
          allBooks = [...allBooks, ...pageBooks];
        }

        // خلط الكتب بناءً على seed ثابت لهذه الفترة الزمنية
        const seed = Math.floor(Date.now() / CACHE_DURATION);
        const shuffledBooks = shuffleBooks(allBooks, seed);
        
        // إنشاء ترتيب الكتب
        const booksOrder = shuffledBooks.map(book => book.id);
        
        // حفظ في الذاكرة المؤقتة
        await saveBooksToCache(shuffledBooks, booksOrder);
        
        // عرض الصفحة الأولى
        const firstPageBooks = shuffledBooks.slice(0, BOOKS_PER_PAGE);
        setBooks(firstPageBooks);
        setHasMore(shuffledBooks.length > BOOKS_PER_PAGE);
        setCurrentPage(0);
        
        console.log(`تم جلب وخلط ${shuffledBooks.length} كتاب وعرض ${firstPageBooks.length} كتاب`);
      } else {
        // تحميل صفحات إضافية
        setLoadingMore(true);
        
        // محاولة الحصول على البيانات المخزنة مؤقتاً
        const cachedData = await getCachedBooks();
        
        if (cachedData && cachedData.books.length > 0) {
          const startIndex = page * BOOKS_PER_PAGE;
          const endIndex = startIndex + BOOKS_PER_PAGE;
          
          const orderedBooks = cachedData.order.length > 0
            ? cachedData.order.map(id => cachedData.books.find(book => book.id === id)).filter(Boolean) as CachedBook[]
            : cachedData.books;
          
          const additionalBooks = orderedBooks.slice(startIndex, endIndex);
          
          if (append && additionalBooks.length > 0) {
            setBooks(prevBooks => [...prevBooks, ...additionalBooks]);
            setHasMore(endIndex < orderedBooks.length);
            setCurrentPage(page);
          }
          
          console.log(`تم تحميل ${additionalBooks.length} كتاب إضافي من الذاكرة المؤقتة`);
        } else {
          // Fallback إلى قاعدة البيانات
          const additionalBooks = await fetchBooksFromDatabase(page);
          
          if (append && additionalBooks.length > 0) {
            setBooks(prevBooks => [...prevBooks, ...additionalBooks]);
            setHasMore(additionalBooks.length >= BOOKS_PER_PAGE);
            setCurrentPage(page);
          }
          
          console.log(`تم تحميل ${additionalBooks.length} كتاب إضافي من قاعدة البيانات`);
        }
      }
    } catch (err) {
      console.error('خطأ في جلب الكتب:', err);
      setError('حدث خطأ في تحميل الكتب');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getCachedBooks, saveBooksToCache, fetchBooksFromDatabase, shuffleBooks]);

  // دالة لتحميل المزيد من الكتب
  const loadMoreBooks = useCallback(() => {
    if (!loadingMore && hasMore) {
      setTimeout(() => {
        fetchBooks(currentPage + 1, true);
      }, 2000);
    }
  }, [fetchBooks, currentPage, loadingMore, hasMore]);

  // دالة لإعادة تحميل الكتب
  const refreshBooks = useCallback(() => {
    setCurrentPage(0);
    setHasMore(true);
    fetchBooks(0, false);
  }, [fetchBooks]);

  // تحميل الكتب عند تحميل الكومبوننت
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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