import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ReviewLikesData {
  likesCount: number;
  isLiked: boolean;
}

export const useReviewLikes = (reviewId: string) => {
  const { user } = useAuth();
  const [likesData, setLikesData] = useState<ReviewLikesData>({
    likesCount: 0,
    isLiked: false
  });
  const [loading, setLoading] = useState(true);

  const fetchLikesData = async () => {
    try {
      setLoading(true);
      
      // جلب عدد الإعجابات للتقييم
      const { count, error: countError } = await supabase
        .from('review_likes')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', reviewId);

      if (countError) {
        console.error('خطأ في جلب عدد الإعجابات:', countError);
        return;
      }

      // التحقق من إعجاب المستخدم الحالي
      let isLiked = false;
      if (user) {
        const { data: userLike, error: likeError } = await supabase
          .from('review_likes')
          .select('id')
          .eq('review_id', reviewId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likeError) {
          console.error('خطأ في التحقق من إعجاب المستخدم:', likeError);
        } else {
          isLiked = !!userLike;
        }
      }

      setLikesData({
        likesCount: count || 0,
        isLiked
      });
    } catch (error) {
      console.error('خطأ في جلب بيانات الإعجابات:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    try {
      const { data: existingLike } = await supabase
        .from('review_likes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

      let newLikeStatus = false;
      
      if (existingLike) {
        // إزالة الإعجاب
        const { error } = await supabase
          .from('review_likes')
          .delete()
          .eq('id', existingLike.id);
        
        if (error) throw error;
        newLikeStatus = false;
      } else {
        // إضافة إعجاب جديد
        const { error } = await supabase
          .from('review_likes')
          .insert({
            review_id: reviewId,
            user_id: user.id
          });
        
        if (error) throw error;
        newLikeStatus = true;
      }

      // تحديث الحالة المحلية
      setLikesData(prev => ({
        likesCount: newLikeStatus ? prev.likesCount + 1 : prev.likesCount - 1,
        isLiked: newLikeStatus
      }));

      return newLikeStatus;
    } catch (error) {
      console.error('خطأ في تبديل الإعجاب:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (reviewId) {
      fetchLikesData();
    }
  }, [reviewId, user]);

  return {
    likesCount: likesData.likesCount,
    isLiked: likesData.isLiked,
    loading,
    toggleLike,
    refetch: fetchLikesData
  };
};