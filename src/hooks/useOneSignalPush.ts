import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';
const ONESIGNAL_SUBSCRIPTION_ENDPOINT = 'onesignal';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

const PUSH_SUBSCRIBED_KEY = 'onesignal_push_subscribed';

const getStoredSubscription = (): boolean => {
  try {
    return localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true';
  } catch {
    return false;
  }
};

const storeSubscriptionLocal = (subscribed: boolean) => {
  try {
    localStorage.setItem(PUSH_SUBSCRIBED_KEY, String(subscribed));
  } catch {
    // ignore
  }
};

// Save subscription state to Supabase
const saveSubscriptionToSupabase = async (userId: string, subscribed: boolean) => {
  try {
    const { data: existing, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', ONESIGNAL_SUBSCRIPTION_ENDPOINT)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (existing) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: subscribed, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else if (subscribed) {
      await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          is_active: true,
          endpoint: ONESIGNAL_SUBSCRIPTION_ENDPOINT,
          p256dh: ONESIGNAL_SUBSCRIPTION_ENDPOINT,
          auth: ONESIGNAL_SUBSCRIPTION_ENDPOINT,
          user_agent: navigator.userAgent || 'unknown',
        });
    }
  } catch (error) {
    console.error('[Push] Failed to save to Supabase:', error);
  }
};

// Load subscription state from Supabase
const loadSubscriptionFromSupabase = async (userId: string): Promise<boolean | null> => {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('is_active')
      .eq('user_id', userId)
      .eq('endpoint', ONESIGNAL_SUBSCRIPTION_ENDPOINT)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data ? !!data.is_active : null;
  } catch {
    return null;
  }
};

export const useOneSignalPush = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(getStoredSubscription);
  const [permission, setPermission] = useState<NotificationPermission>(() => 
    'Notification' in window ? Notification.permission : 'default'
  );
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const updateSubscriptionState = useCallback((subscribed: boolean) => {
    setIsSubscribed(subscribed);
    storeSubscriptionLocal(subscribed);
    if (user) {
      saveSubscriptionToSupabase(user.id, subscribed);
    }
  }, [user]);

  const syncSubscriptionFromOneSignal = useCallback(async (oneSignal = window.OneSignal, persist = true) => {
    try {
      const currentState = !!oneSignal?.User?.PushSubscription?.optedIn;
      setIsSubscribed(currentState);
      storeSubscriptionLocal(currentState);

      if (persist && user) {
        await saveSubscriptionToSupabase(user.id, currentState);
      }

      return currentState;
    } catch (error) {
      console.error('[OneSignal] Failed to sync subscription state:', error);
      return null;
    }
  }, [user]);

  // Load state from Supabase on mount when user is available
  useEffect(() => {
    if (!user) return;

    loadSubscriptionFromSupabase(user.id).then((dbState) => {
      if (dbState !== null) {
        setIsSubscribed(dbState);
        storeSubscriptionLocal(dbState);
      }
    });
  }, [user]);

  const checkBrowserPermission = useCallback(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') {
      console.warn('[OneSignal] App ID not configured');
      return;
    }

    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    if (!supported) return;

    checkBrowserPermission();

    if (!window.OneSignal && !document.querySelector('script[src*="OneSignalSDK"]')) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/push/onesignal/' },
          serviceWorkerPath: '/push/onesignal/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
        });

        const perm = OneSignal.Notifications.permission;
        setPermission(perm ? 'granted' : Notification.permission);

        await syncSubscriptionFromOneSignal(OneSignal, false);
        setInitialized(true);

        OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
          const newState = !!event.current.optedIn;
          setIsSubscribed(newState);
          storeSubscriptionLocal(newState);
          if (user) {
            saveSubscriptionToSupabase(user.id, newState);
          }
          checkBrowserPermission();
        });

        OneSignal.Notifications.addEventListener('permissionChange', (perm: boolean) => {
          setPermission(perm ? 'granted' : 'denied');
        });

        console.log('[OneSignal] Initialized');
      } catch (error) {
        console.error('[OneSignal] Init error:', error);
        checkBrowserPermission();
      }
    });
  }, [checkBrowserPermission, syncSubscriptionFromOneSignal]);

  useEffect(() => {
    if (!initialized || !window.OneSignal) return;

    const syncUserState = async () => {
      try {
        if (user) {
          await window.OneSignal.login(user.id);
          console.log('[OneSignal] User logged in:', user.id);
          await syncSubscriptionFromOneSignal(window.OneSignal, true);
        } else {
          await window.OneSignal.logout();
          await syncSubscriptionFromOneSignal(window.OneSignal, false);
        }
      } catch (error) {
        console.error('[OneSignal] User sync error:', error);
      }
    };

    void syncUserState();
  }, [user, initialized, syncSubscriptionFromOneSignal]);

  // Periodically sync subscription state
  useEffect(() => {
    if (!initialized || !window.OneSignal) return;

    const syncState = () => {
      void syncSubscriptionFromOneSignal(window.OneSignal, false);
    };

    const intervals = Array.from({ length: 6 }, (_, i) =>
      setTimeout(syncState, (i + 1) * 5000)
    );

    return () => intervals.forEach(clearTimeout);
  }, [initialized]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !initialized || !window.OneSignal) return false;
    setLoading(true);

    try {
      await window.OneSignal.Notifications.requestPermission();
      const perm = window.OneSignal.Notifications.permission;
      setPermission(perm ? 'granted' : 'denied');

      if (perm) {
        if (user) {
          await window.OneSignal.login(user.id);
        }

        await window.OneSignal.User.PushSubscription.optIn();
        await syncSubscriptionFromOneSignal(window.OneSignal, true);
        
        toast.success('تم تفعيل الإشعارات بنجاح! 🔔');
        setLoading(false);
        return true;
      } else {
        toast.error('لم يتم منح إذن الإشعارات');
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('[OneSignal] Subscribe error:', error);
      toast.error('حدث خطأ أثناء تفعيل الإشعارات');
      setLoading(false);
      return false;
    }
  }, [isSupported, initialized, user, updateSubscriptionState]);

  const unsubscribe = useCallback(async () => {
    if (!initialized || !window.OneSignal) return false;
    setLoading(true);

    try {
      await window.OneSignal.User.PushSubscription.optOut();
      await syncSubscriptionFromOneSignal(window.OneSignal, true);
      toast.success('تم إيقاف الإشعارات');
      setLoading(false);
      return true;
    } catch (error) {
      console.error('[OneSignal] Unsubscribe error:', error);
      toast.error('حدث خطأ أثناء إيقاف الإشعارات');
      setLoading(false);
      return false;
    }
  }, [initialized, syncSubscriptionFromOneSignal]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    initialized,
  };
};
