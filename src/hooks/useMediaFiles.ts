
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BookMediaFile {
  media_type: string;
  file_url: string;
  file_size: number | null;
  metadata: any;
}

export const useMediaFiles = (bookId: string, bookTable: string = 'approved_books') => {
  const [mediaFiles, setMediaFiles] = useState<BookMediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMediaFiles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_book_media', {
          p_book_id: bookId,
          p_book_table: bookTable
        });

        if (error) {
          console.error('Error fetching media files:', error);
          setError('فشل في تحميل ملفات الوسائط');
          return;
        }

        setMediaFiles(data || []);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchMediaFiles();
    }
  }, [bookId, bookTable]);

  return { mediaFiles, loading, error };
};
