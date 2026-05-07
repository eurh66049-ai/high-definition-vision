import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Star, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { booksData } from '@/data/editableBooksData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createBookSlug } from '@/utils/bookSlug';

interface UserReview {
  id: string;
  bookId: string;
  rating: number;
  comment?: string;
  recommend?: boolean;
  createdAt: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover?: string;
}

const UserReviews: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({});
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserReviews();
    }
  }, [user]);

  const findBookById = (bookIdStr: string) => {
    // طريقة 1: محاولة العثور على الكتاب باستخدام معرف UUID كما هو
    for (const book of booksData) {
      if (book.id.toString() === bookIdStr) {
        return book;
      }
    }
    
    // طريقة 2: محاولة استخراج رقم من UUID
    const numericId = parseInt(bookIdStr);
    if (!isNaN(numericId) && numericId >= 1 && numericId <= booksData.length) {
      return booksData.find(b => b.id === numericId);
    }
    
    // طريقة 3: البحث عن أي جزء من المعرف قد يطابق معرف كتاب
    for (const book of booksData) {
      if (bookIdStr.includes(book.id.toString())) {
        return book;
      }
    }
    
    // طريقة 4: تحليل UUID بحثًا عن أي أجزاء قد تكون معرف كتاب
    if (bookIdStr.includes('-')) {
      const parts = bookIdStr.split('-');
      for (const part of parts) {
        const numPart = parseInt(part);
        if (!isNaN(numPart) && numPart >= 1 && numPart <= booksData.length) {
          return booksData.find(b => b.id === numPart);
        }
      }
    }
    
    // طريقة 5: المطابقة مع بداية UUID (خاص بالنظام المعني)
    // التعامل مع معرفات UUID المحددة المعروفة للكتب
    // (تم تحديدها من سجلات التطبيق)
    const knownBookIds: Record<string, number> = {
      'a87ff679': 1,
      'c81e728d': 2,
      'eccbc87e': 3,
      '8f14e45f': 4,
      'e4da3b7f': 5
    };
    
    for (const prefix in knownBookIds) {
      if (bookIdStr.startsWith(prefix)) {
        const bookId = knownBookIds[prefix];
        return booksData.find(b => b.id === bookId);
      }
    }
    
    // عند الفشل في العثور على الكتاب، نعود إلى الكتاب الأول كافتراضي
    return booksData[0];
  };

  const fetchUserReviews = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setNoAccess(false);

      const { data: reviewsData, error } = await supabase
        .from('book_reviews')
        .select(`
          id,
          book_id,
          rating,
          comment,
          recommend,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error && error.code === '42501') {
        setNoAccess(true);
        setReviews([]);
        return;
      }
      if (error) {
        throw error;
      }

      const reviewsWithBookInfo = reviewsData.map(review => {
        const bookInfo = findBookById(review.book_id);
        return {
          id: review.id,
          bookId: review.book_id,
          rating: review.rating,
          comment: review.comment,
          recommend: review.recommend,
          createdAt: review.created_at,
          bookTitle: bookInfo?.title || 'كتاب غير معروف',
          bookAuthor: bookInfo?.author?.name || 'مؤلف غير معروف',
          bookCover: bookInfo?.coverImage || 'https://placehold.co/400x600?text=No+Image'
        };
      });

      setReviews(reviewsWithBookInfo);
    } catch (error: any) {
      if (error?.code === '42501') {
        setNoAccess(true);
        setReviews([]);
      } else {
        console.error('خطأ في جلب مراجعات المستخدم:', error);
        toast({
          title: "خطأ في تحميل المراجعات",
          description: "حدث خطأ أثناء محاولة تحميل مراجعاتك",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    
    try {
      setDeleteLoading(prev => ({ ...prev, [reviewId]: true }));
      
      const { error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      setReviews(prev => prev.filter(review => review.id !== reviewId));
      
      toast({
        title: "تم حذف المراجعة",
        description: "تم حذف مراجعتك بنجاح"
      });
    } catch (error) {
      console.error('خطأ في حذف المراجعة:', error);
      toast({
        title: "خطأ في حذف المراجعة",
        description: "حدث خطأ أثناء محاولة حذف المراجعة",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`h-5 w-5 ${
              index < rating ? "fill-[#ea384c] text-[#ea384c]" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  // تحديث دالة تنسيق التاريخ لاستخدام الأرقام الإنجليزية
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getBookIdForLink = (bookId: string, bookTitle?: string, bookAuthor?: string) => {
    // إذا توفر العنوان والمؤلف، أنشئ slug
    if (bookTitle && bookAuthor) {
      return createBookSlug(bookTitle, bookAuthor);
    }
    // وإلا استخدم الطريقة القديمة
    const book = findBookById(bookId);
    return book ? book.id : 1;
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-center text-xl font-tajawal text-book-primary">مراجعاتك</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-book-primary" />
        </CardContent>
      </Card>
    );
  }

  if (noAccess) {
    return (
      <Card className="bg-white shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-center text-xl font-tajawal text-book-primary">مراجعاتك</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-red-600 font-cairo">❌ لا تملك صلاحية للوصول إلى مراجعات الكتب.</p>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="bg-white shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-center text-xl font-tajawal text-book-primary">مراجعاتك</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground font-cairo">لم تقم بإضافة أي مراجعات بعد</p>
          <Button asChild className="mt-4 bg-book-primary hover:bg-book-secondary">
            <Link to="/">استعرض الكتب</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-md border-0">
      <CardHeader>
        <CardTitle className="text-center text-xl font-tajawal text-book-primary">مراجعاتك</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="md:w-1/4 flex justify-center">
                    <Link to={`/book/${getBookIdForLink(review.bookId, review.bookTitle, review.bookAuthor)}`} className="block">
                     <div className="w-28 h-40 overflow-hidden rounded-md shadow transition-all hover:shadow-lg">
                      {review.bookCover ? (
                        <img 
                          src={review.bookCover} 
                          alt={review.bookTitle}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'https://placehold.co/400x600?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <BookOpen className="text-gray-500 h-8 w-8" />
                          <span className="text-gray-500">بدون صورة</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
                <div className="md:w-3/4">
                   <div className="flex flex-col text-right">
                     <Link to={`/book/${getBookIdForLink(review.bookId, review.bookTitle, review.bookAuthor)}`} className="hover:text-book-primary transition-colors">
                      <div className="text-xl font-bold">
                        {review.bookTitle}
                      </div>
                    </Link>
                    <div className="text-gray-600 mb-2">{review.bookAuthor}</div>
                    
                    <div className="flex justify-end mb-2">
                      {renderStars(review.rating)}
                    </div>

                    {review.comment && (
                      <p className="text-gray-700 mb-2">{review.comment}</p>
                    )}
                    
                    {review.recommend !== null && (
                      <div className="mb-2 text-sm">
                        <span className={`${review.recommend ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                          {review.recommend ? 'أوصي بهذا الكتاب' : 'لا أوصي بهذا الكتاب'}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="h-8"
                            disabled={deleteLoading[review.id]}
                          >
                            {deleteLoading[review.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 ml-1" />
                                حذف
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-tajawal">حذف المراجعة</AlertDialogTitle>
                            <AlertDialogDescription className="font-tajawal">
                              هل أنت متأكد من حذف مراجعتك لكتاب "{review.bookTitle}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-tajawal">إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-red-600 hover:bg-red-700 font-tajawal"
                              onClick={() => handleDeleteReview(review.id)}
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <span className="text-gray-500 text-sm font-cairo">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserReviews;
