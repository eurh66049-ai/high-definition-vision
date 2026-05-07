import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface MessageRequestData {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  is_sender: boolean;
}

interface InteractionStatus {
  is_following: boolean;
  followers_count: number;
  message_request: MessageRequestData | null;
}

export const useUserInteractionStatus = (targetUserId: string | null) => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<InteractionStatus>({
    is_following: false,
    followers_count: 0,
    message_request: null
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    // انتظر حتى ينتهي تحميل Auth
    if (authLoading) return;
    
    if (!targetUserId) {
      setStatus({ is_following: false, followers_count: 0, message_request: null });
      setLoading(false);
      return;
    }

    // إذا لم يكن هناك مستخدم مسجل، جلب فقط عدد المتابعين
    if (!user) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('followers_count')
          .eq('id', targetUserId)
          .single();

        setStatus({
          is_following: false,
          followers_count: profileData?.followers_count || 0,
          message_request: null
        });
      } catch (error) {
        console.error('Error fetching public status:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // جلب كل البيانات عبر RPC واحد
    try {
      const { data, error } = await supabase.rpc('get_user_interaction_status', {
        p_current_user_id: user.id,
        p_target_user_id: targetUserId
      });

      if (error) {
        console.error('Error fetching interaction status:', error);
        // fallback للطريقة القديمة
        await fetchStatusFallback();
        return;
      }

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const result = data as Record<string, unknown>;
        setStatus({
          is_following: (result.is_following as boolean) || false,
          followers_count: (result.followers_count as number) || 0,
          message_request: (result.message_request as MessageRequestData) || null
        });
      }
    } catch (error) {
      console.error('Error in useUserInteractionStatus:', error);
      await fetchStatusFallback();
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user, authLoading]);

  // Fallback في حال فشل الـ RPC
  const fetchStatusFallback = async () => {
    if (!targetUserId) return;

    try {
      // جلب عدد المتابعين
      const { data: profileData } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', targetUserId)
        .single();

      let isFollowing = false;
      let messageRequest: MessageRequestData | null = null;

      if (user) {
        // التحقق من المتابعة
        const { data: followData } = await supabase
          .from('user_followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        isFollowing = !!followData;

        // جلب طلب المراسلة
        const { data: requestData } = await supabase
          .from('message_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (requestData) {
          messageRequest = {
            ...requestData,
            status: requestData.status as 'pending' | 'accepted' | 'rejected',
            is_sender: requestData.sender_id === user.id
          };
        }
      }

      setStatus({
        is_following: isFollowing,
        followers_count: profileData?.followers_count || 0,
        message_request: messageRequest
      });
    } catch (error) {
      console.error('Error in fallback fetch:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // الاستماع للتحديثات الفورية
  useEffect(() => {
    if (!user || !targetUserId) return;

    const channel = supabase
      .channel(`interaction_${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
          filter: `sender_id=eq.${user.id}`
        },
        () => fetchStatus()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        () => fetchStatus()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_followers',
          filter: `following_id=eq.${targetUserId}`
        },
        () => fetchStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, targetUserId, fetchStatus]);

  return {
    isFollowing: status.is_following,
    followersCount: status.followers_count,
    messageRequest: status.message_request,
    loading,
    refetch: fetchStatus
  };
};
