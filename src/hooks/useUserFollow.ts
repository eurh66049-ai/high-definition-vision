import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useUserFollow = (targetUserId: string | null, targetUsername?: string, currentUserId?: string) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadInitialData = async () => {
      if (targetUserId) {
        setInitialLoading(true);
        await Promise.all([fetchFollowersCount(), checkFollowStatus()]);
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, [targetUserId, currentUserId]);

  const checkFollowStatus = async (): Promise<void> => {
    if (!targetUserId || !currentUserId) {
      setIsFollowing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_followers')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return;
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowersCount = async (): Promise<void> => {
    if (!targetUserId) {
      setFollowersCount(0);
      return;
    }

    try {
      // جلب عدد المتابعين من جدول profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', targetUserId)
        .single();

      if (!profileError && profileData?.followers_count !== null) {
        setFollowersCount(profileData.followers_count || 0);
        return;
      }

      // إذا لم يكن هناك عدد محفوظ، نحسب مباشرة
      const { count, error: countError } = await supabase
        .from('user_followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      if (countError) {
        console.error('Error fetching followers count:', countError);
        setFollowersCount(0);
        return;
      }

      setFollowersCount(count || 0);
    } catch (error) {
      console.error('Error fetching followers count:', error);
      setFollowersCount(0);
    }
  };

  const toggleFollow = async () => {
    if (!targetUserId) {
      console.log('No target user ID provided');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        localStorage.setItem('auth_redirect_path', window.location.pathname);
        toast({
          title: "يجب تسجيل الدخول",
          description: "يرجى تسجيل الدخول أولاً لمتابعة المستخدمين",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // التحقق من أن المستخدم لا يحاول متابعة نفسه
      if (user.id === targetUserId) {
        toast({
          title: "خطأ",
          description: "لا يمكنك متابعة نفسك",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .rpc('toggle_user_follow', {
          p_following_id: targetUserId
        });

      if (error) {
        console.error('Error toggling follow:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث المتابعة: " + error.message,
          variant: "destructive",
        });
        return;
      }

      const newFollowingStatus = data;
      setIsFollowing(newFollowingStatus);
      
      setFollowersCount(prev => {
        return newFollowingStatus ? prev + 1 : Math.max(0, prev - 1);
      });

      const displayName = targetUsername || 'المستخدم';
      toast({
        title: newFollowingStatus ? `تم متابعة ${displayName}!` : `تم إلغاء متابعة ${displayName}`,
        description: newFollowingStatus 
          ? `تم إضافة ${displayName} إلى قائمة متابعيك` 
          : `تم إزالة ${displayName} من قائمة متابعيك`,
        variant: "success",
      });

    } catch (error) {
      console.error('Unexpected error in toggleFollow:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // التحقق إذا كان المستخدم يشاهد ملفه الشخصي
  const isOwnProfile = currentUserId === targetUserId;
  const shouldShowFollowButton = !isOwnProfile && !!targetUserId;

  return {
    isFollowing,
    loading,
    initialLoading,
    followersCount,
    toggleFollow,
    shouldShowFollowButton
  };
};
