import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ModerationStats {
  totalViolations: number;
  totalBannedUsers: number;
  activeBannedWords: number;
  recentViolations: number;
}

export const useModerationHook = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<ModerationStats>({
    totalViolations: 0,
    totalBannedUsers: 0,
    activeBannedWords: 0,
    recentViolations: 0
  });
  const [loading, setLoading] = useState(true);

  // جلب إحصائيات الإشراف
  const fetchModerationStats = async () => {
    try {
      setLoading(true);

      const [bannedUsersResult, bannedWordsResult] = await Promise.all([
        supabase.from('banned_users').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('banned_words').select('id', { count: 'exact' }).eq('is_active', true)
      ]);

      setStats({
        totalViolations: 0, // لا توجد مخالفات رسائل بعد الآن
        totalBannedUsers: bannedUsersResult.count || 0,
        activeBannedWords: bannedWordsResult.count || 0,
        recentViolations: 0
      });

    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      toast({
        title: "خطأ في جلب الإحصائيات",
        description: "تعذر جلب إحصائيات الإشراف.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationStats();

    // إعداد الاستماع للتحديثات في الوقت الفعلي
    const bannedUsersChannel = supabase
      .channel('moderation_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'banned_users'
        },
        () => {
          fetchModerationStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bannedUsersChannel);
    };
  }, []);

  return {
    stats,
    loading,
    fetchModerationStats
  };
};