import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Loader2, LoaderCircle } from 'lucide-react';
import { getCategoryInArabic, getEnglishCategoryKey } from '@/utils/categoryTranslation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleBookCard } from '@/components/books/SimpleBookCard';
import { NavigationHistoryManager } from '@/utils/navigationHistory';
import { createBookSlug } from '@/utils/bookSlug';
import { useBatchBookStats } from '@/hooks/useBatchBookStats';
import { useCategoryImagesPreloader } from '@/hooks/useImagePreloader';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_image_url: string;
  rating: number;
  category: string;
  slug: string;
  views: number;
  created_at: string;
  display_only?: boolean;
}

interface BookStats {
  book_id: string;
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}

const CategoryBooks: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [totalBooksCount, setTotalBooksCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('random');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);
  const BOOKS_PER_PAGE = 24;
  
  // جلب إحصائيات التقييمات للكتب
  const bookIds = useMemo(() => books.map(book => book.id), [books]);
  const { stats: bookStats, loading: statsLoading } = useBatchBookStats(bookIds);
  
  // تحميل مسبق لصور الكتب - 24 دفعة واحدة
  useCategoryImagesPreloader(books);

  // استعادة حالة الترتيب عند تحميل الصفحة
  useEffect(() => {
    const restoreSortingState = async () => {
      try {
        const savedState = await NavigationHistoryManager.getSavedState();
        if (savedState?.pageData?.sortBy && savedState.pageData.category === category) {
          console.log('استعادة حالة الترتيب المحفوظة:', savedState.pageData.sortBy);
          setSortBy(savedState.pageData.sortBy);
        }
        setInitialLoadComplete(true);
      } catch (error) {
        console.warn('Failed to restore sorting state:', error);
        setInitialLoadComplete(true);
      }
    };

    restoreSortingState();
  }, [category]);

  useEffect(() => {
    if (category && initialLoadComplete) {
      fetchCategoryBooks();
    }
  }, [category, sortBy, initialLoadComplete]);

  // حفظ حالة الترتيب عند تغييره
  useEffect(() => {
    if (initialLoadComplete && category) {
      const saveState = async () => {
        const pageData = {
          sortBy,
          category: category,
          timestamp: Date.now()
        };
        await NavigationHistoryManager.saveCurrentState(
          window.location.pathname + window.location.search,
          pageData
        );
      };
      saveState();
    }
  }, [sortBy, category, initialLoadComplete]);

  const fetchCategoryBooks = async (pageNum = 0, isLoadMore = false) => {
    if (!category) return;

    if (!isLoadMore) {
      setLoading(true);
      setBooks([]);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const decodedCategory = decodeURIComponent(category);
      const englishCategoryKey = getEnglishCategoryKey(decodedCategory);

      // جلب العدد الكلي للكتب في هذا التصنيف (مرة واحدة فقط)
      if (!isLoadMore) {
        const { count } = await supabase
          .from('book_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .in('category', [englishCategoryKey, decodedCategory]);
        
        setTotalBooksCount(count || 0);
      }

      let query = supabase
        .from('book_submissions')
        .select('id, title, author, cover_image_url, rating, category, slug, views, created_at')
        .eq('status', 'approved')
        .in('category', [englishCategoryKey, decodedCategory])
        .range(pageNum * BOOKS_PER_PAGE, (pageNum + 1) * BOOKS_PER_PAGE - 1);

      // تطبيق الترتيب
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('views', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        default:
          query = query.order('id', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching category books:', error);
        return;
      }

      let processedBooks = data || [];

      // إذا كان الترتيب عشوائياً ولم نكن نحمل المزيد، نخلط الكتب
      if (sortBy === 'random' && !isLoadMore) {
        processedBooks = [...processedBooks].sort(() => Math.random() - 0.5);
      }

      if (isLoadMore) {
        setBooks(prev => [...prev, ...processedBooks]);
      } else {
        setBooks(processedBooks);
      }

      // تحديد ما إذا كان هناك المزيد من الكتب
      setHasMore(processedBooks.length === BOOKS_PER_PAGE);
      setPage(pageNum);

    } catch (error) {
      console.error('Error fetching category books:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (!loadingMore && hasMore) {
      await fetchCategoryBooks(page + 1, true);
    }
  };

  // مراقب التمرير للتحميل التلقائي - نفس نظام الواجهة الرئيسية
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          console.log('تحميل المزيد من الكتب...');
          // تأخير لمدة ثانيتين مثل الواجهة الرئيسية
          setTimeout(() => {
            handleLoadMore();
          }, 2000);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, page]);


  const handleBookNavigate = async (bookPath: string) => {
    // حفظ حالة الترتيب الحالية قبل الانتقال للكتاب
    const pageData = {
      sortBy,
      category: category,
      timestamp: Date.now()
    };
    await NavigationHistoryManager.saveCurrentState(
      window.location.pathname + window.location.search,
      pageData
    );
    
    window.location.href = bookPath;
  };

  const handleBackClick = () => {
    navigate('/categories');
  };

  const decodedCategory = category ? decodeURIComponent(category) : '';
  // التصنيف يأتي بالعربية من الـ URL، لذا نستخدمه مباشرة
  const categoryInArabic = decodedCategory;

  // إنشاء SEO ديناميكي للتصنيف
  const baseUrl = 'https://kotobi.xyz';
  const canonicalUrl = `${baseUrl}/category/${encodeURIComponent(categoryInArabic)}`;
  
  const seoTitle = totalBooksCount > 0 
    ? `كتب ${categoryInArabic} - ${totalBooksCount} كتاب متاح للقراءة والتحميل | منصة كتبي`
    : `كتب ${categoryInArabic} | منصة كتبي`;
  
  const seoDescription = totalBooksCount > 0
    ? `اكتشف ${totalBooksCount} كتاب في قسم ${categoryInArabic}. تصفح وحمّل أفضل كتب ${categoryInArabic} مجاناً على منصة كتبي - مكتبتك الرقمية العربية.`
    : `تصفح كتب ${categoryInArabic} على منصة كتبي. اقرأ وحمّل أفضل الكتب في هذا التصنيف مجاناً.`;

  const seoKeywords = `كتب ${categoryInArabic}, ${categoryInArabic} PDF, تحميل كتب ${categoryInArabic}, قراءة ${categoryInArabic} اونلاين, منصة كتبي`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="منصة كتبي" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
      </Helmet>
      
      <Navbar />

      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6">


            <div className="text-center mb-6">
              <h1 className="text-2xl font-normal text-foreground mb-2">
                كتب {categoryInArabic}
              </h1>
            </div>

            {/* Sorting Options */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ترتيب حسب:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">عشوائي</SelectItem>
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="popular">الأشهر</SelectItem>
                    <SelectItem value="rating">التقييم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>


          {/* Books Grid - 2 columns like main page */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {books.map((book) => {
            const stats = bookStats.get(book.id) || {
              book_id: book.id,
              total_reviews: 0,
              average_rating: 0,
              rating_distribution: {}
            };
            
            return (
              <SimpleBookCard 
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                cover_image={book.cover_image_url}
                category={book.category}
                created_at={book.created_at}
                display_only={book.display_only}
                rating={stats.average_rating || book.rating || 0}
                bookStats={stats}
                onNavigate={handleBookNavigate}
              />
            );
          })}

          {/* مؤشر التحميل في وسط الكتب - نفس شكل الواجهة الرئيسية */}
          {hasMore && (
            <div ref={loadingRef} className="col-span-2 md:col-span-4 flex justify-center items-center py-8">
              <LoaderCircle className="h-8 w-8 text-red-500 animate-spin" />
            </div>
          )}
            </div>
          )}

          {!loading && books.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">لا توجد كتب في هذا القسم</p>
            </div>
          )}

        </div>

        {/* مساحة إضافية لتجنب تداخل شريط التنقل السفلي */}
        <div className="h-20"></div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryBooks;