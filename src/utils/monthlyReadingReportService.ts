import { supabase } from '@/integrations/supabase/client';
import { sendReport } from '@/utils/reportEmailSender';
import { getCategoryInArabic } from '@/utils/categoryTranslation';

export interface MonthlyReadingStats {
  user_name: string;
  user_email: string;
  month_name: string;
  year: string;
  books_read: number;
  pages_read: number;
  reading_days: number;
  books_list: string;
  favorite_category: string;
  avg_pages_per_day: number;
  motivational_message: string;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const MOTIVATIONAL_MESSAGES = [
  '📚 أنت قارئ مميز! استمر في رحلة المعرفة.',
  '🌟 أداء رائع هذا الشهر! القراءة تصنع الفرق.',
  '💪 كل كتاب تقرأه يفتح لك آفاقاً جديدة. واصل التقدم!',
  '🎯 أنت على الطريق الصحيح! القراءة أفضل استثمار.',
  '🚀 مستوى قراءتك في تصاعد مستمر! أحسنت.',
  '📖 القراءة غذاء العقل، وأنت تغذي عقلك جيداً!',
  '✨ شهر حافل بالقراءة! نتمنى لك شهراً أفضل.',
];

function getMotivationalMessage(booksRead: number): string {
  if (booksRead === 0) return '📚 لم تقرأ أي كتاب هذا الشهر. ابدأ الآن ولو بصفحة واحدة!';
  if (booksRead >= 10) return '🏆 أنت بطل القراءة هذا الشهر! إنجاز مذهل!';
  if (booksRead >= 5) return '🌟 أداء ممتاز! أكثر من 5 كتب في شهر واحد!';
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}

export async function fetchMonthlyReadingStats(
  userId: string,
  userName: string,
  userEmail: string,
  month?: number,
  year?: number
): Promise<MonthlyReadingStats> {
  const now = new Date();
  const targetMonth = month ?? now.getMonth(); // 0-indexed
  const targetYear = year ?? now.getFullYear();

  // حساب بداية ونهاية الشهر
  const startDate = new Date(targetYear, targetMonth, 1).toISOString();
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59).toISOString();

  // جلب سجل القراءة للشهر المحدد
  const { data: readingData, error } = await supabase
    .from('reading_history')
    .select('*')
    .eq('user_id', userId)
    .gte('last_read_at', startDate)
    .lte('last_read_at', endDate)
    .order('last_read_at', { ascending: false });

  if (error) {
    console.error('خطأ في جلب بيانات القراءة:', error);
    throw error;
  }

  const books = readingData || [];
  const booksRead = books.length;
  const pagesRead = books.reduce((sum, b) => sum + (b.current_page || 0), 0);

  // حساب أيام القراءة الفريدة
  const uniqueDays = new Set(
    books.map(b => new Date(b.last_read_at).toDateString())
  );
  const readingDays = uniqueDays.size;

  // قائمة الكتب بصيغة HTML مع صور الأغلفة
  const booksList = books.length > 0
    ? books.map(b => {
        const progress = b.total_pages > 0 
          ? Math.round((b.current_page / b.total_pages) * 100) 
          : 0;
        const coverUrl = b.book_cover_url || '';
        const coverImg = coverUrl
          ? `<img src="${coverUrl}" alt="${b.book_title}" width="40" height="58" style="width:40px;height:58px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-left:10px;border:1px solid #eee;" />`
          : `<span style="display:inline-block;width:40px;height:58px;background:#f0f0f0;border-radius:4px;vertical-align:middle;margin-left:10px;text-align:center;line-height:58px;font-size:18px;">📖</span>`;
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr><td width="50" style="vertical-align:middle;">${coverImg}</td><td style="vertical-align:middle;padding:4px 8px;"><p style="margin:0;font-size:14px;color:#1a1a2e;font-weight:bold;">${b.book_title}</p><p style="margin:2px 0 0;font-size:12px;color:#777;">${b.book_author || 'غير معروف'} — ${progress}%</p></td></tr></table>`;
      }).join('')
    : '<p style="color:#999;font-size:14px;">لم تقرأ أي كتاب هذا الشهر</p>';

  // جلب التصنيف المفضل
  let favoriteCategory = 'غير محدد';
  if (books.length > 0) {
    const bookIds = books.map(b => b.book_id);
    const { data: booksInfo } = await supabase
      .from('book_submissions')
      .select('category')
      .in('id', bookIds);

    if (booksInfo && booksInfo.length > 0) {
      const categoryCounts: Record<string, number> = {};
      booksInfo.forEach(b => {
        if (b.category) {
          categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
        }
      });
      const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      if (topCategory) favoriteCategory = getCategoryInArabic(topCategory[0]);
    }
  }

  const avgPagesPerDay = readingDays > 0 ? Math.round(pagesRead / readingDays) : 0;

  return {
    user_name: userName,
    user_email: userEmail,
    month_name: ARABIC_MONTHS[targetMonth],
    year: targetYear.toString(),
    books_read: booksRead,
    pages_read: pagesRead,
    reading_days: readingDays,
    books_list: booksList,
    favorite_category: favoriteCategory,
    avg_pages_per_day: avgPagesPerDay,
    motivational_message: getMotivationalMessage(booksRead),
  };
}

export async function checkReportAlreadySent(userId: string, month: number, year: number): Promise<boolean> {
  const { data } = await supabase
    .from('monthly_report_log')
    .select('id')
    .eq('user_id', userId)
    .eq('report_month', month)
    .eq('report_year', year)
    .maybeSingle();
  return !!data;
}

export async function logReportSent(userId: string, month: number, year: number): Promise<void> {
  await supabase
    .from('monthly_report_log')
    .insert({ user_id: userId, report_month: month, report_year: year });
}

export async function sendMonthlyReadingReport(stats: MonthlyReadingStats): Promise<{ success: boolean; error?: string }> {
  const templateParams = {
    user_name: stats.user_name,
    to_email: stats.user_email,
    month_name: stats.month_name,
    year: stats.year,
    books_read: stats.books_read.toString(),
    pages_read: stats.pages_read.toString(),
    reading_days: stats.reading_days.toString(),
    books_list: stats.books_list,
    favorite_category: stats.favorite_category,
    avg_pages_per_day: stats.avg_pages_per_day.toString(),
    motivational_message: stats.motivational_message,
  };

  console.log('📧 إرسال التقرير الشهري إلى:', stats.user_email);
  return sendReport(templateParams);
}
