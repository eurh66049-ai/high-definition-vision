
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimpleBookCard } from './SimpleBookCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { useCategoryImagesPreloader } from '@/hooks/useImagePreloader';

interface SimilarBook {
  id: string;
  title: string;
  author: string;
  cover_image_url: string;
  category: string;
  created_at: string;
  rating?: number;
}

interface SimilarBooksProps {
  bookId: string;
  category: string;
  darkMode?: boolean;
}

const SimilarBooks: React.FC<SimilarBooksProps> = ({ bookId, category, darkMode = false }) => {
  const [similarBooks, setSimilarBooks] = useState<SimilarBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const loadingRef = useRef<HTMLDivElement>(null);
  const BOOKS_PER_PAGE = 24;
  
  // تحميل مسبق لصور الكتب المشابهة - 24 دفعة واحدة
  useCategoryImagesPreloader(similarBooks);

  // مراقب التمرير للتحميل التلقائي - نفس نظام الواجهة الرئيسية
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          console.log('تحميل المزيد من الكتب المشابهة...');
          // تأخير لمدة ثانيتين مثل الواجهة الرئيسية
          setTimeout(() => {
            fetchSimilarBooks(currentPage + 1, true);
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
  }, [hasMore, loadingMore, loading, currentPage]);

  useEffect(() => {
    fetchSimilarBooks();
  }, [bookId, category]);

  const fetchSimilarBooks = async (page = 0, append = false) => {
    try {
      if (page === 0) {
        setLoading(true);
        setSimilarBooks([]);
      } else {
        setLoadingMore(true);
      }
      
      console.log('[SimilarBooks] جلب الكتب المشابهة للتصنيف:', category, 'الصفحة:', page + 1);
      
      // تنظيف اسم التصنيف للبحث
      const normalizedCategory = category.toLowerCase().trim();
      
      // البحث الذكي عن الكتب المشابهة من book_submissions مباشرة
      let query = supabase
        .from('book_submissions')
        .select('id, title, author, cover_image_url, category, created_at, rating', { count: 'exact' })
        .eq('status', 'approved')
        .neq('id', bookId);

      // البحث بالتصنيف الدقيق أولاً
      if (normalizedCategory.includes('روايات') || normalizedCategory.includes('novels')) {
        // إذا كان التصنيف يحتوي على "روايات"، ابحث في جميع تصنيفات الروايات
        query = query.or(`category.ilike.%روايات%,category.eq.novels,category.ilike.%رواية%`);
      } else if (normalizedCategory.includes('فانتازيا') || normalizedCategory.includes('fantasy')) {
        // إذا كان يحتوي على "فانتازيا"
        query = query.or(`category.ilike.%فانتازيا%,category.ilike.%fantasy%`);
      } else if (normalizedCategory.includes('خيال علمي') || normalizedCategory.includes('science')) {
        // إذا كان يحتوي على "خيال علمي"
        query = query.or(`category.ilike.%خيال علمي%,category.ilike.%science%`);
      } else if (normalizedCategory.includes('تشويق') || normalizedCategory.includes('thriller')) {
        // إذا كان يحتوي على "تشويق"
        query = query.or(`category.ilike.%تشويق%,category.ilike.%thriller%,category.ilike.%إثارة%`);
      } else if (normalizedCategory.includes('رعب') || normalizedCategory.includes('horror')) {
        // إذا كان يحتوي على "رعب"
        query = query.or(`category.ilike.%رعب%,category.ilike.%horror%`);
      } else {
        // للتصنيفات الأخرى، ابحث بالتصنيف الدقيق أو المشابه
        query = query.or(`category.eq.${category},category.ilike.%${normalizedCategory}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(page * BOOKS_PER_PAGE, (page + 1) * BOOKS_PER_PAGE - 1);

      if (error) {
        console.error('[SimilarBooks] خطأ في جلب الكتب المشابهة:', error);
        return;
      }

      const newBooks = data || [];
      
      if (append) {
        setSimilarBooks(prev => [...prev, ...newBooks]);
      } else {
        setSimilarBooks(newBooks);
      }

      // فحص ما إذا كان هناك المزيد من الكتب
      const totalFetched = (page + 1) * BOOKS_PER_PAGE;
      setHasMore(totalFetched < (count || 0));
      setCurrentPage(page);

      console.log(`[SimilarBooks] تم جلب ${newBooks.length} كتاب مشابه - الصفحة ${page + 1}`);
    } catch (error) {
      console.error('[SimilarBooks] خطأ:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  return (
    <div className="bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="text-center pb-6">
          <h2 className="text-2xl font-bold font-amiri text-foreground relative">
            كتب مشابهة قد تعجبك
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-red-500 mt-2"></div>
          </h2>
        </div>
        <div className="px-6 pb-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري تحميل الكتب المشابهة...</p>
            </div>
          ) : similarBooks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد كتب أخرى في هذا التصنيف حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {similarBooks.map((book) => (
                <SimpleBookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  cover_image={book.cover_image_url}
                  category={book.category}
                  created_at={book.created_at}
                  rating={book.rating}
                />
              ))}

              {/* مؤشر التحميل في وسط الكتب المشابهة - نفس شكل الواجهة الرئيسية */}
              {hasMore && (
                <div ref={loadingRef} className="col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5 flex justify-center items-center py-8">
                  <LoaderCircle className="h-8 w-8 text-red-500 animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimilarBooks;
