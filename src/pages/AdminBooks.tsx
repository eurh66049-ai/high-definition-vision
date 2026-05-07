import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Eye, AlertTriangle, Settings, RefreshCw, Calendar, User, BookOpen, FileText, Globe, Building, Search, BarChart3 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DeleteBookDialog from '@/components/admin/DeleteBookDialog';
import ApprovedBooksManager from '@/components/admin/ApprovedBooksManager';
import AuthorVerificationManager from '@/components/admin/AuthorVerificationManager';
import AuthorFollowersManager from '@/components/admin/AuthorFollowersManager';
import BulkBookUploader from '@/components/admin/BulkBookUploader';
import BulkBookUploaderAI from '@/components/admin/BulkBookUploaderAI';
import AIBookSearchManager from '@/components/admin/AIBookSearchManager';
import AIBotsManager from '@/components/admin/AIBotsManager';
import { BookRejectionDialog } from '@/components/admin/BookRejectionDialog';
import { BatchWatermarkManager } from '@/components/admin/BatchWatermarkManager';
import SiteUpdatesManager from '@/components/admin/SiteUpdatesManager';
import TextExtractionManager from '@/components/admin/TextExtractionManager';
import BulkEmailManager from '@/components/admin/BulkEmailManager';




interface BookSubmissionType {
  id: string;
  title: string;
  subtitle: string | null;
  author: string;
  category: string;
  publisher: string | null;
  translator: string | null;
  description: string;
  language: string;
  publication_year: number | null;
  page_count: number | null;
  cover_image_url: string | null;
  book_file_url: string | null;
  file_type: string | null;
  display_type: string;
  rights_confirmation: boolean | null;
  created_at: string;
  status: string;
  user_id: string | null;
  user_email: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  is_edit_request?: boolean;
  original_book_id?: string;
  edit_requested_at?: string;
  original_title?: string;
  original_author?: string;
  original_description?: string;
  original_category?: string;
  original_language?: string;
  original_publication_year?: number | null;
  original_page_count?: number | null;
  original_display_type?: string;
  changes_summary?: {
    title_changed: boolean;
    author_changed: boolean;
    description_changed: boolean;
    category_changed: boolean;
    language_changed: boolean;
    publication_year_changed: boolean;
    page_count_changed: boolean;
    display_type_changed: boolean;
    cover_changed: boolean;
    file_changed: boolean;
  };
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const AdminBooks: React.FC = () => {
  const [bookSubmissions, setBookSubmissions] = useState<BookSubmissionType[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [processingBookId, setProcessingBookId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adminCheckCompleted, setAdminCheckCompleted] = useState(false);
  const [tabsCounts, setTabsCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    pending_edit: 0,
  });
  const [rejectionDialog, setRejectionDialog] = useState<{
    isOpen: boolean;
    bookId: string;
    bookTitle: string;
  }>({
    isOpen: false,
    bookId: '',
    bookTitle: ''
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkAdminStatus = async (forceRefresh = false) => {
    if (!user?.email) {
      console.log('AdminBooks: No user email available');
      setIsAdmin(false);
      setCheckingAdmin(false);
      setAdminCheckCompleted(true);
      setDebugInfo({ noEmail: true, timestamp: new Date().toISOString() });
      return;
    }
    
    // منع إعادة التحقق إذا تم بالفعل إلا في حالة forceRefresh
    if (adminCheckCompleted && !forceRefresh) {
      console.log('AdminBooks: Admin status already checked, skipping');
      return;
    }
    
    try {
      console.log('AdminBooks: Checking admin status for:', user.email);
      if (forceRefresh) setRefreshing(true);
      setCheckingAdmin(true);
      
      const { data, error } = await supabase
        .rpc('is_admin_user', { user_email: user.email });
        
      console.log('AdminBooks: Admin query result:', { data, error, email: user.email });
      
      const debugData = {
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        queryResult: data,
        error: error,
        querySuccess: !error,
        adminFound: !!data
      };
      
      setDebugInfo(debugData);
      
      if (error) {
        console.error('AdminBooks: Error checking admin status:', error);
        setIsAdmin(false);
        
        if (forceRefresh) {
          toast({
            title: "خطأ في التحقق من الصلاحيات",
            description: "حدث خطأ أثناء التحقق من صلاحيات الإدارة",
            variant: "destructive"
          });
        }
      } else {
        setIsAdmin(data || false);
        console.log('AdminBooks: User admin status:', data);
        
        if (forceRefresh) {
          toast({
            title: data ? "تم التحقق من الصلاحيات بنجاح" : "تعذر العثور على صلاحيات الإدارة",
            description: data ? "مرحباً بك في لوحة الإدارة" : "تأكد من أن بريدك الإلكتروني مُضاف في قائمة الإداريين",
            variant: data ? "default" : "destructive"
          });
        }
      }
      
    } catch (error) {
      console.error('AdminBooks: Unexpected error:', error);
      setIsAdmin(false);
      setDebugInfo({ 
        catchError: error, 
        userEmail: user.email,
        timestamp: new Date().toISOString()
      });
      
      if (forceRefresh) {
        toast({
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى",
          variant: "destructive"
        });
      }
    } finally {
      setCheckingAdmin(false);
      setRefreshing(false);
      setAdminCheckCompleted(true);
    }
  };

  useEffect(() => {
    console.log('AdminBooks: Component mounted - user:', user?.email);
    
    if (user?.email && !adminCheckCompleted) {
      checkAdminStatus();
    } else if (!user?.email) {
      const timeout = setTimeout(() => {
        if (!user?.email) {
          console.log('AdminBooks: No user after timeout, setting as not admin');
          setIsAdmin(false);
          setCheckingAdmin(false);
          setAdminCheckCompleted(true);
          setDebugInfo({ 
            noUser: true, 
            timestamp: new Date().toISOString() 
          });
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [user, adminCheckCompleted]);

  useEffect(() => {
    if (checkingAdmin || isAdmin === null) return;
    
    console.log('AdminBooks: Final admin check result:', isAdmin);
    
    if (isAdmin === true) {
      console.log('AdminBooks: User confirmed as admin, fetching book submissions');
      fetchAllTabsCounts(); // جلب إحصائيات جميع التبويبات
      fetchBookSubmissions(activeTab);
    }
  }, [isAdmin, checkingAdmin, activeTab]);

  // دالة لجلب إحصائيات جميع التبويبات
  const fetchAllTabsCounts = async () => {
    if (!user || isAdmin !== true) return;
    
    try {
      console.log('AdminBooks: Fetching tabs counts...');
      
      // جلب عدد الطلبات فقط - لا نجلب البيانات
      const { count: pendingCount } = await supabase
        .from('book_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('is_edit_request', false);

      const { count: pendingEditCount } = await supabase
        .from('book_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_edit')
        .eq('is_edit_request', true);
        
      // جلب عدد الطلبات المرفوضة
      const { count: rejectedCount } = await supabase
        .from('book_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected');
        
      // جلب عدد الكتب المعتمدة
      const { count: approvedCount } = await supabase
        .from('approved_books')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      
      setTabsCounts({
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
        pending_edit: pendingEditCount || 0,
      });
      
      console.log('AdminBooks: Tabs counts updated:', {
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
        pending_edit: pendingEditCount || 0,
      });
      
    } catch (error) {
      console.error('AdminBooks: Error fetching tabs counts:', error);
    }
  };

  const fetchBookSubmissions = async (status: string) => {
    console.log('AdminBooks: Starting to fetch book submissions with status:', status);
    console.log('AdminBooks: User:', user?.email, 'IsAdmin:', isAdmin);
    
    if (!user || isAdmin !== true) {
      console.log('AdminBooks: Cannot fetch book submissions - no user or not admin');
      setBookSubmissions([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('AdminBooks: Making query to book_submissions table...');
      
      // لا نجلب البيانات إلا لتبويبات الكتب فقط
      if (status !== 'pending' && status !== 'rejected' && status !== 'pending_edit') {
        setBookSubmissions([]);
        setLoading(false);
        return;
      }
      
      // للحالات المسموحة (pending/rejected)، نجلب من جدول book_submissions
        // للحالات الأخرى، نجلب من جدول book_submissions
        const { data: submissions, error } = await supabaseFunctions.functions.invoke('get-book-submissions', {
          body: { status }
        });
          
        console.log('AdminBooks: Edge Function result:', { data: submissions?.data, error, status });
        
        if (error) {
          console.error('AdminBooks: Error fetching book submissions:', error);
          
          console.log('AdminBooks: Trying direct query as fallback...');
          const { data: directData, error: directError } = await supabase
            .from('book_submissions')
            .select(`
              id,
              title,
              subtitle,
              author,
              category,
              publisher,
              translator,
              description,
              language,
              publication_year,
              page_count,
              cover_image_url,
              book_file_url,
              file_type,
              display_type,
              rights_confirmation,
              created_at,
              status,
              user_id,
              user_email,
              reviewer_notes,
              reviewed_at
            `)
            .eq('status', status)
            .order('created_at', { ascending: false })
            .limit(100); // نحد من عدد النتائج لتحسين الأداء
            
          if (directError) {
            console.error('AdminBooks: Direct query also failed:', directError);
            toast({
              title: "خطأ في جلب البيانات",
              description: `حدث خطأ أثناء جلب طلبات الكتب: ${directError.message}`,
              variant: "destructive"
            });
            setBookSubmissions([]);
          } else {
            console.log('AdminBooks: Direct query successful:', directData?.length || 0, 'submissions');
            await processSubmissions(directData || []);
          }
        } else if (submissions?.data) {
          console.log('AdminBooks: Edge Function successful:', submissions.data.length, 'submissions');
          await processSubmissions(submissions.data);
        }
      
    } catch (error) {
      console.error("AdminBooks: Unexpected error fetching book submissions:", error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدثت مشكلة غير متوقعة أثناء جلب البيانات. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
      setBookSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const processSubmissions = async (submissions: any[]) => {
    console.log('AdminBooks: Processing submissions:', submissions.length);
    
    const submissionsWithProfiles: BookSubmissionType[] = await Promise.all(
      submissions.map(async (submission) => {
        let profiles = { username: null, avatar_url: null };
        
        if (submission.user_id) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', submission.user_id)
              .maybeSingle();
            
            if (profile && !profileError) {
              profiles = profile;
            }
          } catch (profileError) {
            console.log('AdminBooks: Error fetching profile for user:', submission.user_id, profileError);
          }
        }
        
        return {
          ...submission,
          profiles
        } as BookSubmissionType;
      })
    );
    
    setBookSubmissions(submissionsWithProfiles);
    
    if (submissionsWithProfiles.length > 0) {
      toast({
        title: "تم جلب البيانات بنجاح",
        description: `تم العثور على ${submissionsWithProfiles.length} طلب كتاب بحالة "${activeTab}"`,
      });
    } else {
      console.log('AdminBooks: No submissions found for status:', activeTab);
      toast({
        title: "لا توجد طلبات",
        description: `لم يتم العثور على طلبات كتب بحالة "${activeTab}"`,
        variant: "default"
      });
    }
  };

  // دالة لإظهار نافذة الرفض
  const handleRejectBook = (submissionId: string, bookTitle: string) => {
    setRejectionDialog({
      isOpen: true,
      bookId: submissionId,
      bookTitle
    });
  };

  // دالة لإغلاق نافذة الرفض
  const handleCloseRejectionDialog = () => {
    setRejectionDialog({
      isOpen: false,
      bookId: '',
      bookTitle: ''
    });
  };

  // دالة لتأكيد الرفض
  const handleConfirmRejection = async (reason: string) => {
    if (!rejectionDialog.bookId) return;
    
    await updateBookSubmissionStatus(rejectionDialog.bookId, 'reject', reason);
    handleCloseRejectionDialog();
  };

  const updateBookSubmissionStatus = async (submissionId: string, action: 'approve' | 'reject', reviewerNotes?: string) => {
    if (!user || processingBookId) return;
    
    console.log(`بدء معالجة الكتاب ${submissionId} بإجراء ${action}`);
    setProcessingBookId(submissionId);
    
    try {
      console.log('استدعاء Edge Function للمعالجة...');
      
      // تحديد Edge Function المناسب بناءً على نوع الطلب
      const functionName = activeTab === 'pending_edit' ? 'manage-book-edit' : 'manage-book-submission';
      
      const { data, error } = await supabaseFunctions.functions.invoke(functionName, {
        body: { 
          submissionId,
          action,
          reviewerNotes
        }
      });

      console.log('نتيجة Edge Function:', { data, error });

      if (error) {
        console.error('خطأ في Edge Function:', error);
        throw new Error(`خطأ في ${action === 'approve' ? 'الموافقة' : 'الرفض'}: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'فشل في العملية');
      }

      console.log('تمت العملية بنجاح:', data.message);
      
      // إزالة الكتاب من القائمة المعروضة
      setBookSubmissions(prev => prev.filter(submission => submission.id !== submissionId));
      
      // تحديث إحصائيات التبويبات
      fetchAllTabsCounts();
      
      // إظهار رسالة نجاح
      toast({
        title: action === 'approve' ? "تمت الموافقة على الكتاب" : "تم رفض الكتاب",
        description: data.message,
        variant: action === 'approve' ? "default" : "destructive"
      });

      // تنبيه في حال فشل إرسال بريد الرفض من الخادم
      if (action === 'reject' && data && data.emailSent === false) {
        console.warn('فشل إرسال بريد الرفض:', data.emailError);
        toast({
          title: 'فشل إرسال بريد الرفض',
          description: data.emailError || 'تحقق من إعدادات EmailJS (service_id, template_id, public key) أو حدّثها في Secrets.',
          variant: 'destructive'
        });
      }
      
      console.log('انتهت العملية بنجاح');
      
    } catch (error) {
      console.error("خطأ في تحديث حالة الكتاب:", error);
      toast({
        title: "خطأ في تحديث حالة الكتاب",
        description: error instanceof Error ? error.message : "حدثت مشكلة أثناء تحديث حالة الكتاب. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setProcessingBookId(null);
    }
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

  const getDisplayTypeLabel = (displayType: string): string => {
    const displayTypes: Record<string, string> = {
      'download_read': 'تحميل وقراءة',
      'read_only': 'قراءة فقط',
      'download_only': 'تحميل فقط'
    };
    
    return displayTypes[displayType] || displayType;
  };

  const getFileTypeLabel = (fileType: string): string => {
    const fileTypes: Record<string, string> = {
      'application/pdf': 'ملف PDF',
      'application/epub+zip': 'كتاب إلكتروني EPUB',
      'application/x-mobipocket-ebook': 'كتاب Kindle',
      'text/plain': 'ملف نصي',
      'application/msword': 'مستند Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'مستند Word حديث'
    };
    
    return fileTypes[fileType] || fileType;
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

  const handleRefreshPermissions = () => {
    checkAdminStatus(true);
  };

  const handleBookDeleted = () => {
    // إعادة تحميل قائمة الكتب وإحصائيات التبويبات بعد الحذف
    fetchAllTabsCounts();
    fetchBookSubmissions(activeTab);
    toast({
      title: "تم حذف الكتاب",
      description: "تم حذف الكتاب من المكتبة بنجاح",
    });
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
            {user && (
              <p className="text-sm text-muted-foreground mt-2">
                البريد الإلكتروني: {user.email}
              </p>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">غير مصرح لك بالوصول</h1>
            <p className="text-muted-foreground mb-6">
              ليس لديك صلاحيات الإدارة للوصول إلى هذه الصفحة. 
            </p>
            
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4 text-sm">
              <h3 className="font-semibold mb-2 flex items-center">
                <Settings className="h-4 w-4 ml-2" />
                معلومات التشخيص
              </h3>
              <div className="text-right space-y-1">
                <p><strong>البريد الإلكتروني:</strong> {debugInfo?.userEmail || user?.email || 'غير محدد'}</p>
                <p><strong>حالة الإدارة:</strong> {debugInfo?.adminFound ? 'موجود' : 'غير موجود'}</p>
                <p><strong>حالة المستخدم:</strong> {user ? 'مسجل الدخول' : 'غير مسجل'}</p>
                <p><strong>نجاح الاستعلام:</strong> {debugInfo?.querySuccess ? 'نعم' : 'لا'}</p>
                <p><strong>وقت التحقق:</strong> {debugInfo?.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString('ar-SA') : 'غير محدد'}</p>
                {debugInfo?.error && (
                  <p><strong>تفاصيل الخطأ:</strong> {debugInfo.error.message || 'خطأ غير محدد'}</p>
                )}
              </div>
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                <strong>ملاحظة:</strong> إذا تم إضافة بريدك مؤخراً إلى قائمة الإداريين، قد تحتاج لإعادة تحديث الصلاحيات.
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleRefreshPermissions} 
                disabled={refreshing}
                className="w-full"
              >
                {refreshing ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="ml-2 h-4 w-4" />
                )}
                {refreshing ? 'جاري التحديث...' : 'إعادة التحقق من الصلاحيات'}
              </Button>
              
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                العودة إلى الصفحة الرئيسية
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">جاري تحميل طلبات الكتب...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-3">إدارة طلبات الكتب</h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-3">
              مراجعة والموافقة على طلبات الكتب المرفوعة من قبل المستخدمين
            </p>
            <Button onClick={() => navigate('/admin/analytics')} variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              لوحة التحليلات
            </Button>
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>مرحباً {user?.email}!</strong> لديك صلاحيات الإدارة ويمكنك إدارة طلبات الكتب.
              </p>
              <Button 
                onClick={handleRefreshPermissions}
                variant="ghost"
                size="sm"
                className="mt-2"
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="ml-1 h-3 w-3" />
                )}
                {refreshing ? 'جاري التحديث...' : 'إعادة التحقق من الصلاحيات'}
              </Button>
              
              <Button 
                onClick={() => fetchBookSubmissions(activeTab)}
                variant="ghost"
                size="sm"
                className="mt-2 ml-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="ml-1 h-3 w-3" />
                )}
                إعادة تحميل البيانات
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-8 overflow-x-auto">
              <TabsList className="inline-flex h-auto w-max min-w-full justify-start p-1">
                <TabsTrigger value="pending" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  قيد الانتظار ({tabsCounts.pending})
                </TabsTrigger>
                <TabsTrigger value="pending_edit" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  قيد مراجعة التعديلات ({tabsCounts.pending_edit})
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  تمت الموافقة ({tabsCounts.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  مرفوضة ({tabsCounts.rejected})
                </TabsTrigger>
                <TabsTrigger value="bulk_upload" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  رفع مجمع
                </TabsTrigger>
                <TabsTrigger value="bulk_upload_ai" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  ✨ رفع مجمع 2 (AI)
                </TabsTrigger>
                <TabsTrigger value="authors" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  المؤلفون الموثقون
                </TabsTrigger>
                <TabsTrigger value="ai_search" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  البحث الذكي
                </TabsTrigger>
                <TabsTrigger value="author_followers" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  إدارة المتابعين
                </TabsTrigger>
                <TabsTrigger value="watermark" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  إضافة الشعار للكتب
                </TabsTrigger>
                <TabsTrigger value="site_updates" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                   تحديثات الموقع
                 </TabsTrigger>
                 <TabsTrigger value="text_extraction" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                   استخراج النصوص
                 </TabsTrigger>
                 <TabsTrigger value="bulk_email" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                   📧 بريد جماعي
                 </TabsTrigger>
                <TabsTrigger value="ai_bots" className="flex-shrink-0 text-sm md:text-lg px-4 md:px-8 whitespace-nowrap">
                  🤖 بوتات AI
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="animate-fade-in">
              {activeTab === 'approved' ? (
                <ApprovedBooksManager onBookDeleted={handleBookDeleted} />
              ) : activeTab === 'authors' ? (
                <AuthorVerificationManager />
              ) : activeTab === 'bulk_upload' ? (
                <BulkBookUploader onUploadComplete={() => {
                  fetchAllTabsCounts();
                  toast({
                    title: "تم تحديث البيانات",
                    description: "تم تحديث قائمة الكتب المعتمدة بعد الرفع المجمع",
                    variant: "default"
                  });
                }} />
              ) : activeTab === 'bulk_upload_ai' ? (
                <BulkBookUploaderAI onUploadComplete={() => {
                  fetchAllTabsCounts();
                  toast({
                    title: "تم تحديث البيانات",
                    description: "تم تحديث قائمة الكتب المعتمدة بعد رفع AI",
                    variant: "default"
                  });
                }} />
              ) : activeTab === 'ai_search' ? (
                <AIBookSearchManager />
              ) : activeTab === 'ai_bots' ? (
                <AIBotsManager />
              ) : activeTab === 'author_followers' ? (
                <AuthorFollowersManager />
              ) : activeTab === 'watermark' ? (
                <BatchWatermarkManager />
              ) : activeTab === 'site_updates' ? (
                <SiteUpdatesManager />
              ) : activeTab === 'text_extraction' ? (
                <TextExtractionManager />
              ) : activeTab === 'bulk_email' ? (
                <BulkEmailManager />
              ) : (
                bookSubmissions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-8">
                    {bookSubmissions.map((submission) => (
                      <Card key={submission.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            <div className="lg:w-1/4 h-64 lg:h-auto overflow-hidden bg-book-light flex-shrink-0">
                              <img 
                                src={submission.cover_image_url || 'https://placehold.co/600x800?text=لا+توجد+صورة'} 
                                alt={submission.title} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://placehold.co/600x800?text=لا+توجد+صورة';
                                }}
                              />
                            </div>
                            
                            <div className="lg:w-3/4 p-6">
                              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
                                <div className="flex-1">
                                   <div className="flex items-center gap-3 mb-2">
                                     <h3 className="font-bold text-xl">{submission.title}</h3>
                                     <Badge variant={
                                       activeTab === 'pending' ? "outline" : 
                                       activeTab === 'pending_edit' ? "secondary" : 
                                       "destructive"
                                     }>
                                       {activeTab === 'pending' ? "قيد المراجعة" : 
                                        activeTab === 'pending_edit' ? "قيد مراجعة التعديلات" : 
                                        "مرفوض"}
                                     </Badge>
                                     {submission.is_edit_request && (
                                       <Badge variant="outline" className="text-blue-600 border-blue-600">
                                         طلب تعديل
                                       </Badge>
                                     )}
                                   </div>
                                  
                                  {submission.subtitle && (
                                    <p className="text-lg text-muted-foreground mb-2">{submission.subtitle}</p>
                                  )}
                                  
                                   <p className="text-book-secondary font-semibold mb-3">{submission.author}</p>
                                   
                                    {/* معلومات الكتاب الأصلي في حالة التعديل */}
                                    {submission.is_edit_request && submission.original_title && (
                                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                                        <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-3">الكتاب الأصلي:</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                          <div>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">العنوان الأصلي:</p>
                                            <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 p-2 rounded">
                                              {submission.original_title}
                                            </p>
                                          </div>
                                          
                                          {submission.original_author && (
                                            <div>
                                              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">المؤلف الأصلي:</p>
                                              <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 p-2 rounded">
                                                {submission.original_author}
                                              </p>
                                            </div>
                                          )}
                                          
                                          {submission.original_category && (
                                            <div>
                                              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">التصنيف الأصلي:</p>
                                              <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 p-2 rounded">
                                                {getCategoryLabel(submission.original_category)}
                                              </p>
                                            </div>
                                          )}
                                          
                                          {submission.original_language && (
                                            <div>
                                              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">اللغة الأصلية:</p>
                                              <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 p-2 rounded">
                                                {submission.original_language}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {submission.original_description && (
                                          <div className="mb-4">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">الوصف الأصلي:</p>
                                            <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 p-2 rounded max-h-20 overflow-y-auto">
                                              {submission.original_description}
                                            </p>
                                          </div>
                                        )}
                                        
                                         {/* ملخص التغييرات المفصل */}
                                         {submission.changes_summary && (
                                           <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
                                             <h5 className="font-semibold text-xs text-blue-800 dark:text-blue-200 mb-3">التغييرات المطلوبة:</h5>
                                             
                                             <div className="space-y-3">
                                               {/* تغيير العنوان */}
                                               {submission.changes_summary.title_changed && (
                                                 <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300 text-orange-700">
                                                       تغيير العنوان
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديم:</span>
                                                       <span className="text-gray-800 dark:text-gray-200 mr-2">{submission.original_title}</span>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-orange-600 dark:text-orange-400">الجديد:</span>
                                                       <span className="text-orange-800 dark:text-orange-200 mr-2">{submission.title}</span>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير المؤلف */}
                                               {submission.changes_summary.author_changed && (
                                                 <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300 text-orange-700">
                                                       تغيير المؤلف
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديم:</span>
                                                       <span className="text-gray-800 dark:text-gray-200 mr-2">{submission.original_author}</span>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-orange-600 dark:text-orange-400">الجديد:</span>
                                                       <span className="text-orange-800 dark:text-orange-200 mr-2">{submission.author}</span>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير الوصف */}
                                               {submission.changes_summary.description_changed && (
                                                 <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300 text-orange-700">
                                                       تغيير الوصف
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديم:</span>
                                                       <div className="text-gray-800 dark:text-gray-200 mr-2 mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-16 overflow-y-auto">
                                                         {submission.original_description}
                                                       </div>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-orange-600 dark:text-orange-400">الجديد:</span>
                                                       <div className="text-orange-800 dark:text-orange-200 mr-2 mt-1 p-2 bg-orange-100 dark:bg-orange-800/30 rounded max-h-16 overflow-y-auto">
                                                         {submission.description}
                                                       </div>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير التصنيف */}
                                               {submission.changes_summary.category_changed && (
                                                 <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300 text-orange-700">
                                                       تغيير التصنيف
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديم:</span>
                                                       <span className="text-gray-800 dark:text-gray-200 mr-2">{getCategoryLabel(submission.original_category || '')}</span>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-orange-600 dark:text-orange-400">الجديد:</span>
                                                       <span className="text-orange-800 dark:text-orange-200 mr-2">{getCategoryLabel(submission.category || '')}</span>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير اللغة */}
                                               {submission.changes_summary.language_changed && (
                                                 <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300 text-orange-700">
                                                       تغيير اللغة
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديمة:</span>
                                                       <span className="text-gray-800 dark:text-gray-200 mr-2">{submission.original_language}</span>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-orange-600 dark:text-orange-400">الجديدة:</span>
                                                       <span className="text-orange-800 dark:text-orange-200 mr-2">{submission.language}</span>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير سنة النشر */}
                                               {submission.changes_summary.publication_year_changed && (
                                                 <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-yellow-100 border-yellow-300 text-yellow-700">
                                                       تغيير سنة النشر
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديمة:</span>
                                                       <span className="text-gray-800 dark:text-gray-200 mr-2">{submission.original_publication_year || 'غير محدد'}</span>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-yellow-600 dark:text-yellow-400">الجديدة:</span>
                                                       <span className="text-yellow-800 dark:text-yellow-200 mr-2">{submission.publication_year || 'غير محدد'}</span>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير عدد الصفحات */}
                                               {submission.changes_summary.page_count_changed && (
                                                 <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-green-100 border-green-300 text-green-700">
                                                       تغيير عدد الصفحات
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديم:</span>
                                                       <span className="text-gray-800 dark:text-gray-200 mr-2">{submission.original_page_count || 'غير محدد'}</span>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-green-600 dark:text-green-400">الجديد:</span>
                                                       <span className="text-green-800 dark:text-green-200 mr-2">{submission.page_count || 'غير محدد'}</span>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير نوع العرض */}
                                               {submission.changes_summary.display_type_changed && (
                                                 <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                                                   <div className="flex items-center gap-2 mb-2">
                                                     <Badge variant="outline" className="text-xs bg-indigo-100 border-indigo-300 text-indigo-700">
                                                       تغيير نوع العرض
                                                     </Badge>
                                                   </div>
                                                   <div className="grid grid-cols-1 gap-2 text-xs">
                                                     <div>
                                                       <span className="font-semibold text-gray-600 dark:text-gray-400">القديم:</span>
                                                       <span className="text-gray-800 dark:text-gray-200 mr-2">{getDisplayTypeLabel(submission.original_display_type || '')}</span>
                                                     </div>
                                                     <div>
                                                       <span className="font-semibold text-indigo-600 dark:text-indigo-400">الجديد:</span>
                                                       <span className="text-indigo-800 dark:text-indigo-200 mr-2">{getDisplayTypeLabel(submission.display_type || '')}</span>
                                                     </div>
                                                   </div>
                                                 </div>
                                               )}

                                               {/* تغيير صورة الغلاف */}
                                               {submission.changes_summary.cover_changed && (
                                                 <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                                   <Badge variant="outline" className="text-xs bg-purple-100 border-purple-300 text-purple-700 mb-2">
                                                     تغيير صورة الغلاف
                                                   </Badge>
                                                   <p className="text-xs text-purple-700 dark:text-purple-300">تم رفع صورة غلاف جديدة</p>
                                                 </div>
                                               )}

                                               {/* تغيير ملف الكتاب */}
                                               {submission.changes_summary.file_changed && (
                                                 <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                                   <Badge variant="outline" className="text-xs bg-red-100 border-red-300 text-red-700 mb-2">
                                                     تغيير ملف الكتاب
                                                   </Badge>
                                                   <p className="text-xs text-red-700 dark:text-red-300">تم رفع ملف كتاب جديد</p>
                                                 </div>
                                               )}

                                               {/* إذا لم تكن هناك تغييرات */}
                                               {!Object.values(submission.changes_summary).some(Boolean) && (
                                                 <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                                                   <Badge variant="outline" className="text-xs bg-gray-100 border-gray-300 text-gray-700">
                                                     لا توجد تغييرات محددة
                                                   </Badge>
                                                 </div>
                                               )}
                                             </div>
                                           </div>
                                         )}
                                      </div>
                                    )}
                                 </div>
                               </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">التصنيف:</span>
                                  <span>{getCategoryLabel(submission.category || 'other')}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">اللغة:</span>
                                  <span>{submission.language || 'غير محدد'}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">سنة النشر:</span>
                                  <span>{submission.publication_year || 'غير محدد'}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">عدد الصفحات:</span>
                                  <span>{submission.page_count || 'غير محدد'}</span>
                                </div>
                                
                                {submission.publisher && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Building className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">الناشر:</span>
                                    <span>{submission.publisher}</span>
                                  </div>
                                )}
                                
                                {submission.translator && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">المترجم:</span>
                                    <span>{submission.translator}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-3 mb-4">
                                <div className="text-sm">
                                  <span className="font-semibold">نوع العرض:</span> {getDisplayTypeLabel(submission.display_type || 'غير محدد')}
                                </div>
                                
                                <div className="text-sm">
                                  <span className="font-semibold">نوع الملف:</span> {getFileTypeLabel(submission.file_type || 'غير محدد')}
                                </div>
                                
                                <div className="text-sm">
                                  <span className="font-semibold">تأكيد الحقوق:</span> 
                                  <Badge variant={submission.rights_confirmation ? "default" : "destructive"} className="ml-2">
                                    {submission.rights_confirmation ? "مؤكد" : "غير مؤكد"}
                                  </Badge>
                                </div>
                                
                                 <div className="text-sm">
                                   <span className="font-semibold">تاريخ الرفع:</span> {formatDate(submission.created_at)}
                                 </div>
                                 
                                 {submission.edit_requested_at && (
                                   <div className="text-sm">
                                     <span className="font-semibold">تاريخ طلب التعديل:</span> {formatDate(submission.edit_requested_at)}
                                   </div>
                                 )}
                                
                                <div className="text-sm">
                                  <span className="font-semibold">المستخدم:</span> {submission.profiles?.username || submission.user_email || 'مستخدم'}
                                </div>
                              </div>
                              
                              {submission.description && (
                                <div className="mb-4">
                                  <span className="font-semibold text-sm block mb-2">وصف الكتاب:</span>
                                  <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    {submission.description}
                                  </div>
                                </div>
                              )}
                              
                              {submission.reviewer_notes && (
                                <div className="mb-4">
                                  <span className="font-semibold text-sm block mb-2">ملاحظات المراجع:</span>
                                  <div className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    {submission.reviewer_notes}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex flex-wrap gap-2 mt-6">
                                {(activeTab === 'pending' || activeTab === 'pending_edit') && (
                                  <>
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      onClick={() => updateBookSubmissionStatus(submission.id, 'approve')}
                                      disabled={processingBookId === submission.id}
                                    >
                                      {processingBookId === submission.id ? (
                                        <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="ml-1 h-4 w-4" />
                                      )}
                                      {activeTab === 'pending_edit' ? 'قبول التعديلات' : 'موافقة'}
                                    </Button>
                                    
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleRejectBook(submission.id, submission.title)}
                                      disabled={processingBookId === submission.id}
                                    >
                                      {processingBookId === submission.id ? (
                                        <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                                      ) : (
                                        <XCircle className="ml-1 h-4 w-4" />
                                      )}
                                      {activeTab === 'pending_edit' ? 'رفض التعديلات' : 'رفض'}
                                    </Button>
                                  </>
                                )}
                                
                                {submission.book_file_url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(submission.book_file_url!, '_blank')}
                                  >
                                    <Eye className="ml-1 h-4 w-4" />
                                    عرض الملف
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                   <div className="text-center py-12 bg-muted/20 rounded-lg">
                     <p className="text-muted-foreground text-lg mb-2">
                       لا توجد طلبات كتب {
                         activeTab === 'pending' ? "قيد الانتظار" : 
                         activeTab === 'pending_edit' ? "قيد مراجعة التعديلات" : 
                         "مرفوضة"
                       } حالياً
                     </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      تأكد من أن هناك كتب مرفوعة بحالة "{activeTab}" في قاعدة البيانات
                    </p>
                    <Button 
                      onClick={() => fetchBookSubmissions(activeTab)} 
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="ml-2 h-4 w-4" />
                      إعادة تحديث
                    </Button>
                  </div>
                )
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />

      {/* نافذة رفض الكتاب */}
      <BookRejectionDialog
        isOpen={rejectionDialog.isOpen}
        onClose={handleCloseRejectionDialog}
        onConfirm={handleConfirmRejection}
        bookTitle={rejectionDialog.bookTitle}
        isLoading={processingBookId === rejectionDialog.bookId}
      />
    </div>
  );
};

export default AdminBooks;
