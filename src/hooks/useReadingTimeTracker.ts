import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

/**
 * Tracks actual reading time (in minutes) while the user is actively on the page.
 * Pauses when tab is hidden or window loses focus.
 * Periodically saves accumulated time to Supabase reading_history.
 */
export const useReadingTimeTracker = (bookId: string | undefined) => {
  const { user } = useAuth();
  const elapsedSecondsRef = useRef(0);
  const isActiveRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveTime = useCallback(async () => {
    if (!user || !bookId || elapsedSecondsRef.current < 1) return;

    const minutesToAdd = Math.floor(elapsedSecondsRef.current / 60);
    const remainderSeconds = elapsedSecondsRef.current % 60;

    if (minutesToAdd < 1) return;

    try {
      // Read current value then update (increment)
      const { data } = await supabase
        .from('reading_history')
        .select('reading_time_minutes')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle();

      if (data) {
        await supabase
          .from('reading_history')
          .update({
            reading_time_minutes: (data.reading_time_minutes || 0) + minutesToAdd,
          })
          .eq('user_id', user.id)
          .eq('book_id', bookId);
      }

      // Keep only the remainder seconds
      elapsedSecondsRef.current = remainderSeconds;
    } catch (err) {
      console.error('Error saving reading time:', err);
    }
  }, [user, bookId]);

  useEffect(() => {
    if (!bookId || !user) return;

    // Count seconds when active
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        elapsedSecondsRef.current += 1;
      }
    }, 1000);

    // Save every 2 minutes
    saveIntervalRef.current = setInterval(() => {
      saveTime();
    }, 120_000);

    const handleVisibility = () => {
      isActiveRef.current = document.visibilityState === 'visible';
      if (!isActiveRef.current) saveTime();
    };

    const handleBlur = () => {
      isActiveRef.current = false;
      saveTime();
    };
    const handleFocus = () => {
      isActiveRef.current = true;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      // Save remaining time on unmount
      saveTime();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [bookId, user, saveTime]);

  return { elapsedSeconds: elapsedSecondsRef };
};
