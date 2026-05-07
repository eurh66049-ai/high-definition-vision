import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, Image, FileText, Check, AlertCircle, BookOpen, Clock, User, CheckCircle, RefreshCw, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAuthorSearch } from '@/hooks/useAuthorSearch';
import { useAuthorSuggestions } from '@/hooks/useAuthorSuggestions';
import MobileUploadGuidance from '@/components/upload/MobileUploadGuidance';
import AuthorSuggestions from '@/components/books/AuthorSuggestions';
import { mobileOptimizer } from '@/utils/mobileUploadOptimizer';


// تم إزالة دالة normalizeAuthorBio


const BOOK_CATEGORIES = [
  { value: 'novels', label: 'روايات' },
  { value: 'philosophy-culture', label: 'الفكر والثقافة العامة' },
  { value: 'islamic-sciences', label: 'العلوم الإسلامية' },
  { value: 'story-collections', label: 'مجموعة قصص' },
  { value: 'poetry', label: 'الشعر' },
  { value: 'texts-essays', label: 'نصوص وخواطر' },
  { value: 'literature', label: 'الأدب' },
  { value: 'history-civilizations', label: 'التاريخ والحضارات' },
  { value: 'human-development', label: 'التنمية البشرية وتطوير الذات' },
  { value: 'memoirs-autobiographies', label: 'مذكرات وسير ذاتية' },
  { value: 'philosophy-logic', label: 'الفلسفة والمنطق' },
  { value: 'politics', label: 'السياسية' },
  { value: 'children', label: 'الأطفال' },
  { value: 'studies-research', label: 'دراسات وبحوث' },
  { value: 'religion', label: 'الأديان' },
  { value: 'plays-arts', label: 'مسرحيات وفنون' },
  { value: 'psychology', label: 'علم النفس' },
  { value: 'education-pedagogy', label: 'التعليم والتربية' },
  { value: 'love-relationships', label: 'الحب والعلاقات' },
  { value: 'interpretations', label: 'التفاسير' },
  { value: 'prophetic-biography', label: 'السيرة النبوية' },
  { value: 'successors-followers', label: 'سيرة الخلفاء والتابعين' },
  { value: 'marketing-business', label: 'التسويق وإدارة الأعمال' },
  { value: 'sciences', label: 'العلوم' },
  { value: 'arabic-learning', label: 'تعلم اللغة العربية' },
  { value: 'womens-culture', label: 'ثقافة المرأة' },
  { value: 'translation-dictionaries', label: 'الترجمة ومعاجم' },
  { value: 'prophets-stories', label: 'قصص الأنبياء' },
  { value: 'economics', label: 'الإقتصاد' },
  { value: 'sociology', label: 'علم الإجتماع' },
  { value: 'sufism', label: 'الصوفية' },
  { value: 'english-learning', label: 'تعلم اللغة الإنجليزية' },
  { value: 'medicine-nursing', label: 'الطب والتمريض' },
  { value: 'communication-media', label: 'التواصل والإعلام' },
  { value: 'nutrition', label: 'التغذية' },
  { value: 'law', label: 'القانون' },
  { value: 'programming', label: 'البرمجة' },
  { value: 'alternative-medicine', label: 'الأعشاب والطب البديل' },
  { value: 'mathematics', label: 'الرياضة' },
  { value: 'computer-science', label: 'علوم الحاسوب' },
  { value: 'french-learning', label: 'تعلم اللغة الفرنسية' },
  { value: 'military-sciences', label: 'الحرب والعلوم العسكرية' },
  { value: 'spanish-learning', label: 'تعلم اللغة الإسبانية' },
  { value: 'photography', label: 'التصوير الفوتوغرافي' },
  { value: 'cooking', label: 'الطبخ' },
  { value: 'magazines', label: 'مجلات' },
  { value: 'dream-interpretation', label: 'تفاسير الأحلام' },
  { value: 'encyclopedias', label: 'المصاحف' },
  { value: 'german-learning', label: 'تعلم اللغة الألمانية' }
];

const LANGUAGES = [
  'العربية',
  'الإنجليزية',
  'الفرنسية',
  'الألمانية',
  'الإسبانية',
  'أخرى'
];

interface BookSubmissionFormProps {
  onSuccess?: () => void;
}

