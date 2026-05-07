import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

type MessagesCacheEntry = {
  messages: Message[];
  fetchedAt: number;
};

// كاش داخل الذاكرة لمنع إعادة الجلب عند الرجوع بسرعة
const MESSAGES_STALE_MS = 15_000;
const messagesCache = new Map<string, MessagesCacheEntry>();

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  message_type?: string | null;
  audio_url?: string | null;
  audio_mime_type?: string | null;
  audio_duration_ms?: number | null;
  transcript?: string | null;
  sender_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cacheKey = conversationId ? `${conversationId}` : null;

  // تحميل سريع من الكاش عند توفره
  useEffect(() => {
    if (!cacheKey) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const cached = messagesCache.get(cacheKey);
    if (cached) {
      setMessages(cached.messages);
      setLoading(false);
    }
  }, [cacheKey]);

  const fetchMessages = useCallback(async (options?: { force?: boolean; silent?: boolean }) => {
    if (!conversationId || !userId) return;

    const key = `${conversationId}`;
    const cached = messagesCache.get(key);
    const isFresh = !!cached && Date.now() - cached.fetchedAt < MESSAGES_STALE_MS;
    if (!options?.force && isFresh) {
      return;
    }

    if (!options?.silent) {
      const hasData = (cached?.messages?.length ?? 0) > 0;
      setLoading(!hasData);
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const nextMessages = (data || []) as Message[];
      setMessages(nextMessages);
      messagesCache.set(`${conversationId}`, { messages: nextMessages, fetchedAt: Date.now() });

      // وضع علامة مقروء على الرسائل المستقبلة
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  // إرسال رسالة
  const sendMessage = useCallback(async (
    content: string,
    extras?: {
      message_type?: 'text' | 'audio';
      audio_url?: string | null;
      audio_mime_type?: string | null;
      audio_duration_ms?: number | null;
      transcript?: string | null;
    },
  ) => {
    if (!conversationId || !userId) return false;
    const isAudio = extras?.message_type === 'audio';
    if (!isAudio && !content.trim()) return false;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: userId,
      content: isAudio ? (content || '') : content.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      message_type: extras?.message_type || 'text',
      audio_url: extras?.audio_url ?? null,
      audio_mime_type: extras?.audio_mime_type ?? null,
      audio_duration_ms: extras?.audio_duration_ms ?? null,
      transcript: extras?.transcript ?? null,
      sender_profile: { username: 'أنت', avatar_url: null }
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: isAudio ? (content || '') : content.trim(),
          message_type: extras?.message_type || 'text',
          audio_url: extras?.audio_url ?? null,
          audio_mime_type: extras?.audio_mime_type ?? null,
          audio_duration_ms: extras?.audio_duration_ms ?? null,
          transcript: extras?.transcript ?? null,
        })
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // استبدال الرسالة المؤقتة بالحقيقية
      setMessages(prev => {
        const next = prev.map(m => m.id === tempId ? data : m);
        messagesCache.set(`${conversationId}`, { messages: next, fetchedAt: Date.now() });
        return next;
      });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      // إزالة الرسالة المؤقتة عند الخطأ
      setMessages(prev => {
        const next = prev.filter(m => m.id !== tempId);
        messagesCache.set(`${conversationId}`, { messages: next, fetchedAt: Date.now() });
        return next;
      });
      return false;
    } finally {
      setSending(false);
    }
  }, [conversationId, userId]);

  // وضع علامة مقروء
  const markAsRead = useCallback(async () => {
    if (!conversationId || !userId) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);
  }, [conversationId, userId]);

  // الاستماع للرسائل الجديدة
  useEffect(() => {
    if (!conversationId || !userId) return;

    // الجلب الأول: سيُتخطى تلقائياً إذا كان الكاش حديثاً
    fetchMessages();

    // إلغاء الاشتراك القديم
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // جلب الرسالة الجديدة مع بيانات المرسل
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender_profile:profiles!messages_sender_id_fkey(username, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages(prev => {
              // تجنب التكرار
              if (prev.some(m => m.id === newMessage.id)) return prev;
              const next = [...prev, newMessage];
              messagesCache.set(`${conversationId}`, { messages: next, fetchedAt: Date.now() });
              return next;
            });

            // وضع علامة مقروء إذا كانت الرسالة من الآخر
            if (newMessage.sender_id !== userId) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMessage.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // تحديث حالة القراءة في الوقت الفعلي
          setMessages(prev => {
            const next = prev.map(m => m.id === payload.new.id 
              ? { ...m, is_read: (payload.new as any).is_read } 
              : m
            );
            messagesCache.set(`${conversationId}`, { messages: next, fetchedAt: Date.now() });
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, userId, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    refetch: fetchMessages
  };
};
