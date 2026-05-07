import React, { useState, useEffect } from 'react';
import { UnifiedProfileLink } from '@/components/profile/UnifiedProfileLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageCircle, User, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AIBotBadge } from '@/components/icons/AIBotBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReviewLikeButton from './ReviewLikeButton';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  profiles: {
    email: string;
    username: string;
    avatar_url?: string;
    is_ai_bot?: boolean;
  };
}

interface BookReviewsProps {
  bookId: string;
  bookTitle?: string;
}

const BookReviews: React.FC<BookReviewsProps> = ({ bookId, bookTitle }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    console.log('BookReviews تم تحميل المكون مع:', {
      bookId,
      user: user,
      userLoggedIn: !!user
    });
    fetchReviews();
  }, [bookId, user]);

  const fetchReviews = async () => {
    try {
      console.log('جلب التقييمات للكتاب:', bookId);
      
      // استخدام الدالة المحدثة لجلب التقييمات مع الملفات الشخصية
      const { data, error } = await supabase
        .rpc('get_book_reviews_with_profiles', { p_book_id: bookId });

      console.log('نتيجة جلب التقييمات:', { data, error });

      if (error) {
        console.error('خطأ في جلب التقييمات:', error);
        toast.error(`خطأ في جلب التقييمات: ${error.message}`);
        return;
      }

      // تحويل البيانات إلى التنسيق المطلوب
      const formattedReviews = data?.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment || '',
        created_at: review.created_at,
        user_id: review.user_id,
        profiles: {
          email: review.user_email || 'مستخدم',
          username: review.username || 'مستخدم',
          avatar_url: review.avatar_url
        }
      })) || [];

      console.log('التقييمات المنسقة:', formattedReviews);

      // اجلب علامة is_ai_bot لكل المستخدمين
      const userIds = Array.from(new Set(formattedReviews.map(r => r.user_id)));
      if (userIds.length > 0) {
        const { data: botFlags } = await supabase
          .from('profiles')
          .select('id, is_ai_bot')
          .in('id', userIds);
        const botMap = new Map((botFlags ?? []).map((p: any) => [p.id, !!p.is_ai_bot]));
        formattedReviews.forEach(r => { r.profiles.is_ai_bot = botMap.get(r.user_id) ?? false; });
      }

      setReviews(formattedReviews);
      
      // التحقق إذا كان المستخدم قد قيّم الكتاب من قبل
      if (user) {
        const { data: hasReviewed, error: reviewError } = await supabase
          .rpc('has_user_reviewed', { 
            p_book_id: bookId, 
            p_user_id: user.id 
          });
        
        if (!reviewError) {
          setUserHasReviewed(!!hasReviewed);
        }
      }
    } catch (error) {
      console.error('خطأ في جلب التقييمات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة تقييم');
      return;
    }

    if (rating === 0) {
      toast.error('يرجى اختيار تقييم');
      return;
    }

    setSubmitting(true);

    try {
      console.log('حالة المستخدم عند إضافة التقييم:', {
        user: user,
        userId: user?.id,
        isLoggedIn: !!user
      });

      if (!user?.id) {
        console.error('المستخدم غير مسجل الدخول أو لا يحتوي على معرف');
        toast.error('يجب تسجيل الدخول أولاً');
        setSubmitting(false);
        return;
      }

      console.log('إضافة تقييم جديد:', {
        bookId,
        userId: user.id,
        rating,
        comment: comment.trim() || null
      });

      // استخدام الدالة المُعرَّفة في قاعدة البيانات لإضافة التقييم
      const { data, error } = await supabase
        .rpc('add_book_review', {
          p_book_id: bookId,
          p_user_id: user.id,
          p_rating: rating,
          p_comment: comment.trim() || null,
          p_recommend: null
        });

      console.log('نتيجة إضافة التقييم:', { data, error });

      if (error) {
        console.error('خطأ في إضافة التقييم:', error);
        toast.error(`حدث خطأ في إضافة التقييم: ${error.message}`);
        return;
      }

      toast.success('تم إضافة التقييم بنجاح');
      setRating(0);
      setComment('');
      setUserHasReviewed(true);
      
      // إعادة جلب التقييمات لعرض التحديثات
      setTimeout(() => {
        fetchReviews();
      }, 500);
      
    } catch (error) {
      console.error('خطأ في إضافة التقييم:', error);
      toast.error('حدث خطأ في إضافة التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  };

  const handleUpdateReview = async () => {
    if (!user || !editingReview) return;

    if (editRating === 0) {
      toast.error('يرجى اختيار تقييم');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('book_reviews')
        .update({
          rating: editRating,
          comment: editComment.trim() || null
        })
        .eq('id', editingReview)
        .eq('user_id', user.id);

      if (error) {
        console.error('خطأ في تحديث التقييم:', error);
        toast.error(`حدث خطأ في تحديث التقييم: ${error.message}`);
        return;
      }

      toast.success('تم تحديث التقييم بنجاح');
      setEditingReview(null);
      setEditRating(0);
      setEditComment('');
      fetchReviews();
    } catch (error) {
      console.error('خطأ في تحديث التقييم:', error);
      toast.error('حدث خطأ في تحديث التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) {
        console.error('خطأ في حذف التقييم:', error);
        toast.error(`حدث خطأ في حذف التقييم: ${error.message}`);
        return;
      }

      toast.success('تم حذف التقييم بنجاح');
      fetchReviews();
    } catch (error) {
      console.error('خطأ في حذف التقييم:', error);
      toast.error('حدث خطأ في حذف التقييم');
    }
  };

  const cancelEdit = () => {
    setEditingReview(null);
    setEditRating(0);
    setEditComment('');
  };

  // دالة لتنسيق الوقت النسبي بالعربية
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      const relativeTime = formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: ar 
      });
      
      // تخصيص النص ليكون أكثر وضوحاً بالعربية
      return relativeTime
        .replace('في حوالي', 'منذ حوالي')
        .replace('في', 'منذ')
        .replace('حوالي', '')
        .trim();
    } catch (error) {
      console.error('خطأ في تنسيق التاريخ:', error);
      return 'وقت غير معروف';
    }
  };

  // دالة للحصول على رابط صورة الملف الشخصي
  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return null;
    
    // إذا كان الرابط يبدأ بـ http، فهو رابط كامل
    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    
    // إنشاء رابط عام من Supabase Storage
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarUrl);
    
    return data?.publicUrl || null;
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-book-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">جاري تحميل التقييمات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-transparent shadow-none border-0">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-amiri flex items-center gap-2 text-foreground">
            <MessageCircle className="h-5 w-5" />
            التقييمات والمراجعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* إحصائيات التقييم - تظهر دائماً حتى بدون تقييمات */}
          <div className="mb-6 p-4 bg-card rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        reviews.length > 0 && star <= Math.round(averageRating)
                          ? 'text-red-500 fill-current'
                          : 'text-muted-foreground/40 fill-muted-foreground/20'
                      }`}
                    />
                  ))}
                </div>
                {reviews.length > 0 ? (
                  <span className="text-lg font-bold text-foreground">{averageRating.toFixed(1)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">0.0</span>
                )}
              </div>
              <span className="text-muted-foreground">
                {reviews.length > 0 ? `(${reviews.length} تقييم)` : '(لا توجد تقييمات بعد)'}
              </span>
            </div>
          </div>

          {/* نموذج إضافة تقييم */}
          {user && !userHasReviewed && (
            <div className="mb-6 p-4 rounded-lg bg-card shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-foreground">أضف تقييمك</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-foreground">التقييم:</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                      disabled={submitting}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? 'text-red-500 fill-current'
                            : 'text-muted-foreground hover:text-red-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {rating === 1 && "ضعيف"}
                    {rating === 2 && "مقبول"}
                    {rating === 3 && "جيد"}
                    {rating === 4 && "ممتاز"}
                    {rating === 5 && "رائع"}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-foreground">التعليق (اختياري):</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={bookTitle ? `شاركنا رأيك في كتاب ${bookTitle}` : "شاركنا رأيك في الكتاب..."}
                  className="bg-background border-border text-foreground"
                  disabled={submitting}
                />
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={submitting || rating === 0}
                className="bg-book-primary hover:bg-book-primary/80 text-white disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  'إرسال التقييم'
                )}
              </Button>
            </div>
          )}

          {user && userHasReviewed && (
            <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200 text-center">
                ✓ شكراً لك! لقد قمت بتقييم هذا الكتاب من قبل
              </p>
            </div>
          )}

          {!user && (
            <div className="mb-6 p-4 border-2 border-dashed border-border rounded-lg bg-card text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-2">سجل دخولك لإضافة تقييم</h3>
              <p className="text-muted-foreground mb-4">شارك رأيك في هذا الكتاب مع القراء الآخرين</p>
              <Button 
                variant="default" 
                className="bg-book-primary hover:bg-book-primary/80 text-white"
                onClick={() => window.location.href = '/auth'}
              >
                تسجيل الدخول
              </Button>
            </div>
          )}

          {/* قائمة التقييمات */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد تقييمات لهذا الكتاب بعد</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-lg p-4 bg-card shadow-lg mb-4">
                  {editingReview === review.id ? (
                    // نموذج التعديل
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">تعديل التقييم</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          className="text-muted-foreground"
                        >
                          إلغاء
                        </Button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2 text-foreground">التقييم:</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setEditRating(star)}
                              className="p-1"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  star <= editRating
                                    ? 'text-red-500 fill-current'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-foreground">التعليق:</label>
                        <Textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          placeholder={bookTitle ? `شاركنا رأيك في كتاب ${bookTitle}` : "شاركنا رأيك في الكتاب..."}
                          className="bg-background border-border text-foreground"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleUpdateReview}
                          disabled={submitting || editRating === 0}
                          className="bg-book-primary hover:bg-book-primary/80 text-white"
                        >
                          {submitting ? 'جاري التحديث...' : 'حفظ التغييرات'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelEdit}
                          className="border-border text-foreground"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // عرض التقييم العادي
                    <>
                      <div className="flex items-start gap-3 mb-2 w-full">
                        <UnifiedProfileLink
                          userId={review.user_id}
                          username={review.profiles?.username}
                          className="flex items-start gap-2 hover:opacity-80 transition-opacity min-w-0 flex-1"
                        >
                          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-transparent hover:ring-primary/30 transition-all">
                            <AvatarImage 
                              src={getAvatarUrl(review.profiles?.avatar_url)} 
                              alt={review.profiles?.username || 'مستخدم'} 
                            />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-medium text-foreground hover:text-primary transition-colors truncate min-w-0">
                                {review.profiles?.username || review.profiles?.email?.split('@')[0] || 'مستخدم'}
                              </span>
                              {review.profiles?.is_ai_bot && <AIBotBadge size="sm" className="mr-1 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <div className="flex shrink-0">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3.5 w-3.5 ${
                                      star <= review.rating
                                        ? 'text-red-500 fill-current'
                                        : 'text-muted-foreground'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(review.created_at)}
                              </span>
                            </div>
                          </div>
                        </UnifiedProfileLink>
                        <div className="flex items-center gap-2 shrink-0">
                          {user && user.id === review.user_id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent 
                                align="end" 
                                className="w-48 bg-popover border-border shadow-lg"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleEditReview(review)}
                                  className="cursor-pointer text-foreground hover:bg-accent"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  تعديل
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="cursor-pointer text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      حذف
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>حذف التقييم</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteReview(review.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        حذف
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="text-muted-foreground mt-2">{review.comment}</p>
                      )}
                      
                      {/* مكون البذرة النامية مع زر الإعجاب */}
                      <div className="mt-3 flex justify-end">
                        <ReviewLikeButton reviewId={review.id} />
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookReviews;
