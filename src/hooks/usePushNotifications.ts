 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/context/AuthContext';
 import { toast } from 'sonner';
 
// VAPID Public Key (base64url of raw 65-byte EC public key) - safe to expose in client code
const VAPID_PUBLIC_KEY = 'BARwIIyJ5Td6lxibyPXkXXllJ3R6kjVenB34xYUdNPfXOZnyJXF11t3Xftqv43GNR2SgbkF1rRotLqUOsJdR_rg';
 
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
   const padding = '='.repeat((4 - base64String.length % 4) % 4);
   const base64 = (base64String + padding)
     .replace(/-/g, '+')
     .replace(/_/g, '/');
   
   const rawData = window.atob(base64);
   const outputArray = new Uint8Array(rawData.length);
   
   for (let i = 0; i < rawData.length; ++i) {
     outputArray[i] = rawData.charCodeAt(i);
   }
  return outputArray.buffer as ArrayBuffer;
 }
 
 export const usePushNotifications = () => {
   const { user } = useAuth();
   const [isSupported, setIsSupported] = useState(false);
   const [isSubscribed, setIsSubscribed] = useState(false);
   const [permission, setPermission] = useState<NotificationPermission>('default');
   const [loading, setLoading] = useState(false);
 
   useEffect(() => {
     // Check if push notifications are supported
     const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
     setIsSupported(supported);
     
     if (supported) {
       setPermission(Notification.permission);
       checkSubscription();
     }
   }, [user]);
 
   const checkSubscription = async () => {
     if (!user) return;
     
     try {
    const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager.getSubscription();
        setIsSubscribed(!!subscription);
     } catch (error) {
       console.error('Error checking subscription:', error);
     }
   };
 
   const subscribe = useCallback(async () => {
     if (!user || !isSupported) return false;
     
     setLoading(true);
     
     try {
       // Request permission
       const permissionResult = await Notification.requestPermission();
       setPermission(permissionResult);
       
       if (permissionResult !== 'granted') {
         toast.error('لم يتم منح إذن الإشعارات');
         setLoading(false);
         return false;
       }
 
       // Get service worker registration
       const registration = await navigator.serviceWorker.ready;
       
       // Subscribe to push notifications
        const subscription = await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
 
       const subscriptionJson = subscription.toJSON();
       
       // Save subscription to database
       const { error } = await supabase
         .from('push_subscriptions')
         .upsert({
           user_id: user.id,
           endpoint: subscriptionJson.endpoint!,
           p256dh: subscriptionJson.keys!.p256dh,
           auth: subscriptionJson.keys!.auth,
           is_active: true,
           user_agent: navigator.userAgent
         }, {
           onConflict: 'endpoint'
         });
 
       if (error) {
         console.error('Error saving subscription:', error);
         toast.error('حدث خطأ أثناء حفظ الاشتراك');
         setLoading(false);
         return false;
       }
 
       setIsSubscribed(true);
       toast.success('تم تفعيل الإشعارات بنجاح! 🔔');
       setLoading(false);
       return true;
     } catch (error) {
       console.error('Error subscribing to push notifications:', error);
       toast.error('حدث خطأ أثناء تفعيل الإشعارات');
       setLoading(false);
       return false;
     }
   }, [user, isSupported]);
 
   const unsubscribe = useCallback(async () => {
     if (!user) return false;
     
     setLoading(true);
     
     try {
       const registration = await navigator.serviceWorker.ready;
       const subscription = await (registration as any).pushManager.getSubscription();
       
       if (subscription) {
         await subscription.unsubscribe();
         
         // Remove from database
         await supabase
           .from('push_subscriptions')
           .delete()
           .eq('endpoint', subscription.endpoint);
       }
       
       setIsSubscribed(false);
       toast.success('تم إيقاف الإشعارات');
       setLoading(false);
       return true;
     } catch (error) {
       console.error('Error unsubscribing:', error);
       toast.error('حدث خطأ أثناء إيقاف الإشعارات');
       setLoading(false);
       return false;
     }
   }, [user]);
 
   return {
     isSupported,
     isSubscribed,
     permission,
     loading,
     subscribe,
     unsubscribe
   };
 };