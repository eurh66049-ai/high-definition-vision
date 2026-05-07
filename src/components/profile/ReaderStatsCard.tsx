import React, { useState, useEffect, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Clock,
  Layers,
  Star,
  TrendingUp,
  Award,
  Flame,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryStat {
  name: string;
  count: number;
  percentage: number;
}

interface ReaderStats {
  totalBooks: number;
  completedBooks: number;
  totalPagesRead: number;
  totalPages: number;
  totalHours: number;
  favoriteCategories: CategoryStat[];
  currentStreak: number;
  completionRate: number;
  avgProgress: number;
}

const ReaderStatsCard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReaderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchStats = async () => {
      try {
        const { data: history } = await supabase
          .from('reading_history')
          .select('book_id, current_page, total_pages, is_completed, last_read_at, started_at, reading_time_minutes')
          .eq('user_id', user.id);

        if (!history || history.length === 0) { setStats(null); setLoading(false); return; }

        const bookIds = history.map((h) => h.book_id);
        const { data: books } = await supabase
          .from('book_submissions')
          .select('id, category')
          .in('id', bookIds)
          .eq('status', 'approved');

        const categoryMap = new Map<string, string>();
        books?.forEach((b) => categoryMap.set(b.id, b.category));

        const totalBooks = history.length;
        const completedBooks = history.filter((h) => h.is_completed).length;
        const totalPagesRead = history.reduce((s, h) => s + (h.current_page || 0), 0);
        const totalPages = history.reduce((s, h) => s + (h.total_pages || 0), 0);
        const totalReadingMinutes = history.reduce((s, h) => s + ((h as any).reading_time_minutes || 0), 0);
        const totalHours = Math.round((totalReadingMinutes / 60) * 10) / 10;
        const avgProgress = totalBooks > 0
          ? Math.round(history.reduce((s, h) => s + (h.total_pages > 0 ? (h.current_page / h.total_pages) * 100 : 0), 0) / totalBooks)
          : 0;

        const catCounts: Record<string, number> = {};
        history.forEach((h) => {
          const cat = categoryMap.get(h.book_id) || 'غير مصنف';
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        });

        const favoriteCategories: CategoryStat[] = Object.entries(catCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalBooks) * 100) }));

        const sortedDates = [
          ...new Set(history.map((h) => h.last_read_at).filter(Boolean).map((d) => new Date(d!).toDateString())),
        ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        let streak = 0;
        if (sortedDates.length > 0) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          let checkDate = today;
          for (const dateStr of sortedDates) {
            const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
            const diff = Math.round((checkDate.getTime() - d.getTime()) / 86400000);
            if (diff <= 1) { streak++; checkDate = d; } else break;
          }
        }

        setStats({
          totalBooks, completedBooks, totalPagesRead, totalPages, totalHours,
          favoriteCategories, currentStreak: streak,
          completionRate: totalBooks > 0 ? Math.round((completedBooks / totalBooks) * 100) : 0,
          avgProgress,
        });
      } catch (err) {
        console.error('Error fetching reader stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const readerLevel = useMemo(() => {
    if (!stats) return { label: 'قارئ جديد', icon: BookOpen, color: 'text-muted-foreground' };
    const p = stats.totalPagesRead;
    if (p >= 5000) return { label: 'قارئ أسطوري', icon: Award, color: 'text-yellow-500' };
    if (p >= 2000) return { label: 'قارئ خبير', icon: Star, color: 'text-purple-500' };
    if (p >= 500) return { label: 'قارئ متقدم', icon: TrendingUp, color: 'text-blue-500' };
    if (p >= 100) return { label: 'قارئ نشط', icon: BookOpen, color: 'text-green-500' };
    return { label: 'قارئ مبتدئ', icon: BookOpen, color: 'text-muted-foreground' };
  }, [stats]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  if (!stats || stats.totalBooks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-tajawal font-bold text-base">
          لم تبدأ القراءة بعد!
        </p>
        <p className="text-muted-foreground/70 font-cairo text-sm mt-1">
          ابدأ بقراءة كتاب لرؤية إحصائياتك هنا
        </p>
      </div>
    );
  }

  const LevelIcon = readerLevel.icon;

  const statItems = [
    { icon: BookOpen, label: 'كتب مقروءة', value: stats.totalBooks, sub: `${stats.completedBooks} مكتمل`, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Layers, label: 'صفحات مقروءة', value: stats.totalPagesRead.toLocaleString('ar-EG'), sub: `من ${stats.totalPages.toLocaleString('ar-EG')}`, color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Clock, label: 'ساعات القراءة', value: stats.totalHours, sub: 'ساعة فعلية', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Flame, label: 'سلسلة القراءة', value: stats.currentStreak, sub: 'يوم متتالي', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Reader Level Badge */}
      <div className="flex items-center justify-center">
        <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm font-tajawal rounded-full">
          <LevelIcon className={`h-4 w-4 ${readerLevel.color}`} />
          {readerLevel.label}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
            className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`absolute top-3 left-3 w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="mt-10">
              <div className="text-2xl font-black text-foreground font-tajawal">{s.value}</div>
              <div className="text-xs text-muted-foreground font-cairo mt-0.5">{s.label}</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress Bars */}
      <div className="space-y-4 bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-cairo text-foreground font-bold">نسبة الإكمال</span>
            <span className="text-sm font-bold text-primary">{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-cairo text-foreground font-bold">متوسط التقدم</span>
            <span className="text-sm font-bold text-primary">{stats.avgProgress}%</span>
          </div>
          <Progress value={stats.avgProgress} className="h-2" />
        </div>
      </div>

      {/* Favorite Categories */}
      {stats.favoriteCategories.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-bold font-cairo text-foreground mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            الأنواع المفضلة
          </h4>
          <div className="space-y-3">
            {stats.favoriteCategories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
              >
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-cairo text-foreground font-bold">{cat.name}</span>
                  <span className="text-muted-foreground text-xs font-cairo">
                    {cat.count} كتاب • {cat.percentage}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-l from-primary to-primary/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.06 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReaderStatsCard;
