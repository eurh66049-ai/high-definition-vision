import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface QuoteReply {
  id: string;
  quote_id: string;
  user_id: string;
  reply_text: string;
  parent_reply_id: string | null;
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
}

export const useQuoteReplies = (quoteId: string) => {
  const [replies, setReplies] = useState<QuoteReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [repliesCount, setRepliesCount] = useState(0);
  const { user } = useAuth();

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote_replies')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set(data?.map(r => r.user_id).filter(Boolean))];
      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        profilesData = profiles || [];
      }

      const repliesWithProfiles = data?.map((reply: any) => {
        const profile = profilesData.find(p => p.id === reply.user_id);
        return {
          ...reply,
          username: profile?.username || 'مستخدم مجهول',
          avatar_url: profile?.avatar_url || null,
        };
      }) || [];

      setReplies(repliesWithProfiles);
      setRepliesCount(repliesWithProfiles.length);
    } catch (err) {
      console.error('Error fetching replies:', err);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  const fetchCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('quote_replies')
      .select('*', { count: 'exact', head: true })
      .eq('quote_id', quoteId);
    if (!error && count !== null) setRepliesCount(count);
  }, [quoteId]);

  const addReply = async (replyText: string, parentReplyId?: string) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للرد');
      return false;
    }
    try {
      const { error } = await supabase
        .from('quote_replies')
        .insert({
          quote_id: quoteId,
          user_id: user.id,
          reply_text: replyText,
          parent_reply_id: parentReplyId || null,
        });
      if (error) throw error;
      toast.success('تم إضافة الرد بنجاح');
      await fetchReplies();
      return true;
    } catch (err) {
      console.error('Error adding reply:', err);
      toast.error('فشل في إضافة الرد');
      return false;
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('quote_replies')
        .delete()
        .eq('id', replyId)
        .eq('user_id', user.id);
      if (error) throw error;
      setReplies(prev => prev.filter(r => r.id !== replyId));
      setRepliesCount(prev => prev - 1);
      toast.success('تم حذف الرد');
      return true;
    } catch (err) {
      console.error('Error deleting reply:', err);
      toast.error('فشل في حذف الرد');
      return false;
    }
  };

  const updateReply = async (replyId: string, newText: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('quote_replies')
        .update({ reply_text: newText, updated_at: new Date().toISOString() })
        .eq('id', replyId)
        .eq('user_id', user.id);
      if (error) throw error;
      setReplies(prev => prev.map(r => r.id === replyId ? { ...r, reply_text: newText, updated_at: new Date().toISOString() } : r));
      toast.success('تم تحديث الرد');
      return true;
    } catch (err) {
      console.error('Error updating reply:', err);
      toast.error('فشل في تحديث الرد');
      return false;
    }
  };

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return { replies, loading, repliesCount, fetchReplies, addReply, deleteReply, updateReply };
};
