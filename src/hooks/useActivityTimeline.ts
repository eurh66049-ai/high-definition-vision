import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  target_id: string | null;
  target_title: string | null;
  target_image_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  // joined from profiles
  username: string | null;
  avatar_url: string | null;
}

export const useActivityTimeline = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchActivities = useCallback(async (pageNum: number, append = false) => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      if (pageNum === 0) setLoading(true);

      // Get IDs of users I follow
      const { data: followingData } = await supabase
        .from('user_followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];

      if (followingIds.length === 0) {
        setActivities([]);
        setLoading(false);
        setHasMore(false);
        return;
      }

      // Get activities from followed users
      const { data: activitiesData, error } = await supabase
        .from('user_activities')
        .select('*')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching activities:', error);
        setLoading(false);
        return;
      }

      if (!activitiesData || activitiesData.length === 0) {
        setHasMore(false);
        if (!append) setActivities([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs to fetch profiles
      const userIds = [...new Set(activitiesData.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enriched: Activity[] = activitiesData.map(a => ({
        ...a,
        metadata: (a.metadata as Record<string, any>) || {},
        username: profileMap.get(a.user_id)?.username || null,
        avatar_url: profileMap.get(a.user_id)?.avatar_url || null,
      }));

      setHasMore(activitiesData.length === PAGE_SIZE);

      if (append) {
        setActivities(prev => [...prev, ...enriched]);
      } else {
        setActivities(enriched);
      }
    } catch (err) {
      console.error('Error in activity timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setPage(0);
    fetchActivities(0);
  }, [fetchActivities]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  const refresh = () => {
    setPage(0);
    setHasMore(true);
    fetchActivities(0);
  };

  return { activities, loading, hasMore, loadMore, refresh };
};
