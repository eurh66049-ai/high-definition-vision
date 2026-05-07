
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthorData {
  author: string;
  author_bio: string | null;
  author_image_url: string | null;
}

export const useAuthorSearch = (authorName: string) => {
  const [authorData, setAuthorData] = useState<AuthorData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [found, setFound] = useState(false);

  useEffect(() => {
    const searchAuthor = async () => {
      if (!authorName || authorName.trim().length < 2) {
        setAuthorData(null);
        setFound(false);
        return;
      }

      setIsSearching(true);
      
      try {
        // البحث في الكتب المعتمدة عن المؤلف
        const { data, error } = await supabase
          .from('approved_books')
          .select('author, author_bio, author_image_url')
          .ilike('author', `%${authorName.trim()}%`)
          .not('author_bio', 'is', null)
          .limit(1);

        if (error) {
          console.error('خطأ في البحث عن المؤلف:', error);
          return;
        }

        if (data && data.length > 0) {
          const foundAuthor = data[0];
          // التحقق من التطابق الدقيق للاسم
          if (foundAuthor.author.toLowerCase().trim() === authorName.toLowerCase().trim()) {
            setAuthorData({
              author: foundAuthor.author,
              author_bio: foundAuthor.author_bio,
              author_image_url: foundAuthor.author_image_url
            });
            setFound(true);
            console.log('تم العثور على بيانات المؤلف:', foundAuthor);
          } else {
            setAuthorData(null);
            setFound(false);
          }
        } else {
          setAuthorData(null);
          setFound(false);
        }
      } catch (error) {
        console.error('خطأ غير متوقع في البحث:', error);
        setAuthorData(null);
        setFound(false);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchAuthor, 500); // تأخير 500ms لتجنب البحث المفرط
    
    return () => clearTimeout(timeoutId);
  }, [authorName]);

  return { authorData, isSearching, found };
};
