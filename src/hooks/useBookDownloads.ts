import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BookDownloadStats {
  downloads: number;
  loading: boolean;
  error: string | null;
}

export const useBookDownloads = (bookId: string) => {
  const [stats, setStats] = useState<BookDownloadStats>({
    downloads: 0,
    loading: true,
    error: null
  });

  // جلب إحصائيات التنزيل للكتاب
  useEffect(() => {
    if (!bookId) {
      setStats({ downloads: 0, loading: false, error: null });
      return;
    }

    const fetchDownloadStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        // البحث عن إحصائيات الكتاب في جدول book_stats
        const { data: statsData, error: statsError } = await supabase
          .from('book_stats')
          .select('downloads')
          .eq('book_id', bookId)
          .maybeSingle();

        if (statsError) {
          console.error('Error fetching download stats:', statsError);
          // إذا لم توجد إحصائيات، نرجع 0
          setStats({ downloads: 0, loading: false, error: null });
          return;
        }

        const downloadCount = statsData?.downloads || 0;
        setStats({ downloads: downloadCount, loading: false, error: null });

      } catch (error) {
        console.error('Error in useBookDownloads:', error);
        setStats({ downloads: 0, loading: false, error: 'حدث خطأ في جلب البيانات' });
      }
    };

    fetchDownloadStats();
  }, [bookId]);

  // تسجيل تنزيل جديد وتحديث العداد
  const recordDownload = async () => {
    if (!bookId) return false;

    try {
      // البحث عن سجل الإحصائيات الموجود
      const { data: existingStats, error: fetchError } = await supabase
        .from('book_stats')
        .select('downloads, book_id')
        .eq('book_id', bookId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing stats:', fetchError);
        return false;
      }

      if (existingStats) {
        // تحديث العداد الموجود
        const { error: updateError } = await supabase
          .from('book_stats')
          .update({ 
            downloads: (existingStats.downloads || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('book_id', bookId);

        if (updateError) {
          console.error('Error updating download count:', updateError);
          return false;
        }
      } else {
        // إنشاء سجل جديد
        const { error: insertError } = await supabase
          .from('book_stats')
          .insert({
            book_id: bookId,
            downloads: 1,
            total_reviews: 0
          });

        if (insertError) {
          console.error('Error creating download stats:', insertError);
          return false;
        }
      }

      // تحديث الحالة المحلية
      setStats(prev => ({
        ...prev,
        downloads: prev.downloads + 1
      }));

      return true;
    } catch (error) {
      console.error('Error recording download:', error);
      return false;
    }
  };

  return {
    downloads: stats.downloads,
    loading: stats.loading,
    error: stats.error,
    recordDownload
  };
};