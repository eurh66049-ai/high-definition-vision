import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BanStatus {
  isBanned: boolean;
  banType?: 'temporary' | 'permanent';
  reason?: string;
  expiresAt?: string;
}

export const useBanStatus = (userId?: string) => {
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkBanStatus = async (id?: string) => {
    const checkId = id || userId;
    if (!checkId) {
      setBanStatus(null);
      return;
    }

    setLoading(true);
    try {
      // التحقق مباشرة من جدول banned_users
      const { data, error } = await supabase
        .from('banned_users')
        .select('ban_type, reason, expires_at, is_active')
        .eq('user_id', checkId)
        .eq('is_active', true)
        .order('banned_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.error('Error checking ban status:', error);
        setBanStatus({ isBanned: false });
        return;
      }

      if (!data) {
        setBanStatus({ isBanned: false });
        return;
      }

      // التحقق من انتهاء الحظر المؤقت
      if (data.ban_type === 'temporary' && data.expires_at) {
        const now = new Date();
        const expiryDate = new Date(data.expires_at);
        
        if (now > expiryDate) {
          // انتهت مدة الحظر
          setBanStatus({ isBanned: false });
          return;
        }
      }

      setBanStatus({
        isBanned: true,
        banType: data.ban_type as 'temporary' | 'permanent',
        reason: data.reason,
        expiresAt: data.expires_at
      });
    } catch (error) {
      console.error('Error checking ban status:', error);
      setBanStatus({ isBanned: false });
    } finally {
      setLoading(false);
    }
  };

  const refreshBanStatus = () => {
    if (userId) {
      checkBanStatus(userId);
    }
  };

  useEffect(() => {
    if (userId) {
      checkBanStatus(userId);
    }
  }, [userId]);

  return {
    banStatus,
    loading,
    refreshBanStatus,
    checkBanStatus
  };
};