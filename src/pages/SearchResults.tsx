import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createBookSlug } from '@/utils/bookSlug';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { Link } from 'react-router-dom';
import { BookOpen, User, Star, LoaderCircle } from 'lucide-react';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/seo/SEOHead';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loadingRef = useRef<HTMLDivElement>(null);
  const BOOKS_PER_PAGE = 24;

  const searchBooks = async (pageNum = 0, isLoadMore = false) => {
    if (!query.trim()) {
      setFilteredBooks([]);
      setLoading(false);
      return;
    }

    if (!isLoadMore) {
      setLoading(true);
      setFilteredBooks([]);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data, error } = await supabase
        .from('book_submissions')
        .select('*')
        .eq('status', 'approved')
        .or(`title.ilike.%${query}%,author.ilike.%${query}%,category.ilike.%${query}%`)
        .range(pageNum * BOOKS_PER_PAGE, (pageNum + 1) * BOOKS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching books:', error);
        return;
      }

      const processedBooks = data || [];

      if (isLoadMore) {
        setFilteredBooks(prev => [...prev, ...processedBooks]);
      } else {
        setFilteredBooks(processedBooks);
      }

      setHasMore(processedBooks.length === BOOKS_PER_PAGE);
      setPage(pageNum);

    } catch (error) {
      console.error('Error searching books:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    searchBooks();
  }, [query]);

  // مراقب التمرير للتحميل التلقائي
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          setTimeout(() => {
            searchBooks(page + 1, true);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري البحث...</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEOHead
        title={query ? `نتائج البحث عن "${query}" - منصة كتبي` : 'البحث - منصة كتبي'}
        description={query ? `نتائج البحث عن "${query}" في منصة كتبي. اعثر على الكتب والمؤلفين في المكتبة الرقمية العربية المجانية.` : 'ابحث في آلاف الكتب العربية المجانية على منصة كتبي.'}
        noindex={true}
      />
      <div className="container mx-auto px-4 py-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            نتائج البحث
          </h1>
          {query && (
            <p className="text-muted-foreground">
              نتائج البحث عن: "<span className="font-semibold text-foreground">{query}</span>"
            </p>
          )}
          {filteredBooks.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              تم العثور على {filteredBooks.length} كتاب
            </p>
          )}
        </div>

        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <Link
                key={book.id}
                to={`/book/${createBookSlug(book.title, book.author)}`}
                className="group block bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <ResponsiveImage
                    src={book.cover_image_url || '/placeholder.svg'}
                    alt={book.title}
                    aspectRatio="portrait"
                    className="group-hover:scale-105 transition-transform duration-300"
                    onError={() => {}}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-foreground text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>

                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground text-sm">{book.author}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      {getCategoryInArabic(book.category)}
                    </span>
                  </div>

                  {book.rating > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-foreground text-sm font-medium">
                        {book.rating}
                      </span>
                    </div>
                  )}

                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {book.description}
                  </p>
                </div>
              </Link>
            ))}
            
            {/* مؤشر التحميل */}
            {hasMore && (
              <div ref={loadingRef} className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center items-center py-8">
                <LoaderCircle className="h-8 w-8 text-red-500 animate-spin" />
              </div>
            )}
          </div>
        ) : query ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              لا توجد نتائج
            </h2>
            <p className="text-muted-foreground">
              لم نتمكن من العثور على كتب تطابق بحثك عن "{query}"
            </p>
            <p className="text-muted-foreground mt-2">
              جرب استخدام كلمات مختلفة أو تحقق من الإملاء
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ابدأ البحث
            </h2>
            <p className="text-muted-foreground">
              استخدم مربع البحث للعثور على الكتب التي تريدها
            </p>
          </div>
        )}
      </div>
    </div>
  );
}