import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, BookOpen, Calendar, FileText, TrendingUp, Loader2, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { fetchMonthlyReadingStats, sendMonthlyReadingReport, checkReportAlreadySent, logReportSent, type MonthlyReadingStats } from '@/utils/monthlyReadingReportService';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const MonthlyReadingReport: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [stats, setStats] = useState<MonthlyReadingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);

  const availableYears = Array.from({ length: 3 }, (_, i) => (now.getFullYear() - i).toString());

  const handleFetchStats = async () => {
    if (!user) return;
    setLoading(true);
    setSent(false);
    setAlreadySent(false);
    try {
      const [data, wasSent] = await Promise.all([
        fetchMonthlyReadingStats(
          user.id,
          user.user_metadata?.username || user.email?.split('@')[0] || 'قارئ',
          user.email || '',
          parseInt(selectedMonth),
          parseInt(selectedYear)
        ),
        checkReportAlreadySent(user.id, parseInt(selectedMonth), parseInt(selectedYear))
      ]);
      setStats(data);
      setAlreadySent(wasSent);
    } catch {
      toast({ title: '❌ خطأ', description: 'فشل في جلب بيانات القراءة', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) handleFetchStats();
  }, [selectedMonth, selectedYear]);

  const handleSendReport = async () => {
    if (!stats || !user) return;
    setSending(true);
    try {
      const result = await sendMonthlyReadingReport(stats);
      if (result.success) {
        await logReportSent(user.id, parseInt(selectedMonth), parseInt(selectedYear));
        setSent(true);
        setAlreadySent(true);
        toast({ title: '✅ تم الإرسال', description: 'تم إرسال التقرير الشهري إلى بريدك الإلكتروني بنجاح' });
      } else {
        toast({ title: '❌ خطأ', description: `فشل في إرسال التقرير: ${result.error || 'خطأ غير معروف'}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: '❌ خطأ', description: `حدث خطأ أثناء إرسال التقرير: ${err?.message || 'خطأ غير معروف'}`, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground font-bold">يجب تسجيل الدخول لعرض التقرير الشهري</p>
      </div>
    );
  }

  const statItems = stats ? [
    { icon: BookOpen, label: 'كتب مقروءة', value: stats.books_read, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: FileText, label: 'صفحات مقروءة', value: stats.pages_read, color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Calendar, label: 'أيام قراءة', value: stats.reading_days, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: TrendingUp, label: 'صفحات/يوم', value: stats.avg_pages_per_day, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ] : [];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Month/Year Selector */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="bg-card border-border text-foreground font-bold rounded-xl h-11">
              <SelectValue placeholder="الشهر" />
            </SelectTrigger>
            <SelectContent>
              {ARABIC_MONTHS.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="bg-card border-border text-foreground font-bold rounded-xl h-11">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Stats Display */}
      {stats && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {statItems.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/50 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-cairo truncate">{s.label}</p>
                  <p className="text-xl font-black text-foreground font-tajawal">{s.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Favorite Category */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 border border-primary/15">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg">📂</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-cairo">التصنيف المفضل</p>
              <p className="text-sm font-black text-foreground">{stats.favorite_category}</p>
            </div>
          </div>

          {/* Motivational Message */}
          {stats.motivational_message && (
            <div className="p-3.5 rounded-2xl bg-accent/50 border border-border/50 text-center">
              <p className="text-sm font-bold text-foreground leading-relaxed">{stats.motivational_message}</p>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendReport}
            disabled={sending || sent || alreadySent || stats.books_read === 0}
            className="w-full font-black text-sm rounded-xl h-11"
            variant={sent || alreadySent ? 'secondary' : 'default'}
          >
            {sent || alreadySent ? (
              <><CheckCircle2 className="h-4 w-4 ml-2" /> تم إرسال تقرير هذا الشهر</>
            ) : sending ? (
              <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> جاري الإرسال...</>
            ) : stats.books_read === 0 ? (
              'لا توجد بيانات لإرسالها'
            ) : (
              <><Send className="h-4 w-4 ml-2" /> إرسال التقرير إلى بريدي</>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default MonthlyReadingReport;
