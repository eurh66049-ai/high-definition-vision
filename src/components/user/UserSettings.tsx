import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Upload, User, LogOut, Flag, Save, Camera, X, Check, Trash2, Lock, Eye, EyeOff, Shield, Library, BarChart3 } from 'lucide-react';
import { lazy, Suspense } from 'react';
const ReaderStatsCard = lazy(() => import('@/components/profile/ReaderStatsCard'));
const MonthlyReadingReport = lazy(() => import('@/components/reading/MonthlyReadingReport'));
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { allCountries, getCountryFlag, getCountryByCode } from '@/data/countries';
import { extractWhatsAppNumberFromStored, normalizeWhatsAppNumberInput } from '@/utils/whatsapp';
import VerifiedBadge from '@/components/icons/VerifiedBadge';
import SocialLinksSection from './SocialLinksSection';
import { VirtualReadingRoom } from '@/components/profile/VirtualReadingRoom';
import { useStories } from '@/hooks/useStories';
import StoryViewer from '@/components/stories/StoryViewer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const STORAGE_BUCKET = 'avatars';

const UserSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const { stories, hasMyStory } = useStories();
  const myStoryGroup = stories.find(g => g.user.id === user?.id) || null;
  const [isVerified, setIsVerified] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [authorName, setAuthorName] = useState('');
  
  // تاريخ الميلاد - ثلاث حقول منفصلة
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  // روابط التواصل الاجتماعي
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    twitter: '',
    facebook: '',
    whatsapp: '',
    youtube: '',
    linkedin: '',
    tiktok: ''
  });

  // تتبع ما إذا كان هناك تعديلات للحفظ
  const [hasChanges, setHasChanges] = useState(false);
  
  // القيم الأصلية للمقارنة
  const [originalValues, setOriginalValues] = useState({
    username: '',
    bio: '',
    countryCode: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      facebook: '',
      whatsapp: '',
      youtube: '',
      linkedin: '',
      tiktok: ''
    }
  });

  // حالات تغيير كلمة المرور
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    { value: "01", label: "يناير" },
    { value: "02", label: "فبراير" },
    { value: "03", label: "مارس" },
    { value: "04", label: "أبريل" },
    { value: "05", label: "مايو" },
    { value: "06", label: "يونيو" },
    { value: "07", label: "يوليو" },
    { value: "08", label: "أغسطس" },
    { value: "09", label: "سبتمبر" },
    { value: "10", label: "أكتوبر" },
    { value: "11", label: "نوفمبر" },
    { value: "12", label: "ديسمبر" },
  ];
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  // تتبع التعديلات
  useEffect(() => {
    const socialLinksChanged = Object.keys(socialLinks).some(
      key => socialLinks[key as keyof typeof socialLinks] !== originalValues.socialLinks[key as keyof typeof socialLinks]
    );
    
    const changed = 
      username !== originalValues.username ||
      bio !== originalValues.bio ||
      countryCode !== originalValues.countryCode ||
      birthYear !== originalValues.birthYear ||
      birthMonth !== originalValues.birthMonth ||
      birthDay !== originalValues.birthDay ||
      avatarFile !== null ||
      socialLinksChanged;
    
    setHasChanges(changed);
  }, [username, bio, countryCode, birthYear, birthMonth, birthDay, avatarFile, socialLinks, originalValues]);

  // استخدام ref لتتبع ما إذا تم تحميل البيانات مسبقاً
  const dataLoadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // فقط تحميل البيانات إذا لم يتم تحميلها من قبل أو إذا تغير المستخدم
    if (user && (!dataLoadedRef.current || userIdRef.current !== user.id)) {
      fetchUserProfile();
      dataLoadedRef.current = true;
      userIdRef.current = user.id;
    }
  }, [user?.id]);

  const fetchUserProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [profileResult, authorResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, avatar_url, birth_date, country_code, bio, is_verified, social_instagram, social_twitter, social_facebook, social_whatsapp, social_youtube, social_linkedin, social_tiktok')
          .eq('id', user.id)
          .single(),
        supabase
          .from('authors')
          .select('id, name')
          .eq('user_id', user.id)
          .limit(1)
      ]);

      const { data, error } = profileResult;
      const { data: authorData } = authorResult;

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const usernameVal = data.username || '';
        const bioVal = data.bio || '';
        const countryVal = data.country_code || 'NONE';
        setUsername(usernameVal);
        setBio(bioVal);
        setCountryCode(countryVal);
        setIsVerified(data.is_verified || false);
        
        let yearVal = '';
        let monthVal = '';
        let dayVal = '';
        if (data.birth_date) {
          const date = new Date(data.birth_date);
          yearVal = date.getFullYear().toString();
          monthVal = (date.getMonth() + 1).toString().padStart(2, '0');
          dayVal = date.getDate().toString().padStart(2, '0');
          setBirthYear(yearVal);
          setBirthMonth(monthVal);
          setBirthDay(dayVal);
        }

        // تحميل روابط التواصل الاجتماعي (واتساب: نعرض الرقم كما هو مع + إن وُجد)
        const socialLinksVal = {
          instagram: data.social_instagram || '',
          twitter: data.social_twitter || '',
          facebook: data.social_facebook || '',
          whatsapp: extractWhatsAppNumberFromStored(data.social_whatsapp),
          youtube: data.social_youtube || '',
          linkedin: data.social_linkedin || '',
          tiktok: data.social_tiktok || ''
        };
        setSocialLinks(socialLinksVal);

        // حفظ القيم الأصلية
        setOriginalValues({
          username: usernameVal,
          bio: bioVal,
          countryCode: countryVal,
          birthYear: yearVal,
          birthMonth: monthVal,
          birthDay: dayVal,
          socialLinks: socialLinksVal
        });

        if (authorData && authorData.length > 0) {
          setIsAuthor(true);
          setAuthorName(authorData[0].name || '');
        }
        
        if (data.avatar_url) {
          setAvatarUrl(data.avatar_url);
          if (data.avatar_url.startsWith('http')) {
            setAvatarPreview(data.avatar_url);
          } else {
            const { data: urlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(data.avatar_url);
            if (urlData?.publicUrl) {
              setAvatarPreview(urlData.publicUrl);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("حدث خطأ أثناء تحميل بيانات ملفك الشخصي");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.includes('image')) {
      toast.error("الرجاء اختيار صورة صالحة");
      return;
    }
    
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatarPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!user || !avatarFile) return null;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const uniqueId = uuidv4().slice(0, 8);
      const timestamp = new Date().getTime();
      const fileName = `${user.id}/${uniqueId}_${timestamp}.${fileExt}`;
      
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
          clearInterval(progressInterval);
          setUploadProgress(90);
        } else {
          setUploadProgress(progress);
        }
      }, 200);
      
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        await supabase.storage.from(STORAGE_BUCKET).remove([avatarUrl]);
      }
      
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      clearInterval(progressInterval);
      
      if (error) throw error;
      
      setUploadProgress(100);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);
      
      if (urlData?.publicUrl) {
        setAvatarUrl(fileName);
        setAvatarPreview(urlData.publicUrl);
        setAvatarFile(null); // إخفاء الأزرار بعد الحفظ بنجاح
      }
      
      toast.success("تم تحديث صورتك الشخصية بنجاح");
      return fileName;
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error("حدث خطأ أثناء تحديث صورتك الشخصية");
      return null;
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    
    try {
      // حذف الصورة من التخزين إذا كانت موجودة
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        await supabase.storage.from(STORAGE_BUCKET).remove([avatarUrl]);
      }
      
      // تحديث قاعدة البيانات لإزالة الصورة
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setAvatarUrl('');
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success("تم إزالة الصورة الشخصية بنجاح");
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast.error("حدث خطأ أثناء إزالة الصورة");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) {
          finalAvatarUrl = uploaded;
        } else {
          return;
        }
      }

      const selectedCountry = allCountries.find(c => c.code === countryCode);
      
      let birthDateValue = null;
      if (birthYear && birthMonth && birthDay) {
        birthDateValue = `${birthYear}-${birthMonth}-${birthDay}`;
      }

      // واتساب: نخزن الرقم بصيغة نظيفة (يسمح بـ + في البداية) بدل بناء رابط قد يفقد علامة +

      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          bio: bio.trim(),
          country_code: countryCode === 'NONE' ? null : countryCode,
          country_name: countryCode === 'NONE' ? null : selectedCountry?.name || null,
          avatar_url: finalAvatarUrl,
          birth_date: birthDateValue,
          social_instagram: socialLinks.instagram.trim() || null,
          social_twitter: socialLinks.twitter.trim() || null,
          social_facebook: socialLinks.facebook.trim() || null,
          social_whatsapp: normalizeWhatsAppNumberInput(socialLinks.whatsapp.trim()),
          social_youtube: socialLinks.youtube.trim() || null,
          social_linkedin: socialLinks.linkedin.trim() || null,
          social_tiktok: socialLinks.tiktok.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // تحديد ما الذي تم تغييره لإرسال إشعار مناسب
      const changes: string[] = [];
      
      // التحقق من تغيير الصورة
      if (avatarFile) {
        changes.push("صورة الملف الشخصي");
      }
      
      // التحقق من تغيير اسم المستخدم
      if (username.trim() !== originalValues.username) {
        changes.push("اسم المستخدم");
      }
      
      // التحقق من تغيير النبذة
      if (bio.trim() !== originalValues.bio) {
        changes.push("النبذة التعريفية");
      }
      
      // التحقق من تغيير الدولة
      if (countryCode !== originalValues.countryCode) {
        changes.push("الدولة");
      }
      
      // التحقق من تغيير تاريخ الميلاد
      if (birthYear !== originalValues.birthYear || 
          birthMonth !== originalValues.birthMonth || 
          birthDay !== originalValues.birthDay) {
        changes.push("تاريخ الميلاد");
      }
      
      // التحقق من تغيير روابط التواصل الاجتماعي
      const socialPlatformNames: Record<string, string> = {
        instagram: "إنستغرام",
        twitter: "إكس",
        facebook: "فيسبوك",
        whatsapp: "واتساب",
        youtube: "يوتيوب",
        linkedin: "لينكدإن",
        tiktok: "تيك توك"
      };
      
      const changedSocialLinks = Object.keys(socialLinks).filter(
        key => socialLinks[key as keyof typeof socialLinks].trim() !== originalValues.socialLinks[key as keyof typeof socialLinks]
      );
      
      if (changedSocialLinks.length > 0) {
        const platformNames = changedSocialLinks.map(key => socialPlatformNames[key]).join("، ");
        changes.push(`روابط التواصل (${platformNames})`);
      }

      // إنشاء رسالة الإشعار المناسبة
      let notificationTitle = "تم تحديث حسابك بنجاح ✓";
      let notificationMessage = "";
      
      if (changes.length === 1) {
        notificationMessage = `تم تحديث ${changes[0]} بنجاح`;
      } else if (changes.length > 1) {
        notificationMessage = `تم تحديث: ${changes.join("، ")}`;
      } else {
        notificationMessage = "تم حفظ التغييرات بنجاح";
      }

      // إرسال إشعار لقاعدة البيانات
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: notificationTitle,
          message: notificationMessage,
          type: "success"
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      setAvatarUrl(finalAvatarUrl);
      setAvatarFile(null);
      
      // تحديث القيم الأصلية
      const updatedSocialLinks = {
        instagram: socialLinks.instagram.trim(),
        twitter: socialLinks.twitter.trim(),
        facebook: socialLinks.facebook.trim(),
        whatsapp: socialLinks.whatsapp.trim(),
        youtube: socialLinks.youtube.trim(),
        linkedin: socialLinks.linkedin.trim(),
        tiktok: socialLinks.tiktok.trim()
      };
      
      setOriginalValues({
        username: username.trim(),
        bio: bio.trim(),
        countryCode: countryCode,
        birthYear,
        birthMonth,
        birthDay,
        socialLinks: updatedSocialLinks
      });
      setHasChanges(false);
      
      toast.success(notificationTitle, {
        description: notificationMessage,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("حدث خطأ أثناء تحديث معلومات حسابك");
    }
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  // تغيير كلمة المرور
  const handleChangePassword = async () => {
    if (!user) return;

    // التحقق من صحة المدخلات
    if (!newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }

    setIsChangingPassword(true);

    try {
      // تحديث كلمة المرور مباشرة (المستخدم مسجل دخوله بالفعل)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        if (updateError.message.includes('same as')) {
          toast.error("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
        } else {
          toast.error("حدث خطأ أثناء تغيير كلمة المرور");
        }
        return;
      }

      // إرسال إشعار لقاعدة البيانات
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: "تم تغيير كلمة المرور 🔒",
          message: "تم تغيير كلمة مرور حسابك بنجاح. إذا لم تقم بهذا الإجراء، يرجى التواصل معنا فوراً.",
          type: "security"
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // مسح الحقول
      setNewPassword('');
      setConfirmPassword('');

      toast.success("تم تغيير كلمة المرور بنجاح! 🔒", {
        description: "ستتلقى إشعاراً بالبريد الإلكتروني لتأكيد التغيير"
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-foreground">يجب تسجيل الدخول لعرض إعدادات الحساب</p>
          <Button 
            onClick={() => navigate('/auth')} 
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold"
          >
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  // عرض Skeleton Loader أثناء التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-8">
            <div className="h-12 w-64 bg-muted/50 rounded-lg mx-auto animate-pulse"></div>
            <div className="h-4 w-48 bg-muted/30 rounded mx-auto animate-pulse"></div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-lg">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-32 h-32 bg-muted/50 rounded-full animate-pulse"></div>
              <div className="h-8 w-40 bg-muted/50 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-lg space-y-6">
            <div className="h-6 w-32 bg-muted/50 rounded animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-12 w-full bg-muted/50 rounded-lg animate-pulse"></div>
              <div className="h-24 w-full bg-muted/50 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="bg-gradient-to-br from-background via-background to-muted/20 py-4 px-3 sm:py-6 sm:px-4 text-right">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-1 mb-4"
        >
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            إعدادات الحساب
          </h1>
          <p className="text-sm text-muted-foreground">قم بتخصيص ملفك الشخصي</p>
        </motion.div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="profile" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">الملف الشخصي</span>
              <span className="sm:hidden">الملف</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">إحصائياتي</span>
              <span className="sm:hidden">إحصائيات</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Library className="h-4 w-4" />
              مكتبتي
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              الأمان
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab Content */}
          <TabsContent value="profile" className="space-y-4">
            {/* Profile Picture Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300"
            >
               <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {hasMyStory ? (
                    /* عند وجود قصة: إظهار حلقة متدرجة + Popover بخيارين */
                    <Popover>
                      <PopoverTrigger asChild>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          className="relative cursor-pointer"
                          type="button"
                        >
                          <div className="w-[104px] h-[104px] sm:w-[120px] sm:h-[120px] rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                            <div className="w-full h-full rounded-full bg-background p-[2px]">
                              <Avatar className="w-full h-full shadow-xl">
                                <AvatarImage src={avatarPreview || undefined} alt={username} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
                                  {username.charAt(0).toUpperCase() || 'M'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        </motion.button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="center">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setShowStoryViewer(true)}
                            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-right"
                          >
                            <Eye className="w-5 h-5 text-primary" />
                            <span className="font-medium text-sm text-foreground">عرض قصتي</span>
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-right"
                          >
                            <Camera className="w-5 h-5 text-primary" />
                            <span className="font-medium text-sm text-foreground">تغيير الصورة</span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    /* عند عدم وجود قصة: الشكل العادي */
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="relative"
                    >
                      <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-primary/20 shadow-xl transition-all duration-300 group-hover:ring-primary/40">
                        <AvatarImage src={avatarPreview || undefined} alt={username} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
                          {username.charAt(0).toUpperCase() || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                      >
                        <Camera className="w-8 h-8 text-white" />
                      </button>
                    </motion.div>
                  )}

                  {isVerified && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 -right-1"
                    >
                      <VerifiedBadge className="w-7 h-7 sm:w-8 sm:h-8" />
                    </motion.div>
                  )}
                </div>

                <div className="text-center">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center justify-center gap-2">
                    {isAuthor && authorName ? authorName : username || "مستخدم جديد"}
                  </h2>
                  {!avatarFile && (
                    <div className="flex flex-col items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">انقر على الصورة لتغييرها</p>
                      {(avatarUrl || avatarPreview) && (
                        <button
                          onClick={removeAvatar}
                          className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          إزالة الصورة
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {avatarFile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full space-y-4"
                    >
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                        <Upload className="w-5 h-5 text-primary" />
                        <span className="text-sm flex-1 truncate">{avatarFile.name}</span>
                        <button
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : supabase.storage.from(STORAGE_BUCKET).getPublicUrl(avatarUrl).data.publicUrl) : null);
                          }}
                          className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </button>
                      </div>

                      {uploading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-2"
                        >
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              className="h-full bg-gradient-to-r from-primary via-accent to-primary"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري الرفع... {Math.round(uploadProgress)}%</span>
                          </div>
                        </motion.div>
                      )}

                      {!uploading && (
                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              setAvatarFile(null);
                              setAvatarPreview(avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : supabase.storage.from(STORAGE_BUCKET).getPublicUrl(avatarUrl).data.publicUrl) : null);
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            <X className="w-4 h-4 ml-2" />
                            إلغاء
                          </Button>
                          <Button
                            onClick={uploadAvatar}
                            disabled={uploading}
                            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          >
                            <Check className="w-4 h-4 ml-2" />
                            حفظ الصورة
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Personal Information Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center justify-end gap-2 text-foreground">
                المعلومات الشخصية
                <User className="w-4 h-4 text-primary" />
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs sm:text-sm font-medium flex items-center justify-end gap-1.5">
                    اسم المستخدم
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary transition-all duration-300 h-10 text-right"
                    placeholder="أدخل اسم المستخدم"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-xs sm:text-sm font-medium text-right block">
                    نبذة عني
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary transition-all duration-300 min-h-[80px] resize-none text-sm text-right"
                    placeholder="اكتب نبذة مختصرة عنك..."
                    dir="rtl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs sm:text-sm font-medium flex items-center justify-end gap-1.5">
                    الدولة
                    <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                  </Label>
                  <select
                    id="country"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm text-right"
                    dir="rtl"
                  >
                    <option value="NONE">اختر دولة</option>
                    {allCountries.filter(c => c.code !== 'NONE').map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Birth Date Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                تاريخ الميلاد
              </h3>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-xs sm:text-sm font-medium">السنة</Label>
                  <select
                    id="year"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full h-10 px-2 sm:px-3 rounded-lg bg-background/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
                  >
                    <option value="">السنة</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="month" className="text-xs sm:text-sm font-medium">الشهر</Label>
                  <select
                    id="month"
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full h-10 px-2 sm:px-3 rounded-lg bg-background/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
                  >
                    <option value="">الشهر</option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="day" className="text-xs sm:text-sm font-medium">اليوم</Label>
                  <select
                    id="day"
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="w-full h-10 px-2 sm:px-3 rounded-lg bg-background/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm"
                  >
                    <option value="">اليوم</option>
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Social Links Section */}
            <SocialLinksSection
              socialLinks={socialLinks}
              onSocialLinkChange={handleSocialLinkChange}
            />

            {/* Profile Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-2"
            >
              <Button
                onClick={handleSave}
                disabled={!hasChanges || uploading}
                className="w-full h-11 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary via-accent to-primary hover:opacity-90 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ التغييرات
              </Button>
              
              <Button
                onClick={signOut}
                variant="outline"
                className="w-full h-10 text-sm font-semibold border"
              >
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </Button>
            </motion.div>
          </TabsContent>

          {/* Library Tab Content */}
          <TabsContent value="library" className="space-y-4">
            {user && (
              <VirtualReadingRoom userId={user.id} username={username || 'أنا'} />
            )}
          </TabsContent>

          {/* Stats Tab Content */}
          <TabsContent value="stats" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-md"
            >
              <h3 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2 text-foreground font-tajawal">
                <BarChart3 className="w-5 h-5 text-primary" />
                إحصائيات القراءة
              </h3>
              <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <ReaderStatsCard />
              </Suspense>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-md"
            >
              <h3 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2 text-foreground font-tajawal">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                تقرير القراءة الشهري
              </h3>
              <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <MonthlyReadingReport />
              </Suspense>
            </motion.div>
          </TabsContent>

          {/* Security Tab Content */}
          <TabsContent value="security" className="space-y-4">
            {/* Change Password Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <Lock className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    تغيير كلمة المرور
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    قم بتحديث كلمة مرور حسابك للحفاظ على أمانه
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* كلمة المرور الجديدة */}
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs sm:text-sm font-medium">
                    كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-primary transition-all duration-300 h-10 pl-10"
                      placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* تأكيد كلمة المرور الجديدة */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium">
                    تأكيد كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-primary transition-all duration-300 h-10 pl-10"
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري التغيير...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 ml-2" />
                      تغيير كلمة المرور
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Security Tips Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-md"
            >
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                <Shield className="w-4 h-4 text-primary" />
                نصائح أمنية
              </h3>
              
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  استخدم كلمة مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  لا تشارك كلمة مرورك مع أي شخص
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  قم بتغيير كلمة المرور بشكل دوري للحفاظ على أمان حسابك
                </li>
              </ul>
            </motion.div>

          </TabsContent>
        </Tabs>
      </div>

      {/* عارض القصص من صفحة الملف الشخصي - بنفس شكل الصفحة الرئيسية */}
      {showStoryViewer && myStoryGroup && (() => {
        const myGroupIndex = stories.findIndex(g => g.user.id === user?.id);
        const handleNextGroup = () => {
          if (myGroupIndex < stories.length - 1) {
            // الانتقال للمجموعة التالية عبر إغلاق وإعادة فتح (نفس سلوك الصفحة الرئيسية)
            setShowStoryViewer(false);
          } else {
            setShowStoryViewer(false);
          }
        };
        const handlePreviousGroup = () => {
          if (myGroupIndex > 0) {
            setShowStoryViewer(false);
          }
        };
        return (
          <StoryViewer
            group={myStoryGroup}
            initialIndex={0}
            onClose={() => setShowStoryViewer(false)}
            onNextGroup={handleNextGroup}
            onPreviousGroup={handlePreviousGroup}
            hasNextGroup={myGroupIndex < stories.length - 1}
            hasPreviousGroup={myGroupIndex > 0}
          />
        );
      })()}
    </div>
  );
};

export default UserSettings;
