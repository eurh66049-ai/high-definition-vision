import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SiteUpdate {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  created_at: string;
  is_active: boolean;
}

export const useSiteUpdates = () => {
  const [updates, setUpdates] = useState<SiteUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const { user } = useAuth();

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('site_updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      setUpdates(data || []);

      // Check for unread updates
      if (user && data && data.length > 0) {
        const { data: readData, error: readError } = await supabase
          .from('site_update_reads')
          .select('update_id')
          .eq('user_id', user.id);

        if (!readError) {
          const readIds = new Set((readData || []).map(r => r.update_id));
          const hasUnreadUpdate = data.some(update => !readIds.has(update.id));
          setHasUnread(hasUnreadUpdate);
        }
      } else if (!user && data && data.length > 0) {
        // For non-logged in users, check localStorage
        const readIdsJson = localStorage.getItem('site_updates_read');
        const readIds = readIdsJson ? new Set(JSON.parse(readIdsJson)) : new Set();
        const hasUnreadUpdate = data.some(update => !readIds.has(update.id));
        setHasUnread(hasUnreadUpdate);
      }
    } catch (err) {
      console.error('Error fetching site updates:', err);
      setError('فشل في جلب التحديثات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (updateIds: string[]) => {
    if (updateIds.length === 0) return;

    if (user) {
      // Save to database for logged in users
      const inserts = updateIds.map(update_id => ({
        user_id: user.id,
        update_id,
      }));

      try {
        await supabase.from('site_update_reads').upsert(inserts, {
          onConflict: 'user_id,update_id',
        });
      } catch (error) {
        console.error('Error marking updates as read:', error);
      }
    } else {
      // Save to localStorage for non-logged in users
      const readIdsJson = localStorage.getItem('site_updates_read');
      const readIds = readIdsJson ? new Set(JSON.parse(readIdsJson)) : new Set();
      updateIds.forEach(id => readIds.add(id));
      localStorage.setItem('site_updates_read', JSON.stringify([...readIds]));
    }

    setHasUnread(false);
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    const updateIds = updates.map(u => u.id);
    await markAsRead(updateIds);
  }, [updates, markAsRead]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  return {
    updates,
    loading,
    error,
    hasUnread,
    refetch: fetchUpdates,
    markAsRead,
    markAllAsRead,
  };
};
