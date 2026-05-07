
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePDFUrl, enhancePDFUrl } from '@/utils/pdfValidator';
import { convertPdfToProxyUrl } from '@/utils/imageProxy';

const isSupabasePublicFileUrl = (url: string) => url.includes('/storage/v1/object/public/');

interface BookDetails {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  author_image_url?: string;
  category: string;
  description: string;
  language: string;
  publication_year?: number;
  page_count?: number;
  publisher?: string;
  cover_image_url?: string;
  book_file_url?: string;
  file_type?: string;
  display_type?: string;
  views: number;
  rating?: number;
  created_at: string;
  user_email?: string;
  file_size?: number;
  slug?: string;
}

export const useBookDetails = (bookId: string) => {
  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) {
      setLoading(false);
      return;
    }

    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // NOTE: The RLS policy may block access if the user does not own the book or does not have permission.
        // البحث أولاً بـ slug، إذا لم ينجح نبحث بـ UUID
        const { data, error: supabaseError } = await supabase
          .rpc('get_book_details', { p_book_id: bookId });

        if (supabaseError && supabaseError.code === '42501') { // "insufficient_privilege"
          setError('ليس لديك تصريح لرؤية هذا الكتاب');
          setBook(null);
          return;
        }
        if (supabaseError) {
          setError('فشل في تحميل تفاصيل الكتاب');
          return;
        }

        if (data && data.length > 0) {
          const bookData = data[0];

          let pdfUrl = bookData.book_file_url;
          if (pdfUrl) {
            if (!validatePDFUrl(pdfUrl)) {
              if (!pdfUrl.startsWith('http')) {
                pdfUrl = 'https://' + pdfUrl;
              }
            }
            if (isSupabasePublicFileUrl(pdfUrl)) {
              pdfUrl = await enhancePDFUrl(pdfUrl);
              if (pdfUrl) {
                // تحويل رابط PDF إلى proxy للاستفادة من نطاق الموقع
                pdfUrl = convertPdfToProxyUrl(pdfUrl);
              }
            }
          }

          const formattedBookData: BookDetails = {
            id: bookData.id,
            title: bookData.title,
            subtitle: bookData.subtitle,
            author: bookData.author,
            author_image_url: bookData.author_image_url,
            category: bookData.category,
            description: bookData.description,
            language: bookData.language,
            publication_year: bookData.publication_year,
            page_count: bookData.page_count,
            cover_image_url: bookData.cover_image_url,
            book_file_url: pdfUrl,
            file_type: bookData.file_type,
            display_type: bookData.display_type,
            views: bookData.views || 0,
            rating: bookData.rating,
            created_at: bookData.created_at,
            user_email: bookData.user_email,
            file_size: bookData.file_size,
            slug: bookData.slug,
            publisher: bookData.publisher
          };
          setBook(formattedBookData);
        } else {
          setError('الكتاب غير موجود أو ليس لديك إذن عرض');
        }
      } catch (err: any) {
        // Explicitly check for "forbidden" errors from Supabase
        if (err?.code === '42501' || err?.message?.includes('permission')) {
          setError('ليس لديك تصريح لرؤية هذا المحتوى');
        } else {
          setError('حدث خطأ غير متوقع');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [bookId]);

  return { book, loading, error };
};
