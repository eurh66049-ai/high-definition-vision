import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// تحديث presence/last_seen في Supabase بشكل دوري + عند إخفاء التبويب.
// يعتمد على الدالة الموجودة في قاعدة البيانات: public.update_user_presence.
export function useUserPresenceTracker() {
  const { user } = useAuth();

  // Session id ثابت لكل تبويب
  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return 'server';
    const key = 'presence_session_id';
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, id);
    return id;
  }, []);

  const lastPingAtRef = useRef<number>(0);
  const lastUserIdRef = useRef<string | null>(null);

  const ping = async (isOnline: boolean) => {
    if (!user?.id) return;

    // منع السبام
    const now = Date.now();
    if (now - lastPingAtRef.current < 4_000) return;
    lastPingAtRef.current = now;

    try {
      await supabase.rpc('update_user_presence', {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_is_online: isOnline,
      });
    } catch (e) {
      console.error('presence ping failed', e);
    }
  };

  useEffect(() => {
    lastUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // أول ping عند الدخول
    void ping(true);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') void ping(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void ping(true);
      } else {
        // عند الخروج من التبويب/إخفاء الصفحة نسجل لحظة الخروج بدقة
        void ping(false);
      }
    };

    // pagehide أدق من beforeunload على الموبايل
    const handlePageHide = () => {
      void ping(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    // Heartbeat أثناء التواجد في الصفحة
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void ping(true);
      }
    }, 25_000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);

      window.clearInterval(intervalId);

      // محاولة أخيرة لتسجيل الخروج (قد لا تنجح دائمًا)
      void ping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, sessionId]);
}