const BookSubmissionForm: React.FC<BookSubmissionFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    author: '',
    category: '',
    publisher: '',
    translator: '',
    description: '',
    publicationYear: '',
    pageCount: '',
    language: '',
    displayType: 'download_read' // القيمة الافتراضية
  });

  const [isCheckingBook, setIsCheckingBook] = useState(false);
  const [bookExists, setBookExists] = useState(false);
  const [existingBookDetails, setExistingBookDetails] = useState<{
    book_title: string;
    book_author: string;
    book_category: string;
    source_type: string;
    created_date: string;
  } | null>(null);

  const { authorData, isSearching, found } = useAuthorSearch(formData.author);
  const { suggestions, isLoading: isSuggestionsLoading } = useAuthorSuggestions(formData.author);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [authorExplicitlySelected, setAuthorExplicitlySelected] = useState(false);
  

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookFileInfo, setBookFileInfo] = useState<{
    size: number;
    formattedSize: string;
    name: string;
  } | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [rightsConfirmation, setRightsConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadStep, setCurrentUploadStep] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: boolean}>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [originalBookId, setOriginalBookId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // ميزة استخراج النص وتوليد الوصف بالذكاء الاصطناعي
  const [extractedBookText, setExtractedBookText] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionGenerated, setDescriptionGenerated] = useState(false);
  const [currentFileHash, setCurrentFileHash] = useState<string | null>(null);

  // حفظ بيانات الملفات الموجودة عند التعديل
  const [existingFiles, setExistingFiles] = useState<{
    coverImageUrl: string | null;
    bookFileUrl: string | null;
  }>({
    coverImageUrl: null,
    bookFileUrl: null
  });

  // تم إزالة finalResultMessage لأن الإشعارات تظهر في قسم الإشعارات

  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    environment: string;
    userAgent: string;
    connection: string;
    isNetlify: boolean;
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
  } | null>(null);

  useEffect(() => {
    const collectDiagnostics = () => {
      const isNetlify = window.location.hostname.includes('netlify') || window.location.hostname.includes('.app');
      const userAgent = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);

      const info = {
        environment: isNetlify ? 'production' : 'development',
        userAgent,
        connection: (navigator as any).connection?.effectiveType || 'unknown',
        isNetlify,
        isMobile,
        isIOS,
        isAndroid
      };
      setDiagnosticInfo(info);
      console.log('🔍 معلومات التشخيص:', info);
    };

    collectDiagnostics();
  }, []);

  // تنظيف URL objects لتجنب تسريب الذاكرة (فقط للملفات المحلية)
  useEffect(() => {
    return () => {
      // تنظيف فقط إذا كانت روابط محلية وليست روابط خارجية
      if (coverImagePreview && coverImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  // تحميل المسودة الموجودة عند فتح النموذج
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const editApprovedId = urlParams.get('edit-approved');
    
    // لا تحمل المسودة إذا كان المستخدم يعدل كتاباً موجوداً
    if (editId || editApprovedId || !user?.id) return;

    const loadDraft = async () => {
      try {
        const { data, error } = await supabase
          .from('book_submissions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('خطأ في تحميل المسودة:', error);
          return;
        }

        if (data) {
          setDraftId(data.id);
          setFormData({
            title: data.title || '',
            subtitle: data.subtitle || '',
            author: data.author || '',
            category: data.category || '',
            publisher: data.publisher || '',
            translator: data.translator || '',
            description: data.description || '',
            publicationYear: data.publication_year?.toString() || '',
            pageCount: data.page_count?.toString() || '',
            language: data.language || '',
            displayType: data.display_type || 'download_read'
          });

          if (data.cover_image_url) {
            setCoverImagePreview(data.cover_image_url);
            setExistingFiles(prev => ({ ...prev, coverImageUrl: data.cover_image_url }));
          }
          if (data.book_file_url) {
            setExistingFiles(prev => ({ ...prev, bookFileUrl: data.book_file_url }));
            if (data.file_size) {
              setBookFileInfo({
                size: data.file_size,
                formattedSize: formatFileSize(data.file_size),
                name: (data.file_metadata as any)?.originalName || 'ملف المسودة'
              });
            }
          }
          if (data.author) {
            setAuthorExplicitlySelected(true);
          }

          setDraftLoaded(true);
          toast.info('📝 تم استعادة المسودة المحفوظة', {
            description: 'يمكنك متابعة ملء البيانات من حيث توقفت',
            duration: 4000
          });
          console.log('✅ تم تحميل المسودة:', data.id);
        }
      } catch (err) {
        console.error('خطأ في تحميل المسودة:', err);
      }
    };

    loadDraft();
  }, [user?.id]);

  // تحميل بيانات الكتاب عند التعديل
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const editApprovedId = urlParams.get('edit-approved');

    if (editId && user?.id) {
      loadBookForEdit(editId, false);
    } else if (editApprovedId && user?.id) {
      loadBookForEdit(editApprovedId, true);
    }
  }, [user?.id]);

  // دالة لاستخراج نوع الملف من الامتداد
  const getFileTypeFromExtension = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'txt': return 'txt';
      default: return 'pdf';
    }
  };

  const loadBookForEdit = async (bookId: string, isApproved: boolean = false) => {
    try {
      const query = supabase
        .from('book_submissions')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', user?.id);
      
      // للكتب المعتمدة أو قيد المراجعة
      if (!isApproved) {
        query.eq('status', 'pending');
      } else {
        query.eq('status', 'approved');
      }
      
      const { data: bookData, error } = await query.single();

      if (error) {
        console.error('خطأ في تحميل بيانات الكتاب:', error);
        if (error.code === 'PGRST116') {
          toast.error('لا يمكن تعديل هذا الكتاب', {
            description: isApproved ? 'لا يمكن العثور على الكتاب المعتمد' : 'يمكن تعديل الكتب قيد المراجعة فقط'
          });
          navigate('/my-books');
          return;
        }
        toast.error('خطأ في تحميل بيانات الكتاب للتعديل');
        return;
      }

      if (bookData) {
        // ملء النموذج ببيانات الكتاب المحملة
        setFormData({
          title: bookData.title || '',
          subtitle: bookData.subtitle || '',
          author: bookData.author || '',
          category: bookData.category || '',
          publisher: bookData.publisher || '',
          translator: bookData.translator || '',
          description: bookData.description || '',
          publicationYear: bookData.publication_year?.toString() || '',
          pageCount: bookData.page_count?.toString() || '',
          language: bookData.language || '',
          displayType: bookData.display_type || 'download_read'
        });

        // حفظ بيانات الملفات الموجودة للاحتفاظ بها عند التعديل مع معلومات إضافية
        setExistingFiles({
          coverImageUrl: bookData.cover_image_url || null,
          bookFileUrl: bookData.book_file_url || null
        });

        // عرض صورة الغلاف الموجودة عند التعديل
        if (bookData.cover_image_url) {
          setCoverImagePreview(bookData.cover_image_url);
        }

        // تحديث معلومات الملف إذا كان موجوداً
        if (bookData.book_file_url && bookData.file_size) {
          const metadata = bookData.file_metadata as any;
          setBookFileInfo({
            size: bookData.file_size,
            formattedSize: formatFileSize(bookData.file_size),
            name: metadata?.originalName || 'الملف الموجود'
          });
        }

        // إذا كان هناك مؤلف محفوظ، اعتبره مختار صراحة
        if (bookData.author) {
          setAuthorExplicitlySelected(true);
        }

        // تعيين معرف الكتاب الأصلي وحالة التعديل
        if (isApproved) {
          setIsEditingApproved(true);
          setOriginalBookId(bookData.id);
        }

        console.log('تم تحميل بيانات الكتاب للتعديل:', {
          id: bookData.id,
          title: bookData.title,
          author: bookData.author,
          fileSize: bookData.file_size,
          status: bookData.status,
          isApproved
        });
        
        console.log('الملفات الموجودة:', {
          coverImageUrl: bookData.cover_image_url,
          bookFileUrl: bookData.book_file_url,
          fileSize: bookData.file_size
        });
        
        toast.success('تم تحميل بيانات الكتاب للتعديل', {
          description: isApproved 
            ? 'يمكنك الآن تعديل الكتاب المعتمد. سيتم إرسال التعديلات للمراجعة.' 
            : 'يمكنك الآن تعديل المعلومات أو الملفات حسب الحاجة'
        });
      }
    } catch (error) {
      console.error('خطأ في تحميل الكتاب:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الكتاب');
    }
  };

  // تم إزالة كود التحقق من رسائل الحالة لأن الإشعارات تظهر في قسم الإشعارات

  // تم إزالة كود الاستماع لرسائل الحالة لأن الإشعارات تظهر في قسم الإشعارات

  // تم حذف useEffect التلقائي لملء بيانات المؤلف
  // سيتم ملء البيانات فقط عند الضغط على المؤلف من قائمة الاقتراحات

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      author: '',
      category: '',
      publisher: '',
      translator: '',
      description: '',
      publicationYear: '',
      pageCount: '',
      language: '',
      displayType: 'download_read'
    });
    setCoverFile(null);
    setBookFile(null);
    setBookFileInfo(null);
    setCoverImagePreview(null);
    setRightsConfirmation(false);
    setErrors([]);
    setBookExists(false);
    setExistingBookDetails(null);
    setIsCheckingBook(false);
    setExistingFiles({
      coverImageUrl: null,
      bookFileUrl: null
    });
    setAuthorExplicitlySelected(false);
    setDraftId(null);
    setDraftLoaded(false);
    setExtractedBookText(null);
    setIsGeneratingDescription(false);
    setDescriptionGenerated(false);
    setCurrentFileHash(null);
  };

  const handleStartNewSubmission = () => {
    resetForm();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // مسح الأخطاء عندما يبدأ المستخدم في الكتابة
    if (errors.length > 0 || fieldErrors[field]) {
      setErrors([]);
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }

    if ((field === 'title' || field === 'author') && bookExists) {
      setBookExists(false);
      setExistingBookDetails(null);
    }

    // إذا غير المستخدم اسم المؤلف، اعتبر أنه لم يعد يختار من القائمة
    if (field === 'author') {
      setAuthorExplicitlySelected(false);
      // لا نحتاج لمسح أي شيء آخر، فقط تحديث اسم المؤلف
      setFormData(prev => ({ ...prev, [field]: value }));
      return; // إنهاء الدالة هنا لتجنب التحديث المزدوج
    }
  };

  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes >= 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (sizeInBytes >= 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (sizeInBytes >= 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    }
    return `${sizeInBytes} B`;
  };

  // 🔐 حساب بصمة الملف (SHA-256) لتمييز الملفات بشكل فريد
  const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleBookFileSelection = async (file: File | null) => {
    setBookFile(file);
    // إعادة تعيين حالة توليد الوصف عند تغيير الملف
    setDescriptionGenerated(false);
    setExtractedBookText(null);
    setCurrentFileHash(null);

    if (file) {
      // التحقق من حجم الملف - الحد الأقصى 50MB
      const maxFileSize = 50 * 1024 * 1024; // 50 ميجابايت
      if (file.size > maxFileSize) {
        toast.error("حجم الملف كبير جداً", {
          description: `حجم الملف ${formatFileSize(file.size)}. الحد الأقصى المسموح هو 50 ميجابايت`
        });
        setBookFile(null);
        setBookFileInfo(null);
        return;
      }

      // تحسين التحقق من نوع الملف ليكون متوافقاً مع جميع الأجهزة والهواتف
      const allowedExtensions = ['pdf', 'docx', 'txt', 'doc'];
      const fileExt = file.name.split('.').pop()?.toLowerCase() ?? "";

      // تحقق إضافي من نوع MIME للهواتف والأجهزة المختلفة
      const isMobileDevice = diagnosticInfo?.isMobile || false;
      const isValidFileExtension = allowedExtensions.includes(fileExt);
      const isValidMimeType = [
        'application/pdf',
        'application/x-pdf', 
        'text/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ].includes(file.type);
      
      // للهواتف والأجهزة التي قد لا ترسل MIME type صحيح
      const isEmptyMimeButValidExt = file.type === '' && isValidFileExtension;
      
      const isValidFile = isValidFileExtension || isValidMimeType || isEmptyMimeButValidExt;

      if (!isValidFile) {
        console.log('تفاصيل الملف المرفوض:', {
          name: file.name,
          type: file.type,
          extension: fileExt,
          isMobile: isMobileDevice
        });

        toast.error("نوع ملف غير مدعوم", {
          description: "يرجى اختيار ملف صالح (PDF, DOC, DOCX, TXT)"
        });
        setBookFile(null);
        setBookFileInfo(null);
        return;
      }

      // فحص إضافي للملفات المتضررة أو الفارغة (شائع في الهواتف)
      if (file.size === 0) {
        toast.error("الملف فارغ أو تالف", {
          description: isMobileDevice ? 
            "جرب اختيار الملف مرة أخرى أو تحقق من عدم تضرر الملف" :
            "يرجى اختيار ملف صحيح"
        });
        setBookFile(null);
        setBookFileInfo(null);
        return;
      }

      // فحص حالة الذاكرة للهواتف
      if (isMobileDevice) {
        const memoryStatus = mobileOptimizer.checkMemoryStatus();
        if (!memoryStatus.available) {
          toast.error("ذاكرة الجهاز ممتلئة", {
            description: memoryStatus.warning || "أغلق تطبيقات أخرى وأعد المحاولة"
          });
          setBookFile(null);
          setBookFileInfo(null);
          return;
        }
      }

      const fileInfo = {
        size: file.size,
        formattedSize: formatFileSize(file.size),
        name: file.name
      };

      setBookFileInfo(fileInfo);

      console.log('تم اختيار ملف PDF بنجاح:', {
        name: file.name,
        size: file.size,
        formattedSize: fileInfo.formattedSize,
        type: file.type,
        device: isMobileDevice ? 'هاتف' : 'كمبيوتر'
      });

      // تحذيرات ونصائح محسنة للهواتف وجميع الملفات
      if (file.size > 100 * 1024 * 1024) { // تحذير للملفات أكبر من 100MB
        const advice = isMobileDevice ? 
          "للهواتف: تأكد من اتصال WiFi قوي، أغلق التطبيقات الأخرى، ولا تغلق المتصفح أثناء الرفع. يمكن رفع ملفات بأي حجم!" :
          "يمكن رفع ملفات بأي حجم - قد يستغرق وقتاً أطول";

        toast.info(`📁 ملف كبير: ${fileInfo.formattedSize}`, {
          description: advice,
          duration: isMobileDevice ? 15000 : 10000
        });
      } else if (file.size > 50 * 1024 * 1024 && isMobileDevice) {
        toast.info("💡 نصيحة للهواتف", {
          description: "تأكد من اتصال WiFi مستقر لضمان رفع ناجح",
          duration: 6000
        });
      }
    } else {
      setBookFileInfo(null);
    }

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const createImagePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const handleFileChange = (type: 'cover' | 'book', file: File | null) => {
    if (type === 'cover') {
      if (file && file.size > 10 * 1024 * 1024) {
        toast.error(`حجم صورة الغلاف كبير جداً: ${formatFileSize(file.size)}`, {
          description: "الحد الأقصى المسموح هو 10 ميجابايت"
        });
        return;
      }

      // إنشاء معاينة لصورة الغلاف
      if (file) {
        const previewUrl = createImagePreview(file);
        setCoverImagePreview(previewUrl);
      } else {
        setCoverImagePreview(null);
      }
      setCoverFile(file);
    } else if (type === 'book') {
      handleBookFileSelection(file);
    }
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleRightsConfirmationChange = (checked: boolean | "indeterminate") => {
    setRightsConfirmation(checked === true);
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // 🤖 توليد وصف الكتاب من ملف الكتاب باستخدام Mistral OCR + AI
  const handleGenerateDescriptionFromFile = async () => {
    if (!bookFile) {
      toast.error('لا يوجد ملف كتاب', {
        description: 'يرجى اختيار ملف الكتاب أولاً لاستخراج النص منه'
      });
      return;
    }

    // إذا تم توليد وصف بالفعل لنفس الملف، لا تكرر العملية
    if (descriptionGenerated) {
      toast.info('تم توليد الوصف بالفعل لهذا الملف');
      return;
    }

    if (formData.description.trim().length > 0) {
      const confirmReplace = window.confirm('يوجد وصف بالفعل. هل تريد استبداله بالوصف المولد بالذكاء الاصطناعي؟');
      if (!confirmReplace) return;
    }

    setIsGeneratingDescription(true);
    const loadingToastId = toast.loading('🤖 جاري توليد الوصف...');

    try {
      // 1️⃣ حساب بصمة الملف للتحقق من الكاش في Supabase
      const fileHash = await computeFileHash(bookFile);
      setCurrentFileHash(fileHash);

      // 2️⃣ البحث في Supabase عن نص مستخرج مسبقاً لنفس الملف
      const { data: cachedRows } = await supabase
        .from('book_extracted_text')
        .select('extracted_text')
        .eq('file_hash', fileHash)
        .eq('extraction_status', 'completed')
        .not('extracted_text', 'is', null)
        .limit(1);

      const cachedText = cachedRows?.[0]?.extracted_text;

      if (cachedText && cachedText.length > 100) {
        // ✅ النص موجود مسبقاً — نولد الوصف فقط من النص المخزّن (بدون OCR) عبر JSON
        console.log(`♻️ استخدام النص المستخرج مسبقاً (${cachedText.length} حرف)`);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/extract-text-and-generate-description`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cachedText,
            bookTitle: formData.title.trim(),
            bookAuthor: formData.author.trim(),
            bookCategory: formData.category,
            bookLanguage: formData.language || 'العربية',
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'فشل توليد الوصف من النص المخزّن');
        }

        setFormData(prev => ({ ...prev, description: result.description }));
        setExtractedBookText(cachedText);
        setFieldErrors(prev => ({ ...prev, description: false }));
        setDescriptionGenerated(true);

        toast.dismiss(loadingToastId);
        toast.success('تم توليد الوصف بنجاح');
        return;
      }

      // 3️⃣ لا يوجد نص مخزّن — نقوم بالاستخراج الكامل عبر OCR
      const fd = new FormData();
      fd.append('file', bookFile);
      fd.append('bookTitle', formData.title.trim());
      fd.append('bookAuthor', formData.author.trim());
      fd.append('bookCategory', formData.category);
      fd.append('bookLanguage', formData.language || 'العربية');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || (await supabase.auth.getSession()).data.session?.access_token;

      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token || supabaseAnonKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/extract-text-and-generate-description`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
        body: fd,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'فشل توليد الوصف');
      }

      setFormData(prev => ({ ...prev, description: result.description }));
      setExtractedBookText(result.extractedText || null);
      setFieldErrors(prev => ({ ...prev, description: false }));
      setDescriptionGenerated(true);

      // 4️⃣ حفظ النص المستخرج في Supabase مع بصمة الملف (كاش لإعادة الاستخدام لاحقاً)
      if (result.extractedText) {
        try {
          await supabase.from('book_extracted_text').insert({
            file_hash: fileHash,
            extracted_text: result.extractedText,
            text_length: result.extractedText.length,
            extraction_status: 'completed',
          });
          console.log(`💾 تم حفظ النص المستخرج في الكاش (hash: ${fileHash.substring(0, 12)}...)`);
        } catch (cacheErr) {
          console.warn('⚠️ فشل حفظ نص الكاش (غير حرج):', cacheErr);
        }
      }

      toast.dismiss(loadingToastId);
      toast.success('تم توليد الوصف بنجاح');
    } catch (error: any) {
      console.error('خطأ في توليد الوصف:', error);
      toast.dismiss(loadingToastId);
      toast.error('فشل توليد الوصف', {
        description: error.message || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى'
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };



  const checkBookExists = async (title: string, author: string) => {
    if (!title.trim() || !author.trim()) {
      setBookExists(false);
      setExistingBookDetails(null);
      return;
    }

    if (title.trim().length < 3 || author.trim().length < 3) {
      setBookExists(false);
      setExistingBookDetails(null);
      return;
    }

    // التحقق من وضع التعديل
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const editApprovedId = urlParams.get('edit-approved');
    const isEdit = editId !== null || editApprovedId !== null;

    setIsCheckingBook(true);
    console.log('بدء التحقق من الكتاب:', { title: title.trim(), author: author.trim(), isEdit, editId, editApprovedId });

    try {
      // البحث في الكتب المعتمدة مع استثناء الكتاب المُعدَّل إذا كان معتمداً
      let approvedQuery = supabase
        .from('approved_books')
        .select('id, title, author, category, created_at')
        .eq('is_active', true)
        .ilike('title', title.trim())
        .ilike('author', author.trim());

      // إذا كان المستخدم يعدل كتاب معتمد، استثني ذلك الكتاب من البحث
      if (editApprovedId) {
        approvedQuery = approvedQuery.neq('id', editApprovedId);
      }

      const { data: approvedBooks, error: approvedError } = await approvedQuery;

      if (approvedError) {
        console.error('خطأ في البحث في الكتب المعتمدة:', approvedError);
      }

      // عند التعديل، استثني الكتاب الحالي من البحث
      let pendingQuery = supabase
        .from('book_submissions')
        .select('id, title, author, category, created_at, user_id')
        .eq('status', 'pending')
        .ilike('title', title.trim())
        .ilike('author', author.trim());

      if (isEdit && (editId || editApprovedId)) {
        const currentEditId = editId || editApprovedId;
        pendingQuery = pendingQuery.neq('id', currentEditId);
      }

      const { data: pendingBooks, error: pendingError } = await pendingQuery;

      if (pendingError) {
        console.error('خطأ في البحث في الطلبات المعلقة:', pendingError);
      }

      const foundApproved = approvedBooks && approvedBooks.length > 0;
      const foundPending = pendingBooks && pendingBooks.length > 0;

      console.log('نتائج التحقق:', { foundApproved, foundPending, isEdit, editId: editId || editApprovedId });

      if (foundApproved || foundPending) {
        const foundBook = foundApproved ? approvedBooks[0] : pendingBooks[0];
        const sourceType = foundApproved ? 'approved' : 'pending';

        // في وضع التعديل، لا نعتبره كتاباً مكرراً إذا كان الكتاب المعثور عليه هو نفسه المُعدَّل
        const isEditingSameBook = isEdit && 
          ((editId && (foundBook as any).id === editId) || 
           (editApprovedId && (foundBook as any).id === editApprovedId) ||
           (sourceType === 'pending' && (foundBook as any).user_id === user?.id && editId));

        console.log('تفاصيل التحقق:', {
          foundBookId: (foundBook as any).id,
          editId,
          editApprovedId,
          isEditingSameBook,
          sourceType
        });

        if (!isEditingSameBook) {
          setBookExists(true);
          setExistingBookDetails({
            book_title: foundBook.title,
            book_author: foundBook.author,
            book_category: foundBook.category,
            source_type: sourceType,
            created_date: foundBook.created_at
          });

          console.log('تم العثور على كتاب مطابق:', foundBook);
          toast.error("⚠️ كتاب موجود مسبقاً!", {
            description: `يوجد كتاب بعنوان "${foundBook.title}" للمؤلف "${foundBook.author}" في النظام`
          });
        } else {
          // في وضع التعديل لنفس الكتاب، لا نعتبره كتاباً مكرراً
          setBookExists(false);
          setExistingBookDetails(null);
          console.log('تعديل نفس الكتاب - يمكن المتابعة');
        }

      } else {
        setBookExists(false);
        setExistingBookDetails(null);
        console.log('لا يوجد كتاب مطابق - يمكن المتابعة');
      }

    } catch (error) {
      console.error('خطأ غير متوقع في التحقق من الكتاب:', error);
      toast.error("خطأ في التحقق من الكتاب", {
        description: "يرجى المحاولة مرة أخرى"
      });
    } finally {
      setIsCheckingBook(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.title && formData.author && 
          formData.title.trim().length >= 3 && formData.author.trim().length >= 3) {
        checkBookExists(formData.title, formData.author);
      } else {
        setBookExists(false);
        setExistingBookDetails(null);
        setIsCheckingBook(false);
      }
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [formData.title, formData.author]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    const newFieldErrors: {[key: string]: boolean} = {};
    let firstMissingField: string | null = null;

    // التحقق من الحقول الإلزامية مع تحديد أول حقل مفقود
    if (!formData.title.trim()) {
      newErrors.push('عنوان الكتاب مطلوب');
      newFieldErrors.title = true;
      if (!firstMissingField) firstMissingField = 'title';
    }
    if (!formData.author.trim()) {
      newErrors.push('اسم المؤلف مطلوب');
      newFieldErrors.author = true;
      if (!firstMissingField) firstMissingField = 'author';
    }
    
    // التحقق من أن المستخدم اختار المؤلف من القائمة إذا كانت هناك اقتراحات متاحة
    if (formData.author.trim() && suggestions.length > 0 && !authorExplicitlySelected) {
      newErrors.push('يجب اختيار المؤلف من قائمة الاقتراحات المتاحة');
      newFieldErrors.author = true;
      if (!firstMissingField) firstMissingField = 'author';
    }
    if (!formData.category) {
      newErrors.push('تصنيف الكتاب مطلوب');
      newFieldErrors.category = true;
      if (!firstMissingField) firstMissingField = 'category';
    }
    if (!formData.description.trim()) {
      newErrors.push('وصف الكتاب مطلوب');
      newFieldErrors.description = true;
      if (!firstMissingField) firstMissingField = 'description';
    }
    if (!formData.language) {
      newErrors.push('لغة الكتاب مطلوبة');
      newFieldErrors.language = true;
      if (!firstMissingField) firstMissingField = 'language';
    }
    // Page count is now automatically detected - no validation needed
    if (!coverFile && !existingFiles.coverImageUrl) {
      newErrors.push('صورة غلاف الكتاب مطلوبة');
      newFieldErrors.coverFile = true;
      if (!firstMissingField) firstMissingField = 'coverFile';
    }
    if (!bookFile && !existingFiles.bookFileUrl) {
      newErrors.push('ملف الكتاب مطلوب');
      newFieldErrors.bookFile = true;
      if (!firstMissingField) firstMissingField = 'bookFile';
    }
    if (!rightsConfirmation) {
      newErrors.push('يجب الموافقة على إقرار حقوق الملكية');
      newFieldErrors.rightsConfirmation = true;
      if (!firstMissingField) firstMissingField = 'rightsConfirmation';
    }

    if (bookExists) {
      newErrors.push('يوجد كتاب بنفس العنوان والمؤلف مسبقاً في الموقع');
    }

    setErrors(newErrors);
    setFieldErrors(newFieldErrors);

    // التركيز على أول حقل مفقود
    if (firstMissingField && newErrors.length > 0) {
      setTimeout(() => {
        let element = document.getElementById(firstMissingField);

        // للحقول من نوع Select, ابحث عن trigger element
        if (!element && (firstMissingField === 'category' || firstMissingField === 'language')) {
          const selectTrigger = document.querySelector(`[data-field="${firstMissingField}"] [role="combobox"]`) as HTMLElement;
          if (selectTrigger) {
            element = selectTrigger;
          }
        }

        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // إذا كان من نوع Select، قم بفتح القائمة
          if (firstMissingField === 'category' || firstMissingField === 'language') {
            element.click();
          }
        }
      }, 100);
    }

    return newErrors.length === 0;
  };

  // مرجع لحساب التقدم عبر عدة ملفات
  const uploadContextRef = React.useRef({ fileIndex: 0, totalFiles: 1 });

  const updateProgress = (step: string, progress: number) => {
    setCurrentUploadStep(step);
    setUploadProgress(Math.min(Math.round(progress * 10) / 10, 100));
    console.log(`📊 تقدم الرفع: ${Math.round(progress)}% - ${step}`);
  };

  const updateFileProgress = (fileProgress: number, label: string) => {
    const { fileIndex, totalFiles } = uploadContextRef.current;
    // 15% للتحقق، 70% للرفع، 15% للمعالجة النهائية
    const perFileRange = 70 / totalFiles;
    const overallProgress = 15 + (fileIndex * perFileRange) + (fileProgress / 100 * perFileRange);
    updateProgress(`${label}... ${fileProgress}%`, overallProgress);
  };


  // ضغط صورة الغلاف لتقليل حجمها وتجنب فشل الرفع على الشبكات الضعيفة
  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    // إذا كانت الصورة صغيرة (<500KB) لا تضغط
    if (file.size < 500 * 1024) return file;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('فشل قراءة الصورة'));
        reader.readAsDataURL(file);
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('فشل تحميل الصورة'));
        image.src = dataUrl;
      });

      // أبعاد قصوى مناسبة لأغلفة الكتب
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1800;
      let { width, height } = img;
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
      });

      if (!blob) return file;
      // إذا الناتج أكبر من الأصلي، استخدم الأصلي
      if (blob.size >= file.size) return file;

      const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      const compressed = new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
      console.log(`🗜️ تم ضغط الصورة: ${formatFileSize(file.size)} → ${formatFileSize(compressed.size)}`);
      return compressed;
    } catch (e) {
      console.warn('⚠️ فشل ضغط الصورة، سيتم استخدام الأصلية:', e);
      return file;
    }
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsDataURL(file);
    });

    return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  };

  const uploadBookCoverViaSupabase = async (file: File, folder: string): Promise<string> => {
    const base64Data = await fileToBase64(file);
    const { data, error } = await supabaseFunctions.functions.invoke('upload-book-cover', {
      body: {
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
        base64Data,
        folder
      }
    });

    if (error) {
      let serverMessage = error.message || 'فشل رفع صورة الغلاف عبر Supabase';
      try {
        const context = (error as any).context;
        const details = typeof context?.json === 'function' ? await context.json() : null;
        if (details?.error) serverMessage = details.error;
      } catch (_) {}
      throw new Error(serverMessage);
    }

    if (!data?.publicUrl) {
      throw new Error(data?.error || 'لم يتم الحصول على رابط صورة الغلاف');
    }

    return data.publicUrl;
  };

  const uploadPdfInChunks = async (file: File, bucket: string, folder: string): Promise<string> => {
    const settings = mobileOptimizer.getOptimalUploadSettings();
    const chunkSize = Math.min(settings.maxChunkSize, 4 * 1024 * 1024);
    const fileExt = (file.name.split('.').pop() || 'pdf').toLowerCase();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `${folder}/${timestamp}_${randomId}.${fileExt}`;
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end, file.type || 'application/pdf');
      const chunkPath = `${fileName}.part${chunkIndex.toString().padStart(4, '0')}`;

      const chunkProgress = Math.round(((chunkIndex + 0.5) / totalChunks) * 90);
      updateFileProgress(chunkProgress, `رفع ${file.name} جزء ${chunkIndex + 1}/${totalChunks}`);

      const { error } = await supabase.storage
        .from(bucket)
        .upload(chunkPath, chunk, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/pdf',
        });

      if (error) {
        throw new Error(`فشل رفع جزء ${chunkIndex + 1} من ${file.name}: ${error.message}`);
      }
    }

    updateFileProgress(95, `دمج أجزاء ${file.name}`);

    const { data, error } = await supabaseFunctions.functions.invoke('combine-file-chunks', {
      body: {
        bucketName: bucket,
        fileName,
        totalChunks,
        contentType: file.type || 'application/pdf',
      }
    });

    if (error) {
      throw new Error(error.message || `فشل دمج أجزاء ${file.name}`);
    }

    if (!data?.fileUrl || typeof data.fileUrl !== 'string') {
      throw new Error(`لم يتم الحصول على رابط صالح بعد دمج ${file.name}`);
    }

    return data.fileUrl;
  };

  const uploadFileUnified = async (file: File, bucket: string, folder: string = ''): Promise<string> => {
    // محاولة واحدة فقط. غلاف الكتاب يُرفع عبر Supabase Function لتجاوز مشاكل fetch المباشر إلى Storage.
    if (bucket === 'book-covers' && file.type.startsWith('image/')) {
      file = await compressImageIfNeeded(file);
    }

    const fileExt = (file.name.split('.').pop() || 'bin').toLowerCase();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = folder
      ? `${folder}/${timestamp}_${randomId}.${fileExt}`
      : `${timestamp}_${randomId}.${fileExt}`;

    console.log(`🔄 رفع ${file.name} إلى ${bucket}`);
    console.log(`📏 حجم الملف: ${formatFileSize(file.size)}`);

    updateFileProgress(5, `رفع ${file.name}`);

    let progressValue = 5;
    const progressTimer = setInterval(() => {
      progressValue = Math.min(progressValue + 5, 85);
      updateFileProgress(progressValue, `رفع ${file.name}`);
    }, 800);

    try {
      let publicUrl: string;

      if (bucket === 'book-covers' && file.type.startsWith('image/')) {
        publicUrl = await uploadBookCoverViaSupabase(file, folder || 'covers');
      } else if (bucket === 'book-files' && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && file.size > 8 * 1024 * 1024) {
        publicUrl = await uploadPdfInChunks(file, bucket, folder || 'books');
      } else {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          });

        if (error) {
          console.error('❌ خطأ Supabase Storage:', error);
          throw new Error(error.message || 'فشل الرفع');
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path || fileName);

        if (!urlData?.publicUrl) {
          throw new Error(`لم يتم الحصول على رابط ${file.name}`);
        }

        publicUrl = urlData.publicUrl;
      }

      clearInterval(progressTimer);
      updateFileProgress(100, `تم رفع ${file.name}`);
      console.log(`✅ تم رفع ${file.name} بنجاح:`, publicUrl);
      return publicUrl;
    } catch (error: any) {
      clearInterval(progressTimer);
      const errMsg = String(error?.message || error || 'خطأ غير معروف');
      console.error(`💥 فشلت محاولة الرفع الوحيدة لملف ${file.name}:`, errMsg);

      if (errMsg.toLowerCase().includes('failed to fetch') && !navigator.onLine) {
        throw new Error('لا يوجد اتصال بالإنترنت. تحقق من شبكتك ثم أعد المحاولة.');
      }

      throw new Error(`فشل في رفع ${file.name}: ${errMsg}`);
    }
  };

  // رفع ملفات المسودة بنفس مسار الرفع الموثوق، لكن بدون إعادة محاولة
  const uploadFileToStorage = async (
    file: File,
    bucketName: string,
    folder: string
  ): Promise<string> => {
    if (!user?.id) {
      throw new Error('المستخدم غير مسجل');
    }

    try {
      return await uploadFileUnified(file, bucketName, folder);
    } catch (error: any) {
      console.error('❌ فشل رفع ملف المسودة:', error);
      throw new Error(`فشل رفع ${file.name}: ${error?.message || 'خطأ غير معروف'}`);
    }
  };
  // حفظ كمسودة
  const handleSaveAsDraft = async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }

    // التحقق من وجود عنوان على الأقل
    if (!formData.title.trim()) {
      toast.error('يرجى إدخال عنوان الكتاب على الأقل لحفظ المسودة');
      return;
    }

    setIsSavingDraft(true);

    try {
      const draftData: Record<string, any> = {
        user_id: user.id,
        title: formData.title.trim(),
        author: formData.author.trim() || 'غير محدد',
        category: formData.category || 'novels',
        description: formData.description.trim() || 'مسودة',
        language: formData.language || 'العربية',
        display_type: formData.displayType || 'download_read',
        status: 'draft',
        subtitle: formData.subtitle.trim() || null,
        publisher: formData.publisher.trim() || null,
        translator: formData.translator.trim() || null,
        publication_year: formData.publicationYear ? parseInt(formData.publicationYear) : null,
        page_count: formData.pageCount ? parseInt(formData.pageCount) : null,
        user_email: user.email,
      };

      const filesToUpload: Array<{
        file: File;
        type: 'cover' | 'book';
        bucket: 'book-covers' | 'book-files';
        folder: 'covers' | 'books';
      }> = [];

      if (coverFile) {
        filesToUpload.push({
          file: coverFile,
          type: 'cover',
          bucket: 'book-covers',
          folder: 'covers'
        });
      }

      if (bookFile) {
        filesToUpload.push({
          file: bookFile,
          type: 'book',
          bucket: 'book-files',
          folder: 'books'
        });
      }

      uploadContextRef.current = {
        fileIndex: 0,
        totalFiles: Math.max(filesToUpload.length, 1)
      };

      for (let i = 0; i < filesToUpload.length; i++) {
        const fileData = filesToUpload[i];
        uploadContextRef.current.fileIndex = i;

        const fileUrl = await uploadFileToStorage(
          fileData.file,
          fileData.bucket,
          fileData.folder
        );

        if (fileData.type === 'cover') {
          draftData.cover_image_url = fileUrl;
        }

        if (fileData.type === 'book') {
          draftData.book_file_url = fileUrl;
          draftData.file_size = fileData.file.size;
          draftData.file_type = fileData.file.type;
          draftData.book_file_type = getFileTypeFromExtension(fileData.file.name);
          draftData.file_metadata = {
            originalName: fileData.file.name,
            size: fileData.file.size,
            type: fileData.file.type,
            savedAt: new Date().toISOString()
          };
        }
      }

      if (!coverFile && existingFiles.coverImageUrl) {
        draftData.cover_image_url = existingFiles.coverImageUrl;
      }

      if (!bookFile && existingFiles.bookFileUrl) {
        draftData.book_file_url = existingFiles.bookFileUrl;
      }

      if (draftId) {
        // تحديث المسودة الموجودة
        const { error } = await supabase
          .from('book_submissions')
          .update(draftData)
          .eq('id', draftId)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('✅ تم تحديث المسودة بنجاح', {
          description: 'يمكنك العودة لإكمال الرفع في أي وقت'
        });
      } else {
        // إنشاء مسودة جديدة
        const { data, error } = await supabase
          .from('book_submissions')
          .insert(draftData)
          .select('id')
          .single();

        if (error) throw error;
        setDraftId(data.id);
        toast.success('✅ تم حفظ المسودة بنجاح', {
          description: 'يمكنك العودة لإكمال الرفع في أي وقت'
        });
      }

      console.log('✅ تم حفظ المسودة');
    } catch (error: any) {
      console.error('❌ خطأ في حفظ المسودة:', error);
      toast.error('فشل في حفظ المسودة', {
        description: error.message
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // حذف المسودة عند الإرسال الناجح
  const deleteDraftAfterSubmit = async () => {
    if (draftId) {
      try {
        await supabase
          .from('book_submissions')
          .delete()
          .eq('id', draftId)
          .eq('status', 'draft');
        console.log('✅ تم حذف المسودة بعد الإرسال الناجح');
      } catch (err) {
        console.error('خطأ في حذف المسودة:', err);
      }
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const editApprovedId = urlParams.get('edit-approved');
    const isEdit = editId !== null;
    const isEditApproved = editApprovedId !== null;

    if (!user) {
      toast.error("يرجى تسجيل الدخول لرفع كتاب", {
        description: "يجب تسجيل الدخول أولاً"
      });
      navigate('/auth');
      return;
    }

    if (isCheckingBook) {
      toast.warning("انتظر انتهاء التحقق من الكتاب", {
        description: "جاري التحقق من وجود الكتاب..."
      });
      return;
    }

    if (bookExists) {
      toast.error("❌ لا يمكن رفع الكتاب", {
        description: "يوجد كتاب بنفس العنوان والمؤلف في النظام مسبقاً"
      });
      return;
    }

    if (!validateForm()) {
      const firstError = errors[0];
      toast.error("⚠️ معلومات مفقودة", {
        description: `${firstError}. يرجى ملء هذا الحقل للمتابعة.`
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    console.log('🚀 بدء عملية رفع الكتاب');

    // تحذير خاص للملفات الكبيرة مع نصائح للهواتف
    if (bookFile && bookFile.size > 20 * 1024 * 1024) {
      const tips = diagnosticInfo?.isMobile 
        ? "تأكد من اتصال WiFi مستقر ولا تغلق التطبيق/الصفحة أثناء الرفع"
        : "سيستغرق الرفع عدة دقائق - لا تغلق الصفحة ولا تقطع الإنترنت";

      toast.warning(`📁 ملف كبير: ${formatFileSize(bookFile.size)}`, {
        description: tips,
        duration: 10000
      });
    }

    // حفظ نتائج الرفع لاستخدامها في التنظيف عند الفشل
    let uploadResults: {
      coverImageUrl?: string;
      bookFileUrl?: string;
    } = {};

    try {
      // المرحلة 1: التحقق من البيانات
      updateProgress('التحقق من البيانات والاتصال...', 5);

      const { data: testData, error: testError } = await supabase.from('book_submissions').select('count').limit(1);
      if (testError) {
        throw new Error(`فشل الاتصال بقاعدة البيانات: ${testError.message}`);
      }
      console.log('✅ الاتصال بقاعدة البيانات يعمل بشكل صحيح');

      await new Promise(resolve => setTimeout(resolve, 1000));

      // تهيئة روابط الملفات - استخدام الملفات الموجودة في حالة التعديل
      let coverImageUrl = (isEdit || isEditApproved) ? existingFiles.coverImageUrl : null;
      let bookFileUrl = (isEdit || isEditApproved) ? existingFiles.bookFileUrl : null;
      let actualFileSize = null;
      let detectedPageCount: number | null = null;

      // المرحلة 2: رفع الملفات بنظام موحد (PDF أولاً)
      updateProgress('تحضير الملفات للرفع...', 15);

      const filesToUpload = [];

      // ترتيب الرفع: صورة الغلاف أولاً، ثم ملف PDF أخيراً
      if (coverFile) {
        filesToUpload.push({
          file: coverFile,
          type: 'cover',
          bucket: 'book-covers',
          folder: 'covers',
          label: 'رفع صورة الغلاف'
        });
      }

      if (bookFile) {
        filesToUpload.push({
          file: bookFile,
          type: 'book',
          bucket: 'book-files',
          folder: 'books',
          label: 'رفع ملف الكتاب PDF'
        });
      }

      // تعيين سياق التقدم للملفات المتعددة
      uploadContextRef.current = { fileIndex: 0, totalFiles: filesToUpload.length };

      for (let i = 0; i < filesToUpload.length; i++) {
        const fileData = filesToUpload[i];
        uploadContextRef.current.fileIndex = i;

        updateProgress(`${fileData.label}...`, 15 + (i / filesToUpload.length) * 70);
        console.log(`🚀 بدء ${fileData.label} (${i + 1}/${filesToUpload.length})`);

        try {
          const url = await uploadFileUnified(fileData.file, fileData.bucket, fileData.folder);

          if (fileData.type === 'cover') {
            coverImageUrl = url;
            console.log('✅ تم رفع صورة الغلاف:', url);
          } else if (fileData.type === 'book') {
            bookFileUrl = url;
            actualFileSize = fileData.file.size;
            console.log('✅ تم رفع ملف الكتاب:', url);
            
            // إضافة الشعار على ملفات PDF فقط
            if (fileData.file.type === 'application/pdf' || fileData.file.name.toLowerCase().endsWith('.pdf')) {
              try {
                updateProgress('إضافة شعار الموقع على PDF...', 15 + ((i + 0.9) / filesToUpload.length) * 70);
                console.log('🎨 بدء إضافة الشعار على PDF...');
                
                const { data: watermarkResult, error: watermarkError } = await supabaseFunctions.functions.invoke('add-pdf-watermark', {
                  body: {
                    pdfUrl: url,
                    bucket: fileData.bucket
                  }
                });
                
                if (watermarkError) {
                  console.error('⚠️ فشل إضافة الشعار على PDF:', watermarkError);
                  // نستمر بدون الشعار
                } else if (
                  watermarkResult?.watermarkedUrl &&
                  typeof watermarkResult.watermarkedUrl === 'string' &&
                  /^https?:\/\//i.test(watermarkResult.watermarkedUrl)
                ) {
                  bookFileUrl = watermarkResult.watermarkedUrl;
                  console.log('✅ تم إضافة الشعار على PDF بنجاح:', bookFileUrl);
                  // حفظ عدد الصفحات المكتشف تلقائياً
                  if (watermarkResult?.pageCount) {
                    detectedPageCount = watermarkResult.pageCount;
                    console.log('📄 تم اكتشاف عدد الصفحات تلقائياً:', detectedPageCount);
                  }
                } else {
                  console.warn('⚠️ نتيجة الشعار بدون رابط صالح، الاحتفاظ بالملف الأصلي:', watermarkResult);
                  // الاحتفاظ بـ bookFileUrl الأصلي بعد الرفع
                  if (watermarkResult?.pageCount) {
                    detectedPageCount = watermarkResult.pageCount;
                  }
                }
              } catch (error) {
                console.error('⚠️ خطأ في إضافة الشعار:', error);
                // نستمر بدون الشعار
              }
            }
          }

          updateProgress(`تم ${fileData.label} بنجاح ✅`, 15 + ((i + 1) / filesToUpload.length) * 70);
          console.log(`🎉 اكتمل ${fileData.label} بنجاح!`);
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
          console.error(`❌ فشل في ${fileData.label}:`, error);
          updateProgress(`فشل في ${fileData.label} ❌`, 0);
          throw new Error(`فشل في ${fileData.label}: ${error.message}`);
        }
      }

      console.log('✅ اكتمل رفع جميع الملفات بنجاح!');

      // تحديث نتائج الرفع
      uploadResults = {
        coverImageUrl,
        bookFileUrl
      };

      // استخدام الملفات الموجودة في حالة التعديل مع الاحتفاظ بجميع البيانات
      const editBookId = editId || editApprovedId;
      if ((isEdit || isEditApproved) && editBookId) {
        // جلب البيانات الكاملة للكتاب الموجود
        const { data: existingBookData, error: fetchError } = await supabase
          .from('book_submissions')
          .select('cover_image_url, book_file_url, file_size, file_type, file_metadata')
          .eq('id', editBookId)
          .single();

        if (fetchError) {
          console.error('خطأ في جلب بيانات الكتاب الموجود:', fetchError);
        }

        // الاحتفاظ بصورة الغلاف إذا لم يتم رفع صورة جديدة
        if (!coverImageUrl && (existingFiles.coverImageUrl || existingBookData?.cover_image_url)) {
          coverImageUrl = existingFiles.coverImageUrl || existingBookData?.cover_image_url;
          console.log('🔄 الاحتفاظ بصورة الغلاف الموجودة:', coverImageUrl);
        }

        // الاحتفاظ بملف الكتاب وحجمه إذا لم يتم رفع ملف جديد
        if (!bookFileUrl && (existingFiles.bookFileUrl || existingBookData?.book_file_url)) {
          bookFileUrl = existingFiles.bookFileUrl || existingBookData?.book_file_url;
          // الاحتفاظ بالحجم الفعلي للملف الموجود
          actualFileSize = existingBookData?.file_size || null;
          console.log('🔄 الاحتفاظ بملف الكتاب الموجود:', {
            url: bookFileUrl,
            size: actualFileSize,
            formattedSize: actualFileSize ? formatFileSize(actualFileSize) : 'غير محدد'
          });
        }
      }

      // المرحلة 5: حفظ البيانات
      updateProgress('حفظ البيانات في قاعدة البيانات...', 95);

      // 🛡️ حارس نهائي: التأكد من وجود رابطي الغلاف وملف الكتاب قبل الإدراج
      // هذا يمنع وصول أي طلب كتاب إلى الإدارة بدون غلاف أو بدون PDF
      const isValidPublicUrl = (u: unknown): u is string =>
        typeof u === 'string' && /^https?:\/\//i.test(u.trim()) && u.trim().length > 10;

      if (!isValidPublicUrl(coverImageUrl)) {
        console.error('🛑 رفض الإدراج: رابط صورة الغلاف مفقود أو غير صالح', { coverImageUrl });
        throw new Error('فشل رفع صورة الغلاف. يرجى إعادة اختيار الصورة والمحاولة مرة أخرى.');
      }
      if (!isValidPublicUrl(bookFileUrl)) {
        console.error('🛑 رفض الإدراج: رابط ملف الكتاب مفقود أو غير صالح', { bookFileUrl });
        throw new Error('فشل رفع ملف الكتاب (PDF). يرجى إعادة اختيار الملف والمحاولة مرة أخرى.');
      }

      const submissionData = {
        user_id: user.id,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        author: formData.author.trim(),
        category: formData.category,
        language: formData.language,
        display_type: formData.displayType,
        description: formData.description.trim() || null,
        publisher: formData.publisher.trim() || null,
        translator: formData.translator.trim() || null,
        publication_year: formData.publicationYear ? parseInt(formData.publicationYear) : null,
        page_count: detectedPageCount || null,
        cover_image_url: coverImageUrl,
        book_file_url: bookFileUrl,
        file_size: actualFileSize,
        file_type: bookFile?.type || 'application/pdf',
        upload_status: 'pending',
        rights_confirmation: rightsConfirmation, // إضافة تأكيد حقوق الملكية
        file_metadata: {
          originalName: bookFile?.name || 'Unknown',
          size: actualFileSize || bookFile?.size || 0,
          type: bookFile?.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
          deviceType: diagnosticInfo?.isMobile ? 'Mobile' : 'Desktop'
        }
      };

      let data;
      
      if (isEditApproved && editApprovedId) {
        // تعديل كتاب معتمد - استخدام Edge Function المخصص لإرسال طلبات التعديل
        const { data: editResult, error: editError } = await supabaseFunctions.functions.invoke('submit-book-edit', {
          body: {
            p_book_id: editApprovedId,
            p_title: formData.title.trim(),
            p_subtitle: formData.subtitle.trim() || null,
            p_author: formData.author.trim(),
            p_category: formData.category,
            p_language: formData.language,
            p_type: formData.displayType,
            p_description: formData.description.trim() || null,
            
            p_publisher: formData.publisher || null,
            p_translator: formData.translator || null,
            p_publication_year: formData.publicationYear ? parseInt(formData.publicationYear) : null,
            p_page_count: detectedPageCount || null,
            p_cover_image_url: coverImageUrl,
            p_book_file_url: bookFileUrl,
            p_author_image_url: null, // صورة المؤلف ليست موجودة في حالة التعديل
            p_user_id: user.id,
            p_user_email: user.email,
            p_rights_confirmation: rightsConfirmation,
            p_file_metadata: {
              originalName: bookFile?.name || 'Unknown',
              size: actualFileSize || bookFile?.size || 0,
              type: bookFile?.type || 'application/pdf',
              uploadedAt: new Date().toISOString(),
              deviceType: diagnosticInfo?.isMobile ? 'Mobile' : 'Desktop'
            }
          }
        });

        if (editError) {
          console.error('❌ خطأ في تعديل الكتاب المعتمد:', editError);
          throw new Error(`فشل في تعديل الكتاب المعتمد: ${editError.message}`);
        }

        // إنشاء كائن البيانات للمتابعة
        data = { id: editResult.editSubmissionId };
        console.log('✅ تم إرسال تعديلات الكتاب المعتمد للمراجعة:', data);
      } else if (isEdit && editId) {
        // تعديل كتاب قيد المراجعة - تحديث نفس السجل
        const { data: updateData, error: updateError } = await supabase
          .from('book_submissions')
          .update(submissionData)
          .eq('id', editId)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ خطأ في تحديث البيانات:', updateError);
          throw new Error(`فشل في تحديث البيانات: ${updateError.message}`);
        }

        data = updateData;
        console.log('✅ تم تحديث البيانات بنجاح:', data);
      } else {
        // إنشاء كتاب جديد
        const { data: insertData, error: dbError } = await supabase
          .from('book_submissions')
          .insert(submissionData)
          .select('*')
          .single();

        if (dbError) {
          console.error('❌ خطأ في حفظ البيانات:', dbError);
          throw new Error(`فشل في حفظ البيانات: ${dbError.message}`);
        }

        data = insertData;
        console.log('✅ تم حفظ البيانات بنجاح في قاعدة البيانات:', data);

      }

      setSubmissionId(data.id);

      // 💾 حفظ النص المستخرج بالذكاء الاصطناعي (إن وُجد) في جدول book_extracted_text
      if (extractedBookText && data.id) {
        try {
          await supabase
            .from('book_extracted_text')
            .upsert({
              book_id: data.id,
              extracted_text: extractedBookText,
              extraction_status: 'completed',
              extraction_error: null,
              text_length: extractedBookText.length,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'book_id' });
          console.log(`✅ تم حفظ النص المستخرج (${extractedBookText.length} حرف) للكتاب ${data.id}`);
        } catch (textSaveErr) {
          console.error('⚠️ فشل حفظ النص المستخرج:', textSaveErr);
          // لا نوقف العملية — هذه ميزة إضافية
        }
      }


      // المرحلة 6: إنشاء الإشعار (فقط للكتب الجديدة)
      if (!isEdit && !isEditApproved) {
        updateProgress('إنشاء الإشعار...', 98);

        const notifTitle = 'تم استلام كتابك! 📚';
        const notifMessage = `تم استلام كتاب "${formData.title}" (${actualFileSize ? formatFileSize(actualFileSize) : 'حجم غير محدد'}) وبدأت عملية المراجعة. سنقوم بمراجعته بعناية وإشعارك بالنتيجة خلال 72 ساعة.`;

        await supabase.from('notifications').insert({
          user_id: user.id,
          title: notifTitle,
          message: notifMessage,
          type: 'info',
          book_submission_id: data.id,
          book_title: formData.title,
          book_author: formData.author,
          book_category: formData.category,
          read: false
        });

        // Send push notification via OneSignal
        try {
          const { sendPushToUser } = await import('@/utils/pushNotification');
          await sendPushToUser(user.id, notifTitle, notifMessage, undefined, 'info');
        } catch (e) {
          console.error('[Push] Failed to send push:', e);
        }
      } else if (isEditApproved) {
        updateProgress('تم إرسال التعديلات للمراجعة...', 98);
      } else {
        updateProgress('حفظ التعديلات...', 98);
      }

      // اكتمال العملية
      updateProgress(isEdit ? 'تم تحديث الكتاب بنجاح! 🎉' : 'تم رفع الكتاب بنجاح! 🎉', 100);

      const successDescription = actualFileSize 
        ? `الحجم: ${formatFileSize(actualFileSize)} - ${isEdit ? 'تم تحديث بياناتك' : 'سيتم مراجعة كتابك خلال 72 ساعة'}`
        : `${isEdit ? 'تم تحديث بياناتك بنجاح' : 'سيتم مراجعة كتابك خلال 72 ساعة'}`;

      toast.success(isEdit ? "✅ تم تحديث الكتاب بنجاح!" : "✅ تم رفع الكتاب بنجاح!", {
        description: successDescription,
        duration: 6000
      });

      console.log(isEdit ? '🎉 اكتملت عملية تحديث الكتاب بنجاح!' : '🎉 اكتملت عملية رفع الكتاب بنجاح!');

      // انتظار قليل لإظهار 100%
      await new Promise(resolve => setTimeout(resolve, 2000));

      // إشعار النجاح
      let toastMessage = "تم رفع الكتاب بنجاح! 🎉";
      let toastDescription = "شكراً لك على إثراء مكتبتنا! سنراجع كتابك بعناية وسنعلمك بالنتيجة قريباً.";
      
      if (isEditApproved) {
        toastMessage = "تم إرسال تعديلات الكتاب! 📝";
        toastDescription = "تم إرسال تعديلاتك للمراجعة. ستتلقى إشعاراً عند الانتهاء من المراجعة.";
      } else if (isEdit) {
        toastMessage = "تم تحديث الكتاب بنجاح! 🎉";
        toastDescription = "تم تحديث بيانات كتابك بنجاح.";
      }
      
      toast.success(toastMessage, {
        description: toastDescription
      });

      // حذف المسودة بعد الإرسال الناجح
      await deleteDraftAfterSubmit();

      // إعادة تعيين النموذج وإشعار الصفحة الرئيسية
      resetForm();
      if (onSuccess) {
        onSuccess();
      }

      // إعادة توجيه إلى صفحة كتبي مع إعادة تحميل كaملة
      window.location.href = '/my-books';
      
    } catch (error: any) {
      console.error("💥 فشل في رفع الكتاب", error);
      updateProgress('حدث خطأ أثناء الرفع', 0);

      // تنظيف الملفات متوقف - لا نحذف ملفات الكتب

      if (submissionId) {
        await supabase
          .from('book_submissions')
          .update({
            upload_status: 'failed',
            upload_error_message: error.message,
            file_metadata: {
              error: error.message,
              failedAt: new Date().toISOString(),
              fileSize: bookFile?.size || 0,
              retryStrategy: 'enhanced_mobile_strategy',
              deviceType: diagnosticInfo?.isMobile ? 'Mobile' : 'Desktop'
            }
          })
          .eq('id', submissionId);
      }

      toast.error("❌ حدث خطأ أثناء رفع الكتاب", {
        description: error.message + (uploadResults && Object.keys(uploadResults).length > 0 ? " - تم حذف الملفات المرفوعة" : ""),
        duration: 8000
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setCurrentUploadStep('');
    }
  };

  // تم إزالة عرض الرسائل المنبثقة - الإشعارات تظهر الآن فقط في قسم الإشعارات

  const isButtonDisabled = isSubmitting || bookExists || (isCheckingBook && formData.title.trim().length >= 3 && formData.author.trim().length >= 3);

  // التحقق من حالة التعديل
  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('edit') !== null || urlParams.get('edit-approved') !== null;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto text-sm font-poppins" data-form-type="book-submission">
      <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm font-poppins" data-form-type="book-submission">
        <CardHeader className="text-center pb-5 font-poppins">
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-white font-poppins">
            {isEditMode ? 'تعديل معلومات الكتاب' : 'معلومات الكتاب'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 font-poppins">

          {/* معلومات التشخيص المبسطة للكمبيوتر */}
          {diagnosticInfo && bookFileInfo && bookFileInfo.size > 10 * 1024 * 1024 && !diagnosticInfo.isMobile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-5 w-5 text-blue-600 ml-2" />
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">ملف كبير</h3>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>حجم الملف:</strong> {bookFileInfo.formattedSize}</p>
                <p className="mt-2 font-medium">💡 نصائح للرفع الناجح:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>استخدم اتصال WiFi مستقراً بدلاً من بيانات الجوال</li>
                  <li>لا تغلق التطبيق/الصفحة أثناء الرفع</li>
                  <li>قد يستغرق الرفع عدة دقائق للملفات الكبيرة</li>
                  {diagnosticInfo.isIOS && (
                    <li>على iPhone، تأكد من تحديث متصفح Safari لأفضل أداء</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-5 w-5 text-red-600 ml-2" />
                <h3 className="font-semibold text-red-800 dark:text-red-200">يرجى تصحيح الأخطاء التالية:</h3>
              </div>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* عرض تحذير محسن إذا كان الكتاب موجود */}
          {bookExists && existingBookDetails && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-600 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-red-100 dark:bg-red-800/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-xl mb-3">
                    ⚠️ كتاب موجود مسبقاً!
                  </h3>
                  <div className="space-y-3 text-red-700 dark:text-red-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">📖 العنوان:</p>
                        <p className="bg-red-100 dark:bg-red-800/20 p-2 rounded">{existingBookDetails.book_title}</p>
                      </div>
                      <div>
                        <p className="font-medium">✍️ المؤلف(ة):</p>
                        <p className="bg-red-100 dark:bg-red-800/20 p-2 rounded">{existingBookDetails.book_author}</p>
                      </div>
                      <div>
                        <p className="font-medium">📚 التصنيف:</p>
                        <p className="bg-red-100 dark:bg-red-800/20 p-2 rounded">{existingBookDetails.book_category}</p>
                      </div>
                      <div>
                        <p className="font-medium">📅 تاريخ الإضافة:</p>
                        <p className="bg-red-100 dark:bg-red-800/20 p-2 rounded">
                          {new Date(existingBookDetails.created_date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="font-medium">🔄 الحالة:</p>
                      <p className={`p-3 rounded-lg font-bold ${
                        existingBookDetails.source_type === 'approved' 
                          ? 'bg-green-100 dark:bg-green-800/20 text-green-800 dark:text-green-200' 
                          : 'bg-yellow-100 dark:bg-yellow-800/20 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {existingBookDetails.source_type === 'approved' ? '✅ كتاب معتمد ومنشور' : '⏳ كتاب في انتظار المراجعة'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-red-100 dark:bg-red-800/30 border border-red-300 dark:border-red-600 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      <strong>🚫 لا يمكن رفع هذا الكتاب:</strong>
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      يوجد كتاب بنفس العنوان والمؤلف في النظام مسبقاً. يرجى التأكد من أن كتابك مختلف تماماً أو تعديل العنوان إذا كان إصداراً مختلفاً.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}


          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                عنوان الكتاب *
              </Label>
              <div className="relative">
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="أدخل عنوان الكتاب"
                  className={`h-9 text-sm bg-card border focus:border-primary focus:ring-1 focus:ring-primary/20 pr-8 transition-all ${
                    bookExists || fieldErrors.title ? 'border-destructive dark:border-destructive' :
                    (isCheckingBook && formData.title.trim().length >= 3) ? 'border-primary/50 dark:border-primary/50' : 
                    'border-border hover:border-primary/30'
                  }`}
                  required
                />
                {isCheckingBook && formData.title.trim().length >= 3 && formData.author.trim().length >= 3 && (
                  <RefreshCw className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 animate-spin text-primary" />
                )}
                {!isCheckingBook && bookExists && (
                  <X className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-destructive" />
                )}
                {!isCheckingBook && !bookExists && formData.title && formData.author && formData.title.trim().length >= 3 && formData.author.trim().length >= 3 && (
                  <CheckCircle className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
                )}
              </div>
              {isCheckingBook && formData.title.trim().length >= 3 && formData.author.trim().length >= 3 && (
                <p className="text-[10px] text-primary flex items-center gap-1">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  جاري التحقق...
                </p>
              )}
              {!isCheckingBook && bookExists && (
                <p className="text-[10px] text-destructive font-medium flex items-center gap-1">
                  <X className="h-2.5 w-2.5" />
                  كتاب موجود مسبقاً
                </p>
              )}
              {!isCheckingBook && !bookExists && formData.title && formData.author && formData.title.trim().length >= 3 && formData.author.trim().length >= 3 && (
                <p className="text-[10px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle className="h-2.5 w-2.5" />
                  يمكن المتابعة
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subtitle" className="text-sm font-semibold text-foreground">العنوان الفرعي</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                placeholder="العنوان الفرعي (اختياري)"
                className="h-9 text-sm bg-card border border-border hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="author" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                مؤلف(ة) الكتاب *
              </Label>
              <div className="relative">
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="اسم المؤلف"
                  className={`h-9 text-sm bg-card border focus:ring-1 focus:ring-primary/20 pr-8 transition-all ${
                    bookExists || fieldErrors.author ? 'border-destructive dark:border-destructive' :
                    (isSearching || (isCheckingBook && formData.author.trim().length >= 3)) ? 'border-primary/50 dark:border-primary/50' : 
                    (found && authorExplicitlySelected) ? 'border-green-500 dark:border-green-600' :
                    'border-border hover:border-primary/30'
                  }`}
                  required
                />
                {(isSearching || (isCheckingBook && formData.title.trim().length >= 3 && formData.author.trim().length >= 3)) && (
                  <RefreshCw className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 animate-spin text-primary" />
                )}
                {!isSearching && !isCheckingBook && found && authorExplicitlySelected && !bookExists && (
                  <CheckCircle className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
                )}
                {!isSearching && !isCheckingBook && bookExists && (
                  <X className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-destructive" />
                )}

                <AuthorSuggestions
                  suggestions={suggestions}
                  isLoading={isSuggestionsLoading}
                  isVisible={showSuggestions && formData.author.trim().length >= 2}
                  onSelect={(author) => {
                    setFormData(prev => ({
                      ...prev,
                      author: author.author
                    }));
                    setShowSuggestions(false);
                    setAuthorExplicitlySelected(true);
                  }}
                />
              </div>

              {found && authorData && authorExplicitlySelected && (
                <div className="p-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-[10px] text-green-700 dark:text-green-300 flex items-center gap-1">
                  <CheckCircle className="h-2.5 w-2.5" />
                  تم العثور على بيانات المؤلف
                </div>
              )}

              {formData.author.trim() && suggestions.length > 0 && !authorExplicitlySelected && (
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" />
                  اختر المؤلف من القائمة
                </div>
              )}
            </div>

            <div className="space-y-1.5" data-field="category">
              <Label htmlFor="category" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                قسم الكتاب *
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
                className={`w-full h-9 px-3 text-sm rounded-md bg-card border hover:border-primary/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all ${
                  fieldErrors.category ? 'border-destructive dark:border-destructive' : 'border-border'
                } ${formData.category ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                <option value="">اختر القسم</option>
                {BOOK_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* رسالة توضيحية عن صورة المؤلف */}
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
            💡 صورتك ونبذتك تُضاف من قسم <strong>"حسابي"</strong>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="publisher" className="text-sm font-semibold text-foreground">دار النشر</Label>
              <Input
                id="publisher"
                value={formData.publisher}
                onChange={(e) => handleInputChange('publisher', e.target.value)}
                placeholder="دار النشر (اختياري)"
                className="h-9 text-sm bg-card border border-border hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="translator" className="text-sm font-semibold text-foreground">المترجم</Label>
              <Input
                id="translator"
                value={formData.translator}
                onChange={(e) => handleInputChange('translator', e.target.value)}
                placeholder="المترجم (اختياري)"
                className="h-9 text-sm bg-card border border-border hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                وصف الكتاب *
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerateDescriptionFromFile}
                disabled={!bookFile || isGeneratingDescription || isSubmitting || descriptionGenerated}
                className="h-7 gap-1.5 text-xs border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary disabled:opacity-50"
                title={
                  !bookFile
                    ? 'اختر ملف الكتاب أولاً'
                    : descriptionGenerated
                      ? 'تم توليد الوصف بالفعل لهذا الملف'
                      : 'استخراج النص من الكتاب وتوليد وصف بالذكاء الاصطناعي'
                }
              >
                {isGeneratingDescription ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    جاري التوليد...
                  </>
                ) : descriptionGenerated ? (
                  <>
                    <Sparkles className="h-3 w-3" />
                    ✓ تم توليد الوصف
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    ✨ توليد الوصف من الكتاب
                  </>
                )}
              </Button>
            </div>
            {!bookFile && (
              <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  💡 لاستخدام ميزة <strong>توليد الوصف بالذكاء الاصطناعي</strong>، قم أولاً باختيار ملف الكتاب من الأسفل، ثم اضغط على زر "توليد الوصف من الكتاب".
                </p>
              </div>
            )}
            {bookFile && !descriptionGenerated && !formData.description && (
              <div className="flex items-start gap-1.5 p-2 rounded-md bg-primary/5 border border-primary/20">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  ✨ تم اختيار الملف! يمكنك الآن الضغط على زر <strong>"توليد الوصف من الكتاب"</strong> لإنشاء وصف تلقائي بالذكاء الاصطناعي.
                </p>
              </div>
            )}
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="وصف مختصر عن الكتاب — أو اضغط على زر التوليد بالذكاء الاصطناعي لاستخراج وصف من ملف الكتاب"
              rows={3}
              className={`text-sm bg-card border hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none ${
                fieldErrors.description ? 'border-destructive dark:border-destructive' : 'border-border'
              }`}
              required
            />
            {bookFile && !formData.description.trim() && !isGeneratingDescription && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                نصيحة: اضغط على "توليد الوصف من الكتاب" ليتم استخراج النص من ملفك وتوليد وصف احترافي تلقائياً
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="publicationYear" className="text-sm font-semibold text-foreground">سنة النشر</Label>
              <Input
                id="publicationYear"
                type="number"
                value={formData.publicationYear}
                onChange={(e) => handleInputChange('publicationYear', e.target.value)}
                placeholder="2026"
                min="1800"
                max={new Date().getFullYear()}
                className="h-9 text-sm bg-card border border-border hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>📄</span> عدد الصفحات
              </Label>
              <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>✨</span>
                  سيتم تحديد عدد صفحات الكتاب تلقائياً
                </p>
              </div>
            </div>

            <div className="space-y-1.5" data-field="language">
              <Label htmlFor="language" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                اللغة *
              </Label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                required
                className={`h-9 w-full rounded-md text-sm bg-card border px-2 text-foreground hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all ${
                  fieldErrors.language ? 'border-destructive dark:border-destructive' : 'border-border'
                }`}
              >
                <option value="">اختر</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* قسم نوع العرض */}
          <div className="p-3 border rounded-lg bg-muted/30">
            <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              نوع العرض *
            </Label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="displayType" value="read_only" checked={formData.displayType === 'read_only'} onChange={(e) => handleInputChange('displayType', e.target.value)} className="w-3.5 h-3.5" />
                🔒 للقراءة فقط
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="displayType" value="download_read" checked={formData.displayType === 'download_read'} onChange={(e) => handleInputChange('displayType', e.target.value)} className="w-3.5 h-3.5" />
                📚 للتحميل والقراءة
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="displayType" value="no_access" checked={formData.displayType === 'no_access'} onChange={(e) => handleInputChange('displayType', e.target.value)} className="w-3.5 h-3.5" />
                🚫 بدون وصول
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {/* ملف الكتاب */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                رفع الكتاب ({bookFile ? getFileTypeFromExtension(bookFile.name).toUpperCase() : 'PDF/DOC/TXT'}) *
              </Label>
              <div className="border-2 border-dashed border-primary/30 bg-primary/5 dark:border-primary/50 dark:bg-primary/10 rounded-lg p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-primary mb-2" />
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {bookFileInfo ? (
                    <>
                      <span className="text-green-600 font-medium">
                        ملف {bookFile ? getFileTypeFromExtension(bookFile.name).toUpperCase() : 'PDF'} جديد: 
                      </span>
                      <div className="font-medium">{bookFileInfo.name}</div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-bold">
                        الحجم: {bookFileInfo.formattedSize}
                      </div>
                      {bookFileInfo.size > 50 * 1024 * 1024 && (
                        <div className="text-xs text-orange-500 mt-1">
                          ⚠️ ملف كبير - سيتم استخدام نظام الرفع المتقدم
                        </div>
                      )}
                    </>
                  ) : isEditMode && existingFiles.bookFileUrl ? (
                    <span className="text-blue-600 font-medium">ملف موجود (سيتم الاحتفاظ به)</span>
                  ) : (
                    <span className="text-primary font-medium">ابدأ برفع ملف الكتاب أولاً (PDF/DOC/TXT)</span>
                  )}
                </div>
                {isEditMode && existingFiles.bookFileUrl && !bookFile && (
                  <div className="text-xs text-blue-600 mb-2">
                    💡 يمكنك اختيار ملف جديد (PDF, DOC, DOCX, TXT) لاستبدال الموجود، أو ترك الحقل فارغاً للاحتفاظ بالملف الحالي
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileChange('book', e.target.files?.[0] || null)}
                  className="hidden"
                  id="book-upload"
                />
                <Label htmlFor="book-upload" className="cursor-pointer">
                  <Button type="button" variant="default" size="sm" asChild>
                    <span>📚 اختر ملف الكتاب {bookFile ? `(${getFileTypeFromExtension(bookFile.name).toUpperCase()})` : ''}</span>
                  </Button>
                </Label>
                <p className="text-xs text-primary/70 mt-2">
                  ملفات PDF, DOC, DOCX, TXT مدعومة
                </p>
                {bookFileInfo && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-600">
                    <div className="text-xs text-green-700 dark:text-green-300">
                      <strong>✓ تم التحقق من الملف:</strong>
                      <br />النوع: {bookFile?.type || 'غير محدد'}
                      <br />الحجم: {bookFileInfo.formattedSize}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* صورة الغلاف ثانياً */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">صورة غلاف الكتاب *</Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/50">
                <Image className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {coverFile ? (
                    <>
                      <span className="text-green-600 font-medium">صورة جديدة: </span>
                      {coverFile.name}
                    </>
                  ) : isEditMode && existingFiles.coverImageUrl ? (
                    <span className="text-blue-600 font-medium">صورة موجودة (سيتم الاحتفاظ بها)</span>
                  ) : (
                    'لم يتم اختيار صورة'
                  )}
                </div>

                {/* معاينة صورة الغلاف */}
                {coverImagePreview && (
                  <div className="flex flex-col items-center space-y-2 mb-4">
                    <img 
                      src={coverImagePreview} 
                      alt="معاينة صورة الغلاف"
                      className="w-24 h-32 object-cover rounded-lg border-3 border-gray-300 shadow-lg"
                    />
                     <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                       {coverFile ? '✓ تم اختيار صورة جديدة' : '✓ صورة الغلاف الموجودة'}
                     </span>
                  </div>
                )}

                {isEditMode && existingFiles.coverImageUrl && !coverFile && (
                  <div className="text-xs text-blue-600 mb-2">
                    💡 يمكنك اختيار صورة جديدة لاستبدال الموجودة، أو ترك الحقل فارغاً للاحتفاظ بالصورة الحالية
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('cover', e.target.files?.[0] || null)}
                  className="hidden"
                  id="cover-upload"
                />
                <Label htmlFor="cover-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>🖼️ اختر صورة الغلاف</span>
                  </Button>
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  الحد الأقصى: 10 ميجابايت (JPG, PNG, WEBP)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl shadow-sm">
            <div className="flex items-start space-x-3 space-x-reverse">
              <Checkbox 
                id="rights"
                checked={rightsConfirmation}
                onCheckedChange={handleRightsConfirmationChange}
                className={`mt-1 h-5 w-5 ${
                  fieldErrors.rightsConfirmation ? 'border-destructive data-[state=checked]:bg-destructive' : 'border-primary data-[state=checked]:bg-primary'
                }`}
                required
              />
              <Label htmlFor="rights" className={`text-sm leading-relaxed cursor-pointer ${
                fieldErrors.rightsConfirmation ? 'text-destructive' : 'text-foreground'
              }`}>
                أقر بأنني المالك أو النائب لحقوق هذا الكتاب وأتحمل كل المسؤولية القانونية في حالة أي خلاف. 
                كما أوافق على شروط وأحكام المنصة وأفهم أنه سيتم مراجعة الكتاب قبل النشر.
                <span className="text-destructive font-semibold"> *</span>
              </Label>
            </div>
          </div>

          <div className="relative space-y-3">
            {/* أزرار الرفع والمسودة */}
            {!isSubmitting && (
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group" 
                  disabled={isSubmitting || bookExists || (formData.author.trim() && suggestions.length > 0 && !authorExplicitlySelected)}
                >
                  {isEditMode ? (
                    <>
                      <Check className="ml-2 h-5 w-5" />
                      تحديث الكتاب
                    </>
                  ) : (
                    <>
                      <Upload className="ml-2 h-5 w-5 transition-transform group-hover:scale-110" />
                      رفع الكتاب للمراجعة
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </Button>

                {/* زر حفظ كمسودة */}
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-2 border-primary/30 text-primary hover:bg-primary/5 font-semibold transition-all duration-300"
                    onClick={handleSaveAsDraft}
                    disabled={isSavingDraft || !formData.title.trim()}
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري حفظ المسودة...
                      </>
                    ) : (
                      <>
                        <Clock className="ml-2 h-4 w-4" />
                        {draftId ? 'تحديث المسودة' : 'حفظ كمسودة'}
                      </>
                    )}
                  </Button>
                )}

                {/* مؤشر المسودة المحملة */}
                {draftLoaded && draftId && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">📝 تم استعادة المسودة المحفوظة</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80 text-xs"
                      onClick={async () => {
                        if (draftId) {
                          await supabase
                            .from('book_submissions')
                            .delete()
                            .eq('id', draftId)
                            .eq('status', 'draft');
                          resetForm();
                          toast.success('تم حذف المسودة');
                        }
                      }}
                    >
                      <X className="h-3 w-3 ml-1" />
                      حذف المسودة
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* عداد التقدم المدمج مع الزر */}
            {isSubmitting && (
              <div className="animate-fade-in">
                <div className="w-full rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden shadow-lg">
                  {/* الجزء العلوي: النسبة والحالة */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                      <span className="text-foreground font-medium text-sm truncate max-w-[200px]">
                        {currentUploadStep || 'جاري الرفع...'}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>

                  {/* شريط التقدم */}
                  <div className="relative w-full h-3 bg-muted">
                    <div 
                      className="h-full transition-all duration-300 ease-out relative"
                      style={{ 
                        width: `${uploadProgress}%`,
                        background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 50%, hsl(var(--primary)) 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s ease-in-out infinite'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </div>
                  </div>

                  {/* الجزء السفلي: تفاصيل */}
                  <div className="flex justify-between items-center px-4 py-2 text-xs text-muted-foreground">
                    <span>
                      {uploadProgress < 15 ? '📋 التحقق من البيانات...' :
                       uploadProgress < 85 ? '📤 جاري رفع الملفات...' :
                       uploadProgress < 95 ? '⚙️ معالجة الملفات...' :
                       uploadProgress >= 100 ? '✅ اكتمل الرفع!' :
                       '⏳ جاري الحفظ...'}
                    </span>
                    {bookFileInfo && bookFileInfo.size > 10 * 1024 * 1024 && uploadProgress > 10 && uploadProgress < 80 && (
                      <span>🔄 ملف كبير - يرجى الصبر</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Check className="h-4 w-4 text-green-600 ml-2" />
              <span className="font-semibold">معلومات مهمة - نظام التحقق من الكتب</span>
            </div>
            <p>
              يتم التحقق تلقائياً من وجود الكتاب في الموقع لتجنب التكرار. 
              سيتم مراجعة كتابك خلال <strong>72 ساعة</strong> من تاريخ الإرسال.
            </p>
            <p className="mt-2 text-xs">
              <strong>ملاحظة:</strong> إذا كان كتابك إصداراً مختلفاً من كتاب موجود، يرجى تعديل العنوان ليعكس الاختلاف
            </p>
            {diagnosticInfo?.isMobile && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                📱 نظام رفع محسن للهواتف - تأكد من اتصال مستقر
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default BookSubmissionForm;
