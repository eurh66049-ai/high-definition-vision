import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface BookLikesData {
  likesCount: number;
  isLiked: boolean;
}

export const useBookLikes = (bookId: string) => {
  const { user } = useAuth();
  const [likesData, setLikesData] = useState<BookLikesData>({
    likesCount: 0,
    isLiked: false
  });
  const [loading, setLoading] = useState(true);

  const fetchLikesData = async () => {
    try {
      setLoading(true);
      
      // جلب عدد الإعجابات
      const { data: likesCount, error: countError } = await supabase
        .rpc('get_book_likes_count', { p_book_id: bookId });

      if (countError) {
        console.error('خطأ في جلب عدد الإعجابات:', countError);
        return;
      }

      // التحقق من إعجاب المستخدم الحالي
      let isLiked = false;
      if (user) {
        const { data: userLike, error: likeError } = await supabase
          .rpc('check_user_book_like', { 
            p_book_id: bookId, 
            p_user_id: user.id 
          });

        if (likeError) {
          console.error('خطأ في التحقق من إعجاب المستخدم:', likeError);
        } else {
          isLiked = userLike || false;
        }
      }

      setLikesData({
        likesCount: likesCount || 0,
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
      const { data: newLikeStatus, error } = await supabase
        .rpc('toggle_book_like', { p_book_id: bookId });

      if (error) {
        throw error;
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
    if (bookId) {
      fetchLikesData();
    }
  }, [bookId, user]);

  return {
    likesCount: likesData.likesCount,
    isLiked: likesData.isLiked,
    loading,
    toggleLike,
    refetch: fetchLikesData
  };
};