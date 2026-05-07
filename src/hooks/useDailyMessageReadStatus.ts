import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface DailyMessageReadStatus {
  hasUnreadMessage: boolean;
  markAsRead: () => Promise<void>;
  loading: boolean;
}

export const useDailyMessageReadStatus = (): DailyMessageReadStatus => {
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkReadStatus = useCallback(async () => {
    if (!user) {
      setHasUnreadMessage(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // الحصول على تاريخ اليوم
      const today = new Date().toISOString().split('T')[0];
      
      // التحقق من وجود رسالة يومية لليوم
      const { data: todayMessage } = await supabase
        .from('daily_messages')
        .select('id')
        .eq('date', today)
        .maybeSingle();
      
      if (!todayMessage) {
        setHasUnreadMessage(false);
        setLoading(false);
        return;
      }
      
      // التحقق من حالة القراءة
      const { data: readStatus } = await supabase
        .from('daily_message_reads')
        .select('id')
        .eq('user_id', user.id)
        .eq('message_date', today)
        .maybeSingle();
      
      setHasUnreadMessage(!readStatus);
    } catch (error) {
      console.error('Error checking daily message read status:', error);
      setHasUnreadMessage(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // إدراج سجل القراءة
      const { error } = await supabase
        .from('daily_message_reads')
        .upsert({
          user_id: user.id,
          message_date: today
        });

      if (error) {
        console.error('Error marking message as read:', error);
        return;
      }

      setHasUnreadMessage(false);
    } catch (error) {
      console.error('Error marking daily message as read:', error);
    }
  }, [user]);

  useEffect(() => {
    checkReadStatus();
  }, [checkReadStatus]);

  return {
    hasUnreadMessage,
    markAsRead,
    loading
  };
};