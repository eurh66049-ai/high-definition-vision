import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuthorSocialLinks {
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
}

export const useAuthorFollow = (authorId: string | null, authorName?: string, currentUserId?: string) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [authorSocialLinks, setAuthorSocialLinks] = useState<AuthorSocialLinks>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadInitialData = async () => {
      if (authorId) {
        setInitialLoading(true);
        console.log('useAuthorFollow - authorId:', authorId);
        // تحميل جميع البيانات بالتوازي
        await Promise.all([
          fetchFollowersCount(),
          checkFollowStatus(),
          fetchAuthorSocialLinks()
        ]);
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, [authorId]);

  const checkFollowStatus = async (): Promise<void> => {
    if (!authorId) return;

    try {
      console.log('Checking follow status for author:', authorId);
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (!user) {
        console.log('User not authenticated - setting follow status to false');
        setIsFollowing(false);
        return;
      }

      const { data, error } = await supabase
        .from('author_followers')
        .select('id')
        .eq('user_id', user.id)
        .eq('author_id', authorId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return;
      }

      // إذا تم العثور على سجل، فالمستخدم يتابع المؤلف
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowersCount = async (): Promise<void> => {
    if (!authorId) {
      setFollowersCount(0);
      return;
    }

    try {
      // أولاً نحاول جلب عدد المتابعين من جدول authors
      const { data: authorData, error: authorError } = await supabase
        .from('authors')
        .select('followers_count')
        .eq('id', authorId)
        .single();

      if (!authorError && authorData?.followers_count !== null) {
        setFollowersCount(authorData.followers_count || 0);
        return;
      }

      // إذا لم يكن المستخدم في جدول authors، نحسب المتابعين مباشرة من author_followers
      const { count, error: countError } = await supabase
        .from('author_followers')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', authorId);

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

  const fetchAuthorSocialLinks = async (): Promise<void> => {
    if (!authorId) {
      setAuthorSocialLinks({});
      return;
    }

    try {
      // أولاً نحاول البحث عن المؤلف في جدول authors للحصول على user_id
      const { data: authorData, error: authorError } = await supabase
        .from('authors')
        .select('user_id, social_links')
        .eq('id', authorId)
        .single();

      if (authorError && authorError.code !== 'PGRST116') {
        console.error('Error fetching author:', authorError);
        return;
      }

      // إذا كان للمؤلف user_id، نجلب روابطه من جدول profiles
      if (authorData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('social_instagram, social_twitter, social_facebook, social_whatsapp, social_youtube, social_linkedin, social_tiktok')
          .eq('id', authorData.user_id)
          .single();

        if (!profileError && profileData) {
          setAuthorSocialLinks({
            instagram: profileData.social_instagram,
            twitter: profileData.social_twitter,
            facebook: profileData.social_facebook,
            whatsapp: profileData.social_whatsapp,
            youtube: profileData.social_youtube,
            linkedin: profileData.social_linkedin,
            tiktok: profileData.social_tiktok
          });
          return;
        }
      }

      // إذا لم يكن هناك user_id أو لم نجد بيانات، نستخدم social_links من جدول authors
      if (authorData?.social_links && typeof authorData.social_links === 'object') {
        const links = authorData.social_links as Record<string, string>;
        setAuthorSocialLinks({
          instagram: links.instagram || null,
          twitter: links.twitter || null,
          facebook: links.facebook || null,
          whatsapp: links.whatsapp || null,
          youtube: links.youtube || null,
          linkedin: links.linkedin || null,
          tiktok: links.tiktok || null
        });
      }
    } catch (error) {
      console.error('Error fetching author social links:', error);
      setAuthorSocialLinks({});
    }
  };

  const toggleFollow = async () => {
    if (!authorId) {
      console.log('No author ID provided');
      return;
    }

    try {
      console.log('Starting toggle follow for author:', authorId);
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User for toggle follow:', user);
      
      if (!user) {
        console.log('User not authenticated, redirecting to auth page');
        // حفظ المسار الحالي للعودة إليه بعد تسجيل الدخول
        localStorage.setItem('auth_redirect_path', window.location.pathname);
        toast({
          title: "يجب تسجيل الدخول",
          description: "يرجى تسجيل الدخول أولاً لمتابعة المؤلفين",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      setLoading(true);
      console.log('Calling toggle_author_follow RPC...');

      const { data, error } = await supabase
        .rpc('toggle_author_follow', {
          p_author_id: authorId
        });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('Error toggling follow:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث المتابعة: " + error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Toggle follow successful, new status:', data);
      const newFollowingStatus = data;
      setIsFollowing(newFollowingStatus);
      
      // تحديث عدد المتابعين
      setFollowersCount(prev => {
        const newCount = newFollowingStatus ? prev + 1 : prev - 1;
        console.log('Updating followers count from', prev, 'to', newCount);
        return newCount;
      });

      console.log('Showing success toast');
      const authorDisplayName = authorName || 'المؤلف';
      toast({
        title: newFollowingStatus ? `تم متابعة ${authorDisplayName}!` : `تم إلغاء متابعة ${authorDisplayName}`,
        description: newFollowingStatus 
          ? `تم إضافة ${authorDisplayName} إلى قائمة متابعيك` 
          : `تم إزالة ${authorDisplayName} من قائمة متابعيك`,
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
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  // التحقق من عدة حالات لمعرفة إذا كان المستخدم هو المؤلف نفسه:
  // 1. إذا كان المستخدم الحالي هو نفس المؤلف في جدول authors
  // 2. إذا كان المستخدم له كتب بنفس اسم المؤلف
  const [isOwnAuthor, setIsOwnAuthor] = useState(false);
  
  useEffect(() => {
    const checkIfOwnAuthor = async () => {
      if (!currentUserId || !authorId) {
        setIsOwnAuthor(false);
        return;
      }
      
      try {
        // التحقق من جدول authors أولاً
        const { data: authorRecord } = await supabase
          .from('authors')
          .select('user_id')
          .eq('id', authorId)
          .single();
          
        if (authorRecord?.user_id === currentUserId) {
          setIsOwnAuthor(true);
          return;
        }
        
        // التحقق من الكتب إذا كان المؤلف له نفس الاسم
        if (authorName) {
          const { data: userBooks } = await supabase
            .from('book_submissions')
            .select('author')
            .eq('user_id', currentUserId)
            .eq('author', authorName)
            .limit(1);
            
          setIsOwnAuthor(userBooks && userBooks.length > 0);
        } else {
          setIsOwnAuthor(false);
        }
      } catch (error) {
        console.error('Error checking if own author:', error);
        setIsOwnAuthor(false);
      }
    };
    
    checkIfOwnAuthor();
  }, [currentUserId, authorId, authorName]);
  
  const shouldShowFollowButton = !isOwnAuthor;

  return {
    isFollowing,
    loading,
    initialLoading,
    followersCount,
    toggleFollow,
    shouldShowFollowButton,
    authorSocialLinks
  };
};