
// إدارة تقدم القراءة في localStorage
interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  lastReadAt: string;
  title?: string;
}

const READING_PROGRESS_KEY = 'kutubi_reading_progress';

/**
 * حفظ تقدم القراءة في localStorage والسحابة
 */
export const saveReadingProgress = async (
  bookId: string, 
  currentPage: number, 
  totalPages: number, 
  title?: string,
  author?: string,
  coverUrl?: string
) => {
  try {
    // Save to localStorage
    const existingProgress = getReadingProgress();
    const progress: ReadingProgress = {
      bookId,
      currentPage,
      totalPages,
      lastReadAt: new Date().toISOString(),
      title
    };
    
    existingProgress[bookId] = progress;
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(existingProgress));
    
    console.log(`💾 تم حفظ تقدم القراءة: الكتاب ${bookId} - الصفحة ${currentPage}`);

    // Save to Supabase (async, non-blocking)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('reading_history').upsert({
          user_id: user.id,
          book_id: bookId,
          book_title: title || 'كتاب بدون عنوان',
          book_author: author,
          book_cover_url: coverUrl,
          current_page: currentPage,
          total_pages: totalPages,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,book_id'
        });
      }
    } catch (cloudError) {
      console.log('تعذر حفظ التقدم في السحابة:', cloudError);
    }
  } catch (error) {
    console.error('خطأ في حفظ تقدم القراءة:', error);
  }
};

/**
 * استرجاع تقدم القراءة لكتاب معين
 */
export const getBookReadingProgress = (bookId: string): ReadingProgress | null => {
  try {
    const allProgress = getReadingProgress();
    return allProgress[bookId] || null;
  } catch (error) {
    console.error('خطأ في استرجاع تقدم القراءة:', error);
    return null;
  }
};

/**
 * استرجاع جميع تقدم القراءة
 */
export const getReadingProgress = (): Record<string, ReadingProgress> => {
  try {
    const stored = localStorage.getItem(READING_PROGRESS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('خطأ في استرجاع تقدم القراءة:', error);
    return {};
  }
};

/**
 * حذف تقدم القراءة لكتاب معين
 */
export const removeBookReadingProgress = (bookId: string) => {
  try {
    const existingProgress = getReadingProgress();
    delete existingProgress[bookId];
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(existingProgress));
    
    console.log(`🗑️ تم حذف تقدم القراءة للكتاب ${bookId}`);
  } catch (error) {
    console.error('خطأ في حذف تقدم القراءة:', error);
  }
};

/**
 * الحصول على آخر الكتب المقروءة
 */
export const getRecentBooks = (limit: number = 5): ReadingProgress[] => {
  try {
    const allProgress = getReadingProgress();
    return Object.values(allProgress)
      .sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('خطأ في استرجاع الكتب الأخيرة:', error);
    return [];
  }
};

/**
 * حساب نسبة التقدم
 */
export const calculateProgressPercentage = (currentPage: number, totalPages: number): number => {
  if (totalPages === 0) return 0;
  return Math.round((currentPage / totalPages) * 100);
};

/**
 * التحقق من إكمال الكتاب
 */
export const isBookCompleted = (currentPage: number, totalPages: number): boolean => {
  return currentPage >= totalPages;
};
