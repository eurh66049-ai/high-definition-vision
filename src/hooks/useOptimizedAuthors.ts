
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedAuthor {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  social_links: any;
  books_count: number;
  followers_count: number;
  created_at: string;
  slug: string | null;
  country_code: string | null;
  country_name: string | null;
  is_verified?: boolean;
  user_id?: string | null;
  profiles?: {
    avatar_url?: string | null;
  } | null;
}

export const useOptimizedAuthors = () => {
  const [authors, setAuthors] = useState<OptimizedAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const fetchAuthors = async (page: number = 0, reset: boolean = true) => {
    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // جلب المؤلفين من الجدول الموحد مع LEFT JOIN لجلب صور profiles وتحديد الحقول المطلوبة فقط
      const { data, error, count } = await supabase
        .from('authors')
        .select(`
          id,
          name,
          bio,
          avatar_url,
          email,
          social_links,
          books_count,
          followers_count,
          created_at,
          slug,
          country_code,
          country_name,
          user_id,
          profiles(avatar_url)
         `, { count: 'exact' })
        .order('created_at', { ascending: false }) // ترتيب حسب تاريخ الإنشاء ثم خلط عشوائي
        .range(from, to);

      if (error) {
        console.error('Error fetching authors:', error);
        setError('فشل في تحميل المؤلفين');
        return;
      }

      // معالجة البيانات واختيار أفضل صورة متاحة
      const processedAuthors = (data || []).map(author => ({
        ...author,
        // اختيار أفضل صورة متاحة: من profiles أولاً ثم من authors
        avatar_url: (author.profiles && !Array.isArray(author.profiles) && (author.profiles as any).avatar_url && (author.profiles as any).avatar_url.trim() !== '') 
          ? (author.profiles as any).avatar_url 
          : author.avatar_url
      }));

      // جلب حالة التوثيق للمؤلفين
      let authorsWithVerification = processedAuthors;
      if (authorsWithVerification.length > 0) {
        const authorIds = authorsWithVerification.map(author => author.id);
        const { data: verificationData } = await supabase
          .from('verified_authors')
          .select('author_id, is_verified')
          .in('author_id', authorIds);

        authorsWithVerification = authorsWithVerification.map(author => ({
          ...author,
          is_verified: verificationData?.find(v => v.author_id === author.id)?.is_verified || false
        }));
       }

       // خلط المؤلفين عشوائياً 
       const shuffleArray = (array: any[]) => {
         const shuffled = [...array];
         for (let i = shuffled.length - 1; i > 0; i--) {
           const j = Math.floor(Math.random() * (i + 1));
           [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
         }
         return shuffled;
       };

       const newAuthors = shuffleArray(authorsWithVerification);
      
      if (reset || page === 0) {
        // إزالة التكرار باستخدام Map
        const uniqueAuthors = new Map();
        newAuthors.forEach(author => {
          uniqueAuthors.set(author.id, author);
        });
        setAuthors(Array.from(uniqueAuthors.values()));
      } else {
        setAuthors(prev => {
          // دمج البيانات الجديدة مع التأكد من عدم التكرار
          const uniqueAuthors = new Map();
          [...prev, ...newAuthors].forEach(author => {
            uniqueAuthors.set(author.id, author);
          });
          return Array.from(uniqueAuthors.values());
        });
      }

      // تحديد ما إذا كانت هناك صفحات أخرى
      const totalLoaded = (page + 1) * ITEMS_PER_PAGE;
      setHasMore(totalLoaded < (count || 0));
      setCurrentPage(page);

      console.log(`تم جلب ${newAuthors.length} مؤلف - الصفحة ${page + 1}`);

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAuthors(0, true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setTimeout(() => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage); // تحديث الصفحة فوراً لمنع التحميل المتكرر
        fetchAuthors(nextPage, false);
      }, 2000);
    }
  };

  const syncAuthors = async () => {
    try {
      await supabase.rpc('sync_authors_from_books');
      // إعادة جلب البيانات بعد المزامنة
      await fetchAuthors(0, true);
    } catch (error) {
      console.error('Error syncing authors:', error);
    }
  };

  return { 
    authors, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    syncAuthors 
  };
};
