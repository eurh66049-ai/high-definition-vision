import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MessageRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  responded_at: string | null;
  sender_profile?: {
    username: string;
    avatar_url: string | null;
  };
  receiver_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export const useMessageRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sentRequests, setSentRequests] = useState<MessageRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchRequests = useCallback(async (isInitial = false) => {
    if (!user) {
      setInitialLoading(false);
      return;
    }
    
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setLoading(true);
    }

    try {
      // طلبات مُرسلة
      const { data: sent, error: sentError } = await supabase
        .from('message_requests')
        .select(`
          *,
          receiver_profile:profiles!message_requests_receiver_id_fkey(username, avatar_url)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // طلبات مُستقبلة
      const { data: received, error: receivedError } = await supabase
        .from('message_requests')
        .select(`
          *,
          sender_profile:profiles!message_requests_sender_id_fkey(username, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      setSentRequests((sent || []) as MessageRequest[]);
      setReceivedRequests((received || []) as MessageRequest[]);
    } catch (error) {
      console.error('Error fetching message requests:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [user]);

  // إرسال طلب مراسلة
  const sendRequest = useCallback(async (receiverId: string, message?: string) => {
    if (!user) {
      toast({
        title: 'يجب تسجيل الدخول',
        description: 'سجل دخولك لإرسال طلب مراسلة',
        variant: 'destructive'
      });
      return false;
    }

    if (user.id === receiverId) {
      toast({
        title: 'لا يمكنك مراسلة نفسك',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('message_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message: message || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'طلب موجود بالفعل',
            description: 'لديك طلب مراسلة مُرسل لهذا المستخدم',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return false;
      }

      toast({
        title: 'تم إرسال الطلب',
        description: 'سيصل إشعار للمستخدم بطلبك'
      });

      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error sending message request:', error);
      toast({
        title: 'حدث خطأ',
        description: 'فشل إرسال طلب المراسلة',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, toast, fetchRequests]);

  // الرد على طلب (قبول/رفض)
  const respondToRequest = useCallback(async (requestId: string, accept: boolean) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_requests')
        .update({
          status: accept ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (error) throw error;

      toast({
        title: accept ? 'تم قبول الطلب' : 'تم رفض الطلب',
        description: accept ? 'يمكنكم الآن تبادل الرسائل' : 'تم رفض طلب المراسلة'
      });

      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        title: 'حدث خطأ',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, toast, fetchRequests]);

  // إلغاء طلب المراسلة المُرسل
  const cancelRequest = useCallback(async (requestId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_requests')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: 'تم إلغاء الطلب',
        description: 'تم إلغاء طلب المراسلة بنجاح'
      });

      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error canceling request:', error);
      toast({
        title: 'حدث خطأ',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, toast, fetchRequests]);

  // التحقق من حالة الطلب مع مستخدم معين
  const getRequestStatus = useCallback((targetUserId: string) => {
    const sent = sentRequests.find(r => r.receiver_id === targetUserId);
    const received = receivedRequests.find(r => r.sender_id === targetUserId);

    if (sent) return { type: 'sent' as const, request: sent };
    if (received) return { type: 'received' as const, request: received };
    return null;
  }, [sentRequests, receivedRequests]);

  // الاستماع للتحديثات الفورية
  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }

    fetchRequests(true);

    const channelId = `message_requests_${user.id}_${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
          filter: `sender_id=eq.${user.id}`
        },
        () => fetchRequests()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRequests]);

  return {
    sentRequests,
    receivedRequests,
    pendingReceived: receivedRequests.filter(r => r.status === 'pending'),
    loading,
    initialLoading,
    sendRequest,
    respondToRequest,
    cancelRequest,
    getRequestStatus,
    refetch: fetchRequests
  };
};
