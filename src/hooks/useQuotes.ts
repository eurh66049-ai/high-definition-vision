import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Quote {
  id: string;
  user_id: string;
  quote_text: string;
  book_title: string;
  author_name: string;
  book_id?: string;
  book_slug?: string;
  book_cover_url?: string;
  book_author?: string;
  book_category?: string;
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
}

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { user } = useAuth();

  const QUOTES_PER_PAGE = 24;

  const fetchQuotes = async (pageNumber: number = 0, append: boolean = false) => {
    try {
      if (pageNumber === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNumber * QUOTES_PER_PAGE, (pageNumber + 1) * QUOTES_PER_PAGE - 1);

      if (error) {
        throw error;
      }

      // تحديد ما إذا كان هناك المزيد من البيانات
      setHasMore(data?.length === QUOTES_PER_PAGE);

      // جلب معلومات المستخدمين للاقتباسات
      const userIds = [...new Set(data?.map(quote => quote.user_id).filter(Boolean))];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        profilesData = profiles || [];
      }

      const quotesWithProfiles = data?.map((quote: any) => {
        const profile = profilesData.find(p => p.id === quote.user_id);
        return {
          ...quote,
          username: profile?.username || 'مستخدم مجهول',
          avatar_url: profile?.avatar_url || null
        };
      }) || [];

      if (append) {
        setQuotes(prev => [...prev, ...quotesWithProfiles]);
      } else {
        setQuotes(quotesWithProfiles);
      }
    } catch (err) {
      console.error('خطأ في جلب الاقتباسات:', err);
      setError('فشل في تحميل الاقتباسات');
    } finally {
      if (pageNumber === 0) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const loadMore = async () => {
    if (!loadingMore && hasMore) {
      setTimeout(async () => {
        const nextPage = page + 1;
        setPage(nextPage);
        await fetchQuotes(nextPage, true);
      }, 2000);
    }
  };

  const addQuote = async (quoteData: {
    quote_text: string;
    book_title: string;
    author_name: string;
    book_id?: string;
    book_cover_url?: string;
    book_author?: string;
    book_category?: string;
  }) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة اقتباس');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert([
          {
            user_id: user.id,
            quote_text: quoteData.quote_text,
            book_title: quoteData.book_title,
            author_name: quoteData.author_name,
            book_id: quoteData.book_id,
            book_cover_url: quoteData.book_cover_url,
            book_author: quoteData.book_author,
            book_category: quoteData.book_category
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      toast.success('تم إضافة الاقتباس بنجاح');
      await fetchQuotes(0, false); // إعادة تحميل الاقتباسات من البداية
      setPage(0);
      return true;
    } catch (err) {
      console.error('خطأ في إضافة الاقتباس:', err);
      toast.error('فشل في إضافة الاقتباس');
      return false;
    }
  };

  const updateQuote = async (quoteId: string, quoteData: {
    quote_text: string;
    book_title: string;
    author_name: string;
    book_id?: string;
    book_cover_url?: string;
    book_author?: string;
    book_category?: string;
  }) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لتعديل الاقتباس');
      return false;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .update(quoteData)
        .eq('id', quoteId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // تحديث فوري للواجهة - تحديث الاقتباس في القائمة مباشرة
      setQuotes(prevQuotes => 
        prevQuotes.map(quote => 
          quote.id === quoteId 
            ? { ...quote, ...quoteData, updated_at: new Date().toISOString() }
            : quote
        )
      );

      toast.success('تم تحديث الاقتباس بنجاح');
      return true;
    } catch (err) {
      console.error('خطأ في تحديث الاقتباس:', err);
      toast.error('فشل في تحديث الاقتباس');
      return false;
    }
  };

  const deleteQuote = async (quoteId: string) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لحذف الاقتباس');
      return false;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // تحديث فوري للواجهة - إزالة الاقتباس من القائمة مباشرة
      setQuotes(prevQuotes => {
        const filteredQuotes = prevQuotes.filter(quote => quote.id !== quoteId);
        
        // إذا أصبحت الصفحة فارغة وهناك صفحات سابقة، نقلل من رقم الصفحة
        if (filteredQuotes.length === 0 && page > 0) {
          setPage(prevPage => prevPage - 1);
        }
        
        return filteredQuotes;
      });
      
      toast.success('تم حذف الاقتباس بنجاح', {
        description: 'تم إزالة الاقتباس نهائياً من مجموعتك',
        duration: 4000,
      });
      
      // فرض إعادة تحميل البيانات لضمان التطابق مع الخادم
      setTimeout(() => {
        fetchQuotes(0, false);
        setPage(0);
      }, 500);
      
      return true;
    } catch (err) {
      console.error('خطأ في حذف الاقتباس:', err);
      toast.error('فشل في حذف الاقتباس');
      return false;
    }
  };

  useEffect(() => {
    fetchQuotes(0, false);
  }, []);

  return {
    quotes,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addQuote,
    updateQuote,
    deleteQuote,
    refetch: () => {
      setPage(0);
      fetchQuotes(0, false);
    }
  };
};