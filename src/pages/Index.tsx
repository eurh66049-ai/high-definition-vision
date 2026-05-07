// Fixed SEO removal issue
import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from 'react-router-dom';
import { LoaderCircle, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useOptimizedBooksHome } from '@/hooks/useOptimizedBooksHome';
import { OptimizedBookGrid } from '@/components/books/OptimizedBookGrid';
import { SimpleBookCard } from '@/components/books/SimpleBookCard';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useFiltersState } from '@/hooks/useFiltersState';
import { SEOHead } from '@/components/seo/SEOHead';
import { getCategoryInArabic } from '@/utils/categoryTranslation';

// Lazy load heavy components
const StoriesBar = lazy(() => import('@/components/stories/StoriesBar'));
const BookStatsCounter = lazy(() => import('@/components/stats/BookStatsCounter').then(m => ({ default: m.BookStatsCounter })));

const BOOKS_PER_PAGE = 24;

const Index = () => {
  const loadingRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number>();
  const loadMoreLockRef = useRef(false);

  // استخدام نظام Navigation History
  const { navigateToBook, saveCurrentState } = useNavigationHistory();

  // استخدام نظام إدارة المرشحات
  const {
    selectedCategory,
    selectedLanguage,
    selectedPageCount,
    selectedAuthor,
    searchTerm,
    setSelectedCategory,
    setSelectedLanguage,
    setSelectedPageCount,
    setSelectedAuthor,
    setSearchTerm,
    clearAllFilters,
    saveFiltersState,
    restoreFiltersState
  } = useFiltersState({ defaultBooksPerPage: BOOKS_PER_PAGE });

  const { 
    books: optimizedBooks, 
    bookStats,
    loading: booksLoading, 
    loadingMore, 
    error: booksError, 
    hasMore, 
    loadMoreBooks
  } = useOptimizedBooksHome();

  // مراقب التمرير البسيط لحفظ الحالة - باستخدام refs لتجنب إعادة تركيب المستمع
  const filtersRef = useRef({ selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor });
  useEffect(() => {
    filtersRef.current = { selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor };
  }, [selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = window.setTimeout(() => {
        saveCurrentState({
          scrollPosition: window.pageYOffset || document.documentElement.scrollTop,
          filters: filtersRef.current
        });
      }, 900);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [saveCurrentState]);

  useEffect(() => {
    const restoreState = async () => {
      // فقط إذا لم تكن هناك معاملات في الرابط
      if (window.location.search === '') {
        await restoreFiltersState();
      }
    };

    restoreState();
  }, [restoreFiltersState]);

  const filteredBooks = useMemo(() => {
    // إذا لم تكن هناك فلاتر، نستخدم الكتب من Supabase مباشرة
    if (selectedCategory === 'all' && selectedLanguage === 'all' && selectedPageCount === 'all' && selectedAuthor === 'all') {
      return optimizedBooks;
    }

    // إذا كانت هناك فلاتر، نحتاج لجلب المزيد من البيانات وتطبيق الفلاتر محلياً
    let results = [...optimizedBooks];

    // تصفية المؤلف - يجب أن تأتي قبل التصنيف حتى تظهر النتائج الصحيحة عند اختيار مؤلف
    if (selectedAuthor && selectedAuthor !== 'all') {
      results = results.filter(book => book.author === selectedAuthor);
    }

    // تطبيق مرشح التصنيف - مطابقة دقيقة
    if (selectedCategory && selectedCategory !== 'all') {
      results = results.filter(book => book.category === selectedCategory);
    }

    // تطبيق مرشح اللغة - مطابقة دقيقة مع دعم لقيم اللغة المختلفة
    if (selectedLanguage && selectedLanguage !== 'all') {
      results = results.filter(book => {
        const bookLanguage = book.language || 'العربية';
        // دعم كل من 'العربية' و 'arabic'
        if (selectedLanguage === 'العربية') {
          return bookLanguage === 'العربية' || bookLanguage === 'arabic';
        }
        return bookLanguage === selectedLanguage;
      });
    }

    // تطبيق مرشح عدد الصفحات
    if (selectedPageCount && selectedPageCount !== 'all') {
      results = results.filter(book => {
        const pages = book.page_count || 0;
        switch (selectedPageCount) {
          case 'short': return pages > 0 && pages <= 100;
          case 'medium': return pages > 100 && pages <= 300;
          case 'long': return pages > 300;
          case 'unknown': return pages === 0;
          default: return true;
        }
      });
    }

    return results;
  }, [selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor, optimizedBooks]);

  // الكتب المعروضة حالياً - نستخدم النظام المحسن مباشرة
  const visibleBooks = useMemo(() => {
    return filteredBooks;
  }, [filteredBooks]);

  // هل يوجد المزيد من الكتب للتحميل - نستخدم hasMore من Supabase
  const shouldShowMoreIndicator = hasMore;

  // حفظ حالة المرشحات عند تغييرها
  useEffect(() => {
    // تأخير قصير للتأكد من تحديث الحالة
    const timeoutId = setTimeout(() => {
      saveFiltersState();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor, searchTerm, saveFiltersState]);

  // فك القفل بعد انتهاء التحميل الفعلي
  useEffect(() => {
    if (!loadingMore) {
      loadMoreLockRef.current = false;
    }
  }, [loadingMore]);

  // مراقب التمرير للتحميل التلقائي
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (
          target.isIntersecting &&
          shouldShowMoreIndicator &&
          !booksLoading &&
          !loadingMore &&
          !loadMoreLockRef.current
        ) {
          loadMoreLockRef.current = true;
          loadMoreBooks();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px'
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
  }, [shouldShowMoreIndicator, booksLoading, loadingMore, loadMoreBooks]);

  // إنشاء SEO ديناميكي بناءً على المرشحات المحددة
  const getSEOData = () => {
    let title = "منصة كتبي | مكتبة رقمية عربية مجانية - آلاف الكتب PDF";
    let description = "أكبر مكتبة رقمية عربية مجانية. اقرأ وحمّل أكثر من 10,000 كتاب ورواية PDF مجاناً في الأدب والعلوم والتنمية الذاتية والتاريخ والفلسفة.";
    let keywords = "كتب عربية مجانية, مكتبة رقمية عربية, تحميل كتب PDF مجانا, قراءة كتب اون لاين, روايات عربية, كتبي, kotobi";

    // تحديث SEO بناءً على التصنيف المحدد
    if (selectedCategory && selectedCategory !== 'all') {
      const categoryArabic = getCategoryInArabic(selectedCategory);
      title = `كتب ${categoryArabic} - منصة كتبي`;
      description = `تصفح وحمل أفضل كتب ${categoryArabic} مجاناً على منصة كتبي. مجموعة واسعة من الكتب عالية الجودة في مجال ${categoryArabic}.`;
      keywords = `كتب ${categoryArabic}, ${categoryArabic}, تحميل كتب ${categoryArabic}, قراءة ${categoryArabic} اونلاين, ${keywords}`;
    }

    // تحديث SEO بناءً على المؤلف المحدد
    if (selectedAuthor && selectedAuthor !== 'all') {
      title = `كتب ${selectedAuthor} - منصة كتبي`;
      description = `تصفح وحمل جميع كتب المؤلف ${selectedAuthor} مجاناً على منصة كتبي. مجموعة شاملة من أعمال ${selectedAuthor}.`;
      keywords = `كتب ${selectedAuthor}, ${selectedAuthor}, مؤلفات ${selectedAuthor}, أعمال ${selectedAuthor}, ${keywords}`;
    }

    return { title, description, keywords };
  };

  const { title: dynamicTitle, description: dynamicDescription, keywords: dynamicKeywords } = getSEOData();

  return (
    <div 
      className="min-h-screen pb-20 md:pb-0" 
      style={{ backgroundColor: 'hsl(var(--books-background))' }}
      role="document"
    >
      <SEOHead
        title={dynamicTitle}
        description={dynamicDescription}
        keywords={dynamicKeywords}
        canonical="https://kotobi.xyz/"
      />
      <Navbar />

      {/* شريط القصص 📖 */}
      <Suspense fallback={null}>
        <StoriesBar />
      </Suspense>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section بدون تأثيرات رمضان */}
        <div className="relative w-screen -mx-4 mb-8 overflow-hidden" style={{ background: 'linear-gradient(160deg, #0d0221 0%, #150734 25%, #0a1628 50%, #1a0a3a 75%, #0d0221 100%)' }}>
          {/* طبقة النجوم */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(1px 1px at 10% 20%, rgba(255,215,0,0.6) 0%, transparent 100%),
              radial-gradient(1px 1px at 30% 60%, rgba(255,215,0,0.4) 0%, transparent 100%),
              radial-gradient(1.5px 1.5px at 50% 15%, rgba(255,215,0,0.7) 0%, transparent 100%),
              radial-gradient(1px 1px at 70% 40%, rgba(255,215,0,0.5) 0%, transparent 100%),
              radial-gradient(1px 1px at 85% 70%, rgba(255,215,0,0.4) 0%, transparent 100%),
              radial-gradient(1.5px 1.5px at 15% 80%, rgba(255,215,0,0.6) 0%, transparent 100%),
              radial-gradient(1px 1px at 90% 10%, rgba(255,215,0,0.5) 0%, transparent 100%)
            `,
          }}></div>

          {/* توهج ذهبي */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px]" style={{
            background: 'radial-gradient(ellipse at center, rgba(255,180,50,0.12) 0%, transparent 70%)',
          }}></div>

          <div className="relative z-10 text-center py-12 md:py-16 px-4">
            <div className="inline-block">
              <div className="animate-fade-in">
                <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight" style={{ 
                  background: 'linear-gradient(180deg, #ffd700 0%, #f0a030 50%, #d4830a 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 10px rgba(255,180,0,0.3))',
                }}>
                  مرحباً بكم في <span style={{ color: '#c8a84e' }}>كتبي</span>
                </h1>
              </div>

              {/* خط زخرفي */}
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-[1px] w-16 md:w-24" style={{ background: 'linear-gradient(to right, transparent, rgba(255,200,50,0.5))' }}></div>
                <span style={{ color: 'rgba(255,200,100,0.6)' }}>✦</span>
                <div className="h-[1px] w-16 md:w-24" style={{ background: 'linear-gradient(to left, transparent, rgba(255,200,50,0.5))' }}></div>
              </div>

              <p className="text-base md:text-lg mb-6 max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(200,190,170,0.85)' }}>
                اكتشف آلاف الكتب العربية المجانية في مختلف المجالات
              </p>

              <div className="min-h-[92px] flex items-center justify-center">
                <Suspense fallback={<div className="min-h-[92px] w-full" aria-hidden="true" />}> 
                  <BookStatsCounter className="min-h-[92px]" />
                </Suspense>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { icon: '📖', text: 'كتب مختارة' },
                  { icon: '📚', text: 'تصنيفات متنوعة' },
                  { icon: '⭐', text: 'قراءة ممتعة' },
                ].map((item, i) => (
                  <span key={i}
                    className="px-4 py-2 text-sm rounded-full"
                    style={{ 
                      background: 'rgba(255,200,50,0.1)',
                      color: '#d4a84e', border: '1px solid rgba(255,200,50,0.2)',
                    }}
                  >
                    {item.icon} {item.text}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(to right, transparent, rgba(255,200,50,0.4), transparent)' }}></div>
        </div>

        {/* Books grid */}
        {booksLoading && optimizedBooks.length === 0 ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" color="red" />
          </div>
        ) : booksError ? (
          <div className="text-center py-16 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">حدث خطأ في تحميل الكتب: {booksError}</p>
          </div>
        ) : (
          <>
            <OptimizedBookGrid
              books={visibleBooks}
              bookStats={bookStats}
              loading={booksLoading}
              onBookClick={(book) => {
                const bookPath = `/book/${book.slug}`;
                navigateToBook(book.id);
              }}
            />

            {/* مؤشر التحميل التدريجي */}
            {shouldShowMoreIndicator && (
              <div ref={loadingRef} className="flex justify-center items-center py-8">
                <LoaderCircle className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
          </>
        )}

        {!booksLoading && optimizedBooks.length === 0 && (
          <div className="text-center mt-10 py-16 bg-muted/30 border border-border rounded-lg shadow-sm">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد كتب معتمدة حالياً.</p>
          </div>
        )}

        {filteredBooks.length === 0 && optimizedBooks.length > 0 && (
          <div className="text-center mt-10 py-16 bg-muted/30 border border-border rounded-lg shadow-sm">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد كتب تطابق معايير البحث.</p>
            <Button 
              variant="link" 
              onClick={clearAllFilters} 
              className="mt-2"
              type="button"
            >
              مسح المرشحات وإعادة المحاولة
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;