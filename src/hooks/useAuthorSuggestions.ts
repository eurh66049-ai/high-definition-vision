import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthorSuggestion {
  author: string;
  bio: string | null;
  avatar_url: string | null;
  book_count: number;
}

export const useAuthorSuggestions = (searchTerm: string) => {
  const [suggestions, setSuggestions] = useState<AuthorSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchAuthors = async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      
      try {
        // البحث عن المؤلفين من جدول authors
        const { data, error } = await supabase
          .from('authors')
          .select('name, bio, avatar_url, books_count')
          .ilike('name', `%${searchTerm.trim()}%`);

        if (error) {
          console.error('خطأ في البحث عن المؤلفين:', error);
          return;
        }

        if (data && data.length > 0) {
          // تحويل البيانات إلى النموذج المطلوب
          const authorSuggestions = data.map(author => ({
            author: author.name,
            bio: author.bio,
            avatar_url: author.avatar_url,
            book_count: author.books_count || 0
          }))
          .sort((a, b) => b.book_count - a.book_count)
          .slice(0, 5); // أقصى 5 اقتراحات

          setSuggestions(authorSuggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('خطأ غير متوقع في البحث عن المؤلفين:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchAuthors, 300); // تأخير 300ms
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return { suggestions, isLoading };
};