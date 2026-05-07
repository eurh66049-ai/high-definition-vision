
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, RefreshCw, Upload, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { createBookSlug } from '@/utils/bookSlug';
import { useCategoryImagesPreloader } from '@/hooks/useImagePreloader';
import { StarRating } from '@/components/ui/star-rating';

interface BookSubmission {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  category: string;
  status: string;
  actualStatus?: string; // الحالة الفعلية للكتاب
  editRequestId?: string; // معرف طلب التعديل إن وجد
  created_at: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  cover_image_url?: string;
  book_file_url?: string;
  description: string;
  slug?: string;
  rating?: number;
}

const UserBookSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<BookSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // تحميل مسبق لصور كتب المستخدم - 24 دفعة واحدة
  useCategoryImagesPreloader(submissions.map(s => ({ cover_image_url: s.cover_image_url })));
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserSubmissions();
    }
  }, [user]);

  // تحديث البيانات عند العودة للصفحة
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchUserSubmissions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const fetchUserSubmissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // جلب الكتب الأصلية فقط (استثناء طلبات التعديل)
      const { data, error } = await supabase
        .from('book_submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_edit_request', false) // استثناء طلبات التعديل
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('خطأ في جلب طلبات الكتب:', error);
        toast({
          title: "خطأ في جلب البيانات",
          description: "حدث خطأ أثناء جلب طلبات الكتب الخاصة بك",
          variant: "destructive"
        });
      } else {
        // التحقق من وجود طلبات تعديل معلقة لكل كتاب معتمد
        const enrichedData = await Promise.all((data || []).map(async (book) => {
          if (book.status === 'approved') {
            // التحقق من وجود طلب تعديل معلق
            const { data: editRequest } = await supabase
              .from('book_submissions')
              .select('id, status')
              .eq('original_book_id', book.id)
              .eq('is_edit_request', true)
              .eq('status', 'pending_edit')
              .maybeSingle();
            
            if (editRequest) {
              // إذا كان هناك طلب تعديل معلق، غيّر الحالة المعروضة
              return {
                ...book,
                actualStatus: book.status, // الحالة الفعلية
                status: 'pending_edit', // الحالة المعروضة
                editRequestId: editRequest.id
              };
            }
          }
          return {
            ...book,
            actualStatus: book.status
          };
        }));
        
        setSubmissions(enrichedData);
        
        // تحديث الإحصائيات
        const pendingCount = enrichedData.filter(s => s.status === 'pending' || s.status === 'pending_edit').length;
        const approvedCount = enrichedData.filter(s => s.status === 'approved').length;
        const rejectedCount = enrichedData.filter(s => s.status === 'rejected').length;
        
        console.log(`إحصائيات الكتب المرفوعة: ${pendingCount} في الانتظار، ${approvedCount} مقبولة، ${rejectedCount} مرفوضة`);
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      // التحقق من حالة الكتاب قبل الحذف
      const book = submissions.find(s => s.id === bookId);
      if (book && book.status !== 'pending') {
        toast({
          title: "لا يمكن حذف الكتاب",
          description: "يمكن حذف الكتب قيد المراجعة فقط",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('book_submissions')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user?.id)
        .eq('status', 'pending'); // حذف الكتب قيد المراجعة فقط

      if (error) {
        console.error('خطأ في حذف الكتاب:', error);
        toast({
          title: "خطأ في الحذف",
          description: "حدث خطأ أثناء حذف الكتاب",
          variant: "destructive"
        });
      } else {
        toast({
          title: "تم الحذف",
          description: "تم حذف الكتاب بنجاح",
        });
        // تحديث القائمة
        fetchUserSubmissions();
      }
    } catch (error) {
      console.error('خطأ في حذف الكتاب:', error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  };

  // دالة منفصلة لحذف الكتب المعتمدة
  const handleDeleteApprovedBook = async (bookId: string) => {
    try {
      console.log('=== بدء عملية حذف الكتاب المعتمد نهائياً ===');
      console.log('Book ID:', bookId);
      console.log('User ID:', user?.id);
      
      if (!user?.id) {
        toast({
          title: "خطأ في التحقق",
          description: "لم يتم العثور على معرف المستخدم",
          variant: "destructive"
        });
        return;
      }

      // استخدام الدالة الجديدة للحذف النهائي
      const { data, error } = await supabase.rpc('delete_approved_book_permanently', {
        p_book_id: bookId,
        p_user_id: user.id
      });

      console.log('=== نتيجة الحذف النهائي ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('خطأ في حذف الكتاب نهائياً:', error);
        toast({
          title: "خطأ في الحذف",
          description: `فشل في حذف الكتاب: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!data || data.length === 0) {
        toast({
          title: "خطأ في الحذف",
          description: "لم يتم الحصول على استجابة من الخادم",
          variant: "destructive"
        });
        return;
      }

      const result = data[0];
      
      if (!result.success) {
        toast({
          title: "فشل في الحذف",
          description: result.message || "لم يتم العثور على الكتاب أو ليس لديك صلاحية لحذفه",
          variant: "destructive"
        });
        return;
      }

      console.log('تم حذف الكتاب نهائياً بنجاح:', result.book_title);
      console.log('عدد الملفات المحذوفة:', result.deleted_files);
      
      toast({
        title: "تم الحذف نهائياً",
        description: `تم حذف كتاب "${result.book_title}" نهائياً من المكتبة مع جميع ملفاته (${result.deleted_files} ملف)`,
      });
      
      // تحديث القائمة
      fetchUserSubmissions();
      
    } catch (error) {
      console.error('خطأ في حذف الكتاب المعتمد:', error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ غير متوقع أثناء حذف الكتاب",
        variant: "destructive"
      });
    }
  };

  const handleEditBook = (bookId: string) => {
    const book = submissions.find(s => s.id === bookId);
    if (!book) return;
    
    // السماح بتعديل الكتب المعتمدة والكتب قيد المراجعة
    if (book.status === 'approved') {
      // للكتب المعتمدة، استخدم وضع التعديل الخاص
      navigate(`/upload-book?edit-approved=${bookId}`);
    } else if (book.status === 'pending') {
      // للكتب قيد المراجعة، استخدم التعديل العادي
      navigate(`/upload-book?edit=${bookId}`);
    } else if (book.status === 'pending_edit') {
      // للكتب قيد مراجعة التعديلات، إظهار رسالة
      toast({
        title: "جاري مراجعة التعديلات",
        description: "يتم حالياً مراجعة التعديلات المقترحة لهذا الكتاب. يرجى انتظار انتهاء المراجعة.",
        variant: "default"
      });
    } else {
      toast({
        title: "لا يمكن تعديل الكتاب",
        description: "يمكن تعديل الكتب المعتمدة أو الكتب قيد المراجعة فقط",
        variant: "destructive"
      });
    }
  };

  const handleViewBook = async (bookId: string) => {
    try {
      // استخدام دالة للحصول على تفاصيل الكتاب
      const { data, error } = await supabase
        .rpc('get_book_details', { p_book_id: bookId });
      
      if (error || !data || data.length === 0) {
        toast({
          title: "خطأ في العثور على الكتاب",
          description: "لم يتم العثور على تفاصيل الكتاب",
          variant: "destructive"
        });
        return;
      }
      
      // النقل إلى صفحة تفاصيل الكتاب باستخدام slug
      const bookData = data[0];
      const bookSlug = bookData.slug || createBookSlug(bookData.title, bookData.author);
      navigate(`/book/${bookSlug}`);
    } catch (error) {
      console.error('خطأ في عرض الكتاب:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء محاولة فتح الكتاب",
        variant: "destructive"
      });
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // عرض التاريخ والوقت بالتفصيل بأرقام إنجليزية
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getCategoryLabel = (categoryKey: string): string => {
    const categories: Record<string, string> = {
      'novels': 'روايات',
      'philosophy-culture': 'الفكر والثقافة العامة',
      'islamic-sciences': 'العلوم الإسلامية',
      'story-collections': 'مجموعة قصص',
      'poetry': 'الشعر',
      'texts-essays': 'نصوص وخواطر',
      'literature': 'الأدب',
      'history-civilizations': 'التاريخ والحضارات',
      'human-development': 'التنمية البشرية وتطوير الذات',
      'memoirs-autobiographies': 'مذكرات وسير ذاتية',
      'philosophy-logic': 'الفلسفة والمنطق',
      'politics': 'السياسية',
      'children': 'الأطفال',
      'studies-research': 'دراسات وبحوث',
      'religion': 'الأديان',
      'plays-arts': 'مسرحيات وفنون',
      'psychology': 'علم النفس',
      'education-pedagogy': 'التعليم والتربية',
      'love-relationships': 'الحب والعلاقات',
      'interpretations': 'التفاسير',
      'prophetic-biography': 'السيرة النبوية',
      'successors-followers': 'سيرة الخلفاء والتابعين',
      'marketing-business': 'التسويق وإدارة الأعمال',
      'sciences': 'العلوم',
      'arabic-learning': 'تعلم اللغة العربية',
      'womens-culture': 'ثقافة المرأة',
      'translation-dictionaries': 'الترجمة ومعاجم',
      'prophets-stories': 'قصص الأنبياء',
      'economics': 'الإقتصاد',
      'sociology': 'علم الإجتماع',
      'sufism': 'الصوفية',
      'english-learning': 'تعلم اللغة الإنجليزية',
      'medicine-nursing': 'الطب والتمريض',
      'communication-media': 'التواصل والإعلام',
      'nutrition': 'التغذية',
      'law': 'القانون',
      'programming': 'البرمجة',
      'alternative-medicine': 'الأعشاب والطب البديل',
      'mathematics': 'الرياضة',
      'computer-science': 'علوم الحاسوب',
      'french-learning': 'تعلم اللغة الفرنسية',
      'military-sciences': 'الحرب والعلوم العسكرية',
      'spanish-learning': 'تعلم اللغة الإسبانية',
      'photography': 'التصوير الفوتوغرافي',
      'cooking': 'الطبخ',
      'magazines': 'مجلات',
      'dream-interpretation': 'تفاسير الأحلام',
      'encyclopedias': 'المصاحف',
      'german-learning': 'تعلم اللغة الألمانية'
    };
    
    return categories[categoryKey] || categoryKey;
  };


  const getTabCounts = () => {
    const all = submissions.length;
    const pending = submissions.filter(s => s.status === 'pending').length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;
    
    return { all, pending, approved, rejected };
  };

  const counts = getTabCounts();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">جاري تحميل طلبات الكتب...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-book-primary" />
          <h2 className="text-xl font-bold">كتبي المرفوعة</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchUserSubmissions}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* Books Grid */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لم ترفع أي كتب بعد</h3>
            <p className="text-muted-foreground mb-4">ابدأ برفع كتابك الأول إلى المنصة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {submissions.map((submission) => (
            <Card 
              key={submission.id} 
              className={`overflow-hidden bg-card rounded-lg ${submission.status === 'approved' ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
              onClick={submission.status === 'approved' ? (e) => {
                // التأكد من أن النقر ليس على الأزرار
                if (e.target !== e.currentTarget && 
                    !e.defaultPrevented && 
                    !(e.target as Element).closest('button') && 
                    !(e.target as Element).closest('[role="dialog"]')) {
                  handleViewBook(submission.id);
                }
              } : undefined}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Book Cover */}
                  <div className="w-20 h-28 bg-muted flex-shrink-0 relative rounded-md overflow-hidden">
                    <img 
                      src={submission.cover_image_url || '/src/assets/default-book-cover.png'} 
                      alt={submission.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/src/assets/default-book-cover.png';
                      }}
                    />
                  </div>
                  
                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 font-amiri line-clamp-2 text-foreground">{submission.title}</h3>
                        <p className="text-muted-foreground text-sm font-cairo mb-2">{submission.author}</p>
                        
                        {/* عرض التقييم الفعلي فقط إذا كان موجود وأكبر من صفر */}
                        {submission.status === 'approved' && submission.rating && submission.rating > 0 && (
                          <div className="flex items-center gap-1 mb-2">
                            <StarRating
                              rating={submission.rating}
                              size="sm"
                              showRating={true}
                              showReviewCount={false}
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0 ml-2">
                        {submission.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-orange-500 text-white">
                            قيد المراجعة
                          </span>
                        )}
                        {submission.status === 'pending_edit' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-500 text-white">
                            قيد مراجعة التعديلات
                          </span>
                        )}
                        {submission.status === 'approved' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-green-500 text-white">
                            تمت الموافقة
                          </span>
                        )}
                        {submission.status === 'rejected' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-destructive text-destructive-foreground">
                            مرفوض
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Reviewer Notes */}
                    {submission.reviewer_notes && (
                      <div className="mb-3">
                        <div className={`text-xs p-2 rounded border ${
                          submission.status === 'approved' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                            : 'bg-destructive/10 dark:bg-destructive/20 border-destructive/30 dark:border-destructive/40 text-destructive dark:text-destructive'
                        }`}>
                          <span className="font-semibold">ملاحظات المراجع:</span><br />
                          {submission.reviewer_notes}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-auto">
                      {/* أزرار للكتب قيد المراجعة */}
                      {submission.status === 'pending' && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3 ml-1" />
                                حذف
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-right font-tajawal">
                                  تأكيد حذف الكتاب
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-right font-cairo">
                                  هل أنت متأكد من أنك تريد حذف كتاب <span className="font-bold text-foreground">"{submission.title}"</span>؟
                                  <br />
                                  هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel className="font-cairo">
                                  إلغاء
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-cairo"
                                  onClick={() => handleDeleteBook(submission.id)}
                                >
                                  حذف الكتاب
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs text-blue-600 hover:bg-blue-50 border-blue-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBook(submission.id);
                            }}
                          >
                            <Edit className="h-3 w-3 ml-1" />
                            تعديل
                          </Button>
                        </>
                      )}
                      
                      {/* أزرار للكتب قيد مراجعة التعديلات */}
                      {submission.status === 'pending_edit' && (
                        <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">
                          📝 يتم مراجعة التعديلات المقترحة...
                        </div>
                      )}
                      
                      {/* أزرار للكتب المعتمدة */}
                      {submission.status === 'approved' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs text-green-600 hover:bg-green-50 border-green-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBook(submission.id);
                            }}
                          >
                            <Edit className="h-3 w-3 ml-1" />
                            تعديل الكتاب
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3 ml-1" />
                                حذف
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-right font-tajawal">
                                  تأكيد حذف الكتاب المعتمد
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-right font-cairo">
                                  هل أنت متأكد من أنك تريد حذف كتاب <span className="font-bold text-foreground">"{submission.title}"</span>؟
                                  <br />
                                  تحذير: هذا سيحذف الكتاب المعتمد نهائياً من المكتبة وهذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel className="font-cairo">
                                  إلغاء
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-cairo"
                                  onClick={() => handleDeleteApprovedBook(submission.id)}
                                >
                                  حذف الكتاب نهائياً
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      
                      {submission.status === 'rejected' && (
                        <div className="text-xs text-red-600 font-semibold">
                          ❌ تم رفض الكتاب
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBookSubmissions;
