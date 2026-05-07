
import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Loader2, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOptimizedAuthors } from '@/hooks/useOptimizedAuthors';
import VerifiedBadge from '@/components/icons/VerifiedBadge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SEOHead } from '@/components/seo/SEOHead';
import { optimizeImageUrl } from '@/utils/imageProxy';

const Authors: React.FC = () => {
  const { authors, loading, loadingMore, error, hasMore, loadMore } = useOptimizedAuthors();
  const navigate = useNavigate();
  const loadingRef = useRef<HTMLDivElement>(null);

  // دالة للحصول على الأحرف الأولى من اسم المؤلف
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // التعامل مع النقر على المؤلف
  const handleAuthorClick = (author: { name: string; slug?: string | null }) => {
    // استخدام slug إذا كان متوفراً وليس فارغاً
    const identifier = author.slug && author.slug.trim() !== '' ? author.slug : author.name;
    // إجبار تحديث الصفحة والانتقال إلى صفحة المؤلف
    window.location.href = `/author/${encodeURIComponent(identifier)}`;
  };

  // مراقب التمرير للتحميل التلقائي - نفس نظام الواجهة الرئيسية
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          console.log('تحميل المزيد من المؤلفين...');
          // تأخير لمدة ثانيتين مثل الواجهة الرئيسية
          setTimeout(() => {
            loadMore();
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
  }, [hasMore, loadingMore, loading, loadMore]);

  // إضافة سكريبت الإعلان

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="المؤلفون العرب - تصفح كتب أشهر الكتاب | كتبي"
        description="تصفح قائمة المؤلفين العرب واكتشف أعمالهم الأدبية. اقرأ كتب مؤلفيك المفضلين وحمّلها مجاناً من منصة كتبي."
        keywords="مؤلفون عرب, كتاب عرب, أدباء عرب, كتب المؤلفين العرب, أشهر الكتاب العرب, كتبي"
        canonical="https://kotobi.xyz/authors"
        breadcrumbs={[
          { name: 'الرئيسية', url: 'https://kotobi.xyz/' },
          { name: 'المؤلفون', url: 'https://kotobi.xyz/authors' }
        ]}
      />
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          {/* مسارات التنقل */}
          <Breadcrumbs 
            items={[
              {
                label: 'المؤلفون',
                active: true
              }
            ]}
            className="mb-6"
          />
          
          <h1 className="text-3xl font-bold mb-8 text-center text-foreground">مؤلفي الكتب</h1>
          
          
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">{error}</p>
            </div>
          ) : (
            <>
              {/* شبكة المؤلفين */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {authors.map((author) => (
                  <Card 
                    key={author.id} 
                    className="bg-card border-border hover:bg-accent/50 transition-all duration-200 cursor-pointer hover-scale"
                    onClick={() => handleAuthorClick({ name: author.name, slug: author.slug })}
                  >
                    <CardContent className="p-6 text-center">
                      <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-border">
                        <AvatarImage 
                          src={optimizeImageUrl(author.avatar_url || '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png', 'avatar')} 
                          alt={author.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png';
                          }}
                        />
                        <AvatarFallback className="bg-muted text-foreground text-lg font-bold">
                          {getInitials(author.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-foreground line-clamp-2">
                          {author.name}
                        </h3>
                        {author.is_verified && (
                          <VerifiedBadge size={18} className="flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-primary text-sm font-medium">
                        {author.books_count} {author.books_count === 1 ? 'كتاب' : 'كتاب'}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {/* مؤشر التحميل في وسط المؤلفين - نفس شكل الواجهة الرئيسية */}
                {hasMore && (
                  <div ref={loadingRef} className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 flex justify-center items-center py-8">
                    <LoaderCircle className="h-8 w-8 text-red-500 animate-spin" />
                  </div>
                )}
              </div>

            </>
          )}
          
          {!loading && !error && authors.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">لا توجد مؤلفين متاحين حالياً</p>
            </div>
          )}

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Authors;
