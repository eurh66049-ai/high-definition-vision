import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface BookDislikesData {
  dislikesCount: number;
  isDisliked: boolean;
}

export const useBookDislikes = (bookId: string) => {
  const { user } = useAuth();
  const [dislikesData, setDislikesData] = useState<BookDislikesData>({
    dislikesCount: 0,
    isDisliked: false
  });
  const [loading, setLoading] = useState(true);

  const fetchDislikesData = async () => {
    try {
      setLoading(true);
      
      // جلب عدد عدم الإعجابات
      const { data: dislikesCount, error: countError } = await supabase
        .rpc('get_book_dislikes_count', { p_book_id: bookId });

      if (countError) {
        console.error('خطأ في جلب عدد عدم الإعجابات:', countError);
        return;
      }

      // التحقق من عدم إعجاب المستخدم الحالي
      let isDisliked = false;
      if (user) {
        const { data: userDislike, error: dislikeError } = await supabase
          .rpc('check_user_book_dislike', { 
            p_book_id: bookId, 
            p_user_id: user.id 
          });

        if (dislikeError) {
          console.error('خطأ في التحقق من عدم إعجاب المستخدم:', dislikeError);
        } else {
          isDisliked = userDislike || false;
        }
      }

      setDislikesData({
        dislikesCount: dislikesCount || 0,
        isDisliked
      });
    } catch (error) {
      console.error('خطأ في جلب بيانات عدم الإعجابات:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDislike = async () => {
    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    try {
      const { data: newDislikeStatus, error } = await supabase
        .rpc('toggle_book_dislike', { p_book_id: bookId });

      if (error) {
        throw error;
      }

      // تحديث الحالة المحلية
      setDislikesData(prev => ({
        dislikesCount: newDislikeStatus ? prev.dislikesCount + 1 : prev.dislikesCount - 1,
        isDisliked: newDislikeStatus
      }));

      return newDislikeStatus;
    } catch (error) {
      console.error('خطأ في تبديل عدم الإعجاب:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (bookId) {
      fetchDislikesData();
    }
  }, [bookId, user]);

  return {
    dislikesCount: dislikesData.dislikesCount,
    isDisliked: dislikesData.isDisliked,
    loading,
    toggleDislike,
    refetch: fetchDislikesData
  };
};
