import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuthorReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  book_id: string;
  book_title: string;
  book_cover_url: string | null;
  book_slug: string | null;
  reviewer_username: string;
  reviewer_avatar_url: string | null;
}

export interface AuthorQuote {
  id: string;
  quote_text: string;
  book_title: string;
  book_cover_url: string | null;
  book_category: string | null;
  book_id: string | null;
  book_slug: string | null;
  created_at: string;
  user_id: string;
  quoter_username: string;
  quoter_avatar_url: string | null;
}

export const useAuthorReviewsQuotes = (authorName: string | null) => {
  const [reviews, setReviews] = useState<AuthorReview[]>([]);
  const [quotes, setQuotes] = useState<AuthorQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!authorName) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // جلب كتب المؤلف أولاً
        const { data: authorBooks, error: booksError } = await supabase
          .from('book_submissions')
          .select('id, title, cover_image_url, slug')
          .eq('status', 'approved')
          .eq('author', authorName);

        if (booksError || !authorBooks?.length) {
          setLoading(false);
          return;
        }

        const bookIds = authorBooks.map(b => b.id);
        const bookMap = new Map(authorBooks.map(b => [b.id, b]));

        // جلب المراجعات لكتب المؤلف
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('book_reviews')
          .select('id, rating, comment, created_at, user_id, book_id')
          .in('book_id', bookIds)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!reviewsError && reviewsData) {
          // جلب معلومات المستخدمين
          const userIds = [...new Set(reviewsData.map(r => r.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          const reviewsWithInfo = reviewsData.map(review => {
            const book = bookMap.get(review.book_id);
            const profile = profileMap.get(review.user_id);
            return {
              ...review,
              book_title: book?.title || 'كتاب غير معروف',
              book_cover_url: book?.cover_image_url || null,
              book_slug: book?.slug || null,
              reviewer_username: profile?.username || 'مستخدم',
              reviewer_avatar_url: profile?.avatar_url || null,
            };
          });
          setReviews(reviewsWithInfo);
        }

        // جلب الاقتباسات من كتب المؤلف
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('id, quote_text, book_title, book_cover_url, book_category, book_id, book_slug, created_at, user_id')
          .in('book_id', bookIds)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!quotesError && quotesData) {
          // جلب معلومات المستخدمين
          const userIds = [...new Set(quotesData.map(q => q.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          const quotesWithInfo = quotesData.map(quote => {
            const profile = profileMap.get(quote.user_id);
            return {
              ...quote,
              quoter_username: profile?.username || 'مستخدم',
              quoter_avatar_url: profile?.avatar_url || null,
            };
          });
          setQuotes(quotesWithInfo);
        }

      } catch (err) {
        console.error('Error fetching author reviews/quotes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authorName]);

  return { reviews, quotes, loading };
};
