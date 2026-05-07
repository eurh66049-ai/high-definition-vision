import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LoaderCircle } from 'lucide-react';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { useForcePageRefresh } from '@/hooks/useForcePageRefresh';
import { NavigationHistoryManager } from '@/utils/navigationHistory';
import { SEOHead } from '@/components/seo/SEOHead';


interface CategoryData {
  category: string;
  count: number;
}

const BookCategories: React.FC = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const loadingRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const CATEGORIES_PER_PAGE = 24;
  
  const { navigateWithRefresh } = useForcePageRefresh({
    forceRefreshOnCategoryChange: true,
    forceRefreshOnBookChange: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  // مراقب التمرير للتحميل التلقائي - نفس نظام الواجهة الرئيسية
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          console.log('تحميل المزيد من الأقسام...');
          // تأخير لمدة ثانيتين مثل الواجهة الرئيسية
          setTimeout(() => {
            fetchCategories(currentPage + 1, true);
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

  // Add ad script to page

  const fetchCategories = async (page = 0, append = false) => {
    try {
      if (page === 0) {
        setLoading(true);
        setCategories([]);
      } else {
        setLoadingMore(true);
      }
      
      const { data, error } = await supabase.rpc('get_categories_with_pagination', {
        p_limit: CATEGORIES_PER_PAGE,
        p_offset: page * CATEGORIES_PER_PAGE
      });

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // تحويل إلى مصفوفة التصنيفات
      const newCategoryArray: CategoryData[] = (data || []).map(({ category, count }) => ({
        category,
        count: Number(count)
      }));

      if (append) {
        setCategories(prev => [...prev, ...newCategoryArray]);
      } else {
        setCategories(newCategoryArray);
      }

      // تحديد ما إذا كان هناك المزيد من البيانات
      setHasMore((data || []).length === CATEGORIES_PER_PAGE);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCategoryClick = async (category: string) => {
    // حفظ الحالة الحالية قبل الانتقال
    await NavigationHistoryManager.saveCurrentState('/categories');
    
    // الحصول على الترجمة العربية للتصنيف لاستخدامها في الـ URL
    const arabicCategory = getCategoryInArabic(category);
    
    // إجبار التحديث الفوري للصفحة مع الاسم العربي
    window.location.href = `/category/${encodeURIComponent(arabicCategory)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="أقسام وتصنيفات الكتب العربية المجانية | كتبي"
        description="تصفح الكتب العربية حسب الأقسام والتصنيفات المختلفة. أدب، علوم، تاريخ، فلسفة، تنمية ذاتية والمزيد. حمّل مجاناً من كتبي."
        keywords="أقسام الكتب, تصنيفات الكتب العربية, كتب أدب, كتب علوم, كتب تاريخ, كتب فلسفة, كتبي"
        canonical="https://kotobi.xyz/categories"
        breadcrumbs={[
          { name: 'الرئيسية', url: 'https://kotobi.xyz/' },
          { name: 'التصنيفات', url: 'https://kotobi.xyz/categories' }
        ]}
      />
      <Navbar />
      
      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-normal text-foreground mb-2">أقسام الكتب</h1>
            <p className="text-muted-foreground">اكتشف الكتب حسب التصنيفات المختلفة</p>
          </div>


          {/* Categories Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {categories.map((categoryData) => (
                <Card 
                  key={categoryData.category}
                  onClick={() => handleCategoryClick(categoryData.category)}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card hover:bg-accent/50 border border-border"
                >
                  <CardContent className="p-6">
                    <div className="text-center space-y-3">
                      <h3 className="font-tajawal text-card-foreground" style={{ fontWeight: 400, fontSize: '21px' }}>
                        {getCategoryInArabic(categoryData.category)}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className="bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        {categoryData.count} كتاب
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* مؤشر التحميل في وسط الأقسام - نفس شكل الواجهة الرئيسية */}
              {hasMore && (
                <div ref={loadingRef} className="col-span-2 flex justify-center items-center py-8">
                  <LoaderCircle className="h-8 w-8 text-red-500 animate-spin" />
                </div>
              )}
            </div>
          )}
          
          {!loading && categories.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">لا توجد تصنيفات متاحة</p>
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

export default BookCategories;