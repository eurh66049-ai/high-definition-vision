import { supabase, supabaseFunctions } from '@/integrations/supabase/client';

/**
 * Send a push notification to a user via OneSignal Edge Function
 * Call this after inserting a notification into the notifications table
 */
export const sendPushToUser = async (
  userId: string,
  title: string,
  message: string,
  targetUrl?: string,
  type?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabaseFunctions.functions.invoke('send-onesignal-push', {
      body: {
        user_id: userId,
        title,
        message,
        target_url: targetUrl || '',
        type: type || 'general',
      },
    });

    if (error) {
      console.error('[Push] Error sending push notification:', error);
      return false;
    }

    console.log('[Push] Notification sent:', data);
    return true;
  } catch (error) {
    console.error('[Push] Failed to send push notification:', error);
    return false;
  }
};

/**
 * Helper: Insert notification into DB AND send push in one call
 */
export const createNotificationWithPush = async (
  userId: string,
  title: string,
  message: string,
  options?: {
    type?: string;
    targetUrl?: string;
    bookTitle?: string;
    bookAuthor?: string;
    bookCategory?: string;
    bookSubmissionId?: string;
  }
): Promise<boolean> => {
  try {
    // 1. Insert notification into database
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type: options?.type || 'general',
      target_url: options?.targetUrl || null,
      book_title: options?.bookTitle || null,
      book_author: options?.bookAuthor || null,
      book_category: options?.bookCategory || null,
      book_submission_id: options?.bookSubmissionId || null,
    });

    if (dbError) {
      console.error('[Notification] DB insert error:', dbError);
      return false;
    }

    // 2. Send push notification via OneSignal
    await sendPushToUser(userId, title, message, options?.targetUrl, options?.type);

    return true;
  } catch (error) {
    console.error('[Notification] Failed:', error);
    return false;
  }
};
