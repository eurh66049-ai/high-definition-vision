import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/utils/userProfile';
import { KOTOBI_AI_USER_ID, resolveKotobiAiAvatar } from '@/utils/kotobiAi';

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  country_name: string | null;
  country_code: string | null;
  created_at: string;
  last_seen: string | null;
  is_verified: boolean;
  allow_messaging: boolean | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  social_whatsapp: string | null;
  website: string | null;
}

export interface UserReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  book_id: string;
  book_title: string;
  book_cover_url: string | null;
  book_author: string;
  book_slug: string | null;
}

export interface UserQuote {
  id: string;
  quote_text: string;
  book_title: string;
  author_name: string;
  book_cover_url: string | null;
  book_category: string | null;
  book_id: string | null;
  book_slug: string | null;
  created_at: string;
}

export interface UserBook {
  id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  category: string;
  created_at: string;
  rating: number;
  views: number;
  slug: string | null;
  display_type: string;
}

export const useUserPublicProfile = (userIdentifier: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [quotes, setQuotes] = useState<UserQuote[]>([]);
  const [books, setBooks] = useState<UserBook[]>([]);
  const [lastReplyAt, setLastReplyAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // حساب الإحصائيات
  const stats = {
    booksCount: books.length,
    reviewsCount: reviews.length,
    quotesCount: quotes.length,
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userIdentifier) {
        setLoading(false);
        setError('معرف المستخدم غير موجود');
        return;
      }

      setLoading(true);
      setError(null);

      const identifier = userIdentifier.trim();

      try {
        // جلب بيانات الملف الشخصي
        let profileData: UserProfile | null = null;
        let profileError: any = null;

        if (isUuid(identifier)) {
          const res = await supabase
            .from('profiles')
            .select('*')
            .eq('id', identifier)
            .maybeSingle();
          profileData = (res.data as UserProfile | null) ?? null;
          profileError = res.error;
        } else {
          const res = await supabase
            .from('profiles')
            .select('*')
            .eq('username', identifier)
            .maybeSingle();
          profileData = (res.data as UserProfile | null) ?? null;
          profileError = res.error;

          // fallback بسيط (في حال اختلاف حالة الأحرف)
          if (!profileData) {
            const fallback = await supabase
              .from('profiles')
              .select('*')
              .ilike('username', identifier)
              .maybeSingle();
            profileData = (fallback.data as UserProfile | null) ?? null;
            profileError = fallback.error;
          }
        }

        if (profileError || !profileData) {
          console.error('Error fetching profile:', profileError);
          setError('لم يتم العثور على المستخدم');
          setLoading(false);
          return;
        }

        setProfile({
          ...profileData,
          avatar_url: resolveKotobiAiAvatar({ userId: profileData.id, avatarUrl: profileData.avatar_url }),
        });

        const resolvedUserId = profileData.id;

        // جلب المراجعات مع معلومات الكتب
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('book_reviews')
          .select('id, rating, comment, created_at, book_id')
          .eq('user_id', resolvedUserId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!reviewsError && reviewsData) {
          // جلب معلومات الكتب للمراجعات
          const bookIds = reviewsData.map(r => r.book_id);
          if (bookIds.length > 0) {
            const { data: booksInfo } = await supabase
              .from('book_submissions')
              .select('id, title, cover_image_url, author, slug')
              .in('id', bookIds)
              .eq('status', 'approved');

            const reviewsWithBooks = reviewsData.map(review => {
              const bookInfo = booksInfo?.find(b => b.id === review.book_id);
              return {
                ...review,
                book_title: bookInfo?.title || 'كتاب غير معروف',
                book_cover_url: bookInfo?.cover_image_url || null,
                book_author: bookInfo?.author || '',
                book_slug: bookInfo?.slug || null,
              };
            });
            setReviews(reviewsWithBooks);
          }
        }

        // جلب الاقتباسات
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('id, quote_text, book_title, author_name, book_cover_url, book_category, book_id, book_slug, created_at')
          .eq('user_id', resolvedUserId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!quotesError && quotesData) {
          setQuotes(quotesData);
        }

        if (resolvedUserId === KOTOBI_AI_USER_ID) {
          const { data: latestReply } = await supabase
            .from('messages')
            .select('created_at')
            .eq('sender_id', resolvedUserId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          setLastReplyAt(latestReply?.created_at ?? null);
        } else {
          setLastReplyAt(null);
        }

        // جلب الكتب التي رفعها المستخدم
        const { data: booksData, error: booksError } = await supabase
          .from('book_submissions')
          .select('id, title, author, cover_image_url, category, created_at, rating, views, slug, display_type')
          .eq('user_id', resolvedUserId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!booksError && booksData) {
          setBooks(booksData);
        }

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('حدث خطأ في جلب البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userIdentifier]);

  // دالة لتنسيق آخر نشاط
  const getLastActivity = () => {
    if (profile?.id === KOTOBI_AI_USER_ID) {
      const activities: { type: string; date: string }[] = [];
      if (quotes.length > 0) activities.push({ type: 'quote', date: quotes[0].created_at });
      if (lastReplyAt) activities.push({ type: 'message', date: lastReplyAt });
      if (activities.length === 0) return null;
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return activities[0];
    }

    // المطلوب: آخر نشاط فعلي (Last seen) وليس آخر مراجعة/اقتباس/كتاب
    if (profile?.last_seen) {
      return { type: 'seen', date: profile.last_seen };
    }

    // fallback فقط إذا لم يكن last_seen متوفر
    const activities: { type: string; date: string }[] = [];
    if (reviews.length > 0) activities.push({ type: 'review', date: reviews[0].created_at });
    if (quotes.length > 0) activities.push({ type: 'quote', date: quotes[0].created_at });
    if (books.length > 0) activities.push({ type: 'book', date: books[0].created_at });
    if (activities.length === 0) return null;
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return activities[0];
  };

  return {
    profile,
    reviews,
    quotes,
    books,
    stats,
    loading,
    error,
    getLastActivity,
  };
};
