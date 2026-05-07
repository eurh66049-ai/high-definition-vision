import { useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

const AI_NOTIF_LAST_CHECK_KEY_PREFIX = 'ai_smart_notif_last_check_v2';
const CHECK_INTERVAL_HOURS = 12;
const LOGIN_CHECK_DELAY_MS = 30000;

const getLastCheckKey = (userId: string) => `${AI_NOTIF_LAST_CHECK_KEY_PREFIX}:${userId}`;

export const useAISmartNotifications = () => {
  const { user } = useAuth();
  const { refreshNotifications } = useNotification();
  const scheduledUserId = useRef<string | null>(null);

  const triggerAINotification = useCallback(async () => {
    if (!user) return;

    const storageKey = getLastCheckKey(user.id);

    // التحقق من آخر مرة تم فيها الفحص
    const lastCheck = localStorage.getItem(storageKey);
    if (lastCheck) {
      const parsedLastCheck = Number.parseInt(lastCheck, 10);

      if (!Number.isNaN(parsedLastCheck)) {
        const hoursSince = (Date.now() - parsedLastCheck) / (1000 * 60 * 60);
        if (hoursSince < CHECK_INTERVAL_HOURS) return;
      }
    }

    try {
      const { data, error } = await supabaseFunctions.functions.invoke('ai-smart-notifications', {
        body: { user_id: user.id },
      });

      if (error) {
        console.error('خطأ في إشعارات الذكاء الاصطناعي:', error);
      } else {
        if (data?.success) {
          localStorage.setItem(storageKey, Date.now().toString());
        }

        if (data?.success && !data?.skipped) {
          refreshNotifications();
        }

        console.log('📬 AI notification result:', data);
      }
    } catch (err) {
      console.error('خطأ غير متوقع:', err);
    }
  }, [refreshNotifications, user]);

  useEffect(() => {
    if (!user) {
      scheduledUserId.current = null;
      return;
    }

    if (scheduledUserId.current === user.id) return;
    scheduledUserId.current = user.id;

    // تأخير 30 ثانية بعد تسجيل الدخول لعدم إثقال الصفحة
    const timer = window.setTimeout(() => {
      void triggerAINotification();
    }, LOGIN_CHECK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [user, triggerAINotification]);
};
