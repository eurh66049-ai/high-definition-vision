import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { useQuotes } from '@/hooks/useQuotes';
import { QuoteCard } from '@/components/quotes/QuoteCard';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Quote, Users, Loader2 } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';

const Quotes = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { quotes, loading, loadingMore, hasMore, error, loadMore, refetch, deleteQuote, updateQuote } = useQuotes();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // إعداد Intersection Observer للتحميل التلقائي عند التمرير
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, loadMore]);

  // إزالة شرط تسجيل الدخول - الاقتباسات متاحة للجميع الآن

  if (error) {
    return (
      <div className={`min-h-screen pb-20 md:pb-0 ${theme === 'dark' ? 'dark' : ''}`} style={{ backgroundColor: 'hsl(var(--books-background))' }}>
        <SEOHead
          title="الاقتباسات - منصة كتبي"
          description="اقرأ اقتباسات ملهمة من أعضاء مجتمع القراء على منصة كتبي."
          keywords="اقتباسات, عبارات, حكمة, منصة كتبي"
          canonical="https://kotobi.xyz/quotes"
        />
        <Navbar />
        
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-amiri font-bold mb-8 text-center">الاقتباسات</h1>
          <div className="text-center py-12">
            <p className="text-xl font-cairo mb-6 text-destructive">{error}</p>
            <Button 
              onClick={refetch} 
              variant="default" 
              className="font-cairo text-base px-6 py-2"
            >
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 md:pb-0 ${theme === 'dark' ? 'dark' : ''}`} style={{ backgroundColor: 'hsl(var(--books-background))' }}>
      <SEOHead
        title="الاقتباسات - منصة كتبي"
        description="اقرأ اقتباسات ملهمة من أعضاء مجتمع القراء على منصة كتبي."
        keywords="اقتباسات, عبارات, حكمة, منصة كتبي"
        canonical="https://kotobi.xyz/quotes"
      />
      <Navbar />
      
      <div className="container mx-auto py-8 px-4 pb-40">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Quote className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-amiri font-bold">الاقتباسات</h1>
          </div>
          <p className="text-muted-foreground text-lg font-cairo max-w-2xl mx-auto mb-6">
            استمتع بقراءة الاقتباسات المُلهمة من أعضاء مجتمع القراء. لإضافة اقتباس، انتقل إلى صفحة الكتاب واضغط على "أضف اقتباساً"
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-amiri font-bold mb-4">لا توجد اقتباسات بعد</h3>
            <p className="text-muted-foreground font-cairo mb-8 max-w-md mx-auto">
              لإضافة اقتباس، انتقل إلى صفحة أي كتاب واضغط على "أضف اقتباساً من هذا الكتاب"
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm font-cairo">
                  {quotes.length} اقتباس من أعضاء المجتمع
                </span>
              </div>
            </div>
            
            {quotes.map(quote => (
              <QuoteCard key={quote.id} quote={quote} onDelete={deleteQuote} onUpdate={updateQuote} />
            ))}
            
            {/* مؤشر التحميل للمزيد */}
            {hasMore && (
              <div ref={loadMoreRef} className="w-full py-8">
                {loadingMore && (
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="mr-2 text-muted-foreground font-cairo">
                      جاري تحميل المزيد...
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* رسالة عند انتهاء جميع الاقتباسات */}
            {!hasMore && quotes.length > 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-cairo">
                  تم عرض جميع الاقتباسات المتاحة
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotes;