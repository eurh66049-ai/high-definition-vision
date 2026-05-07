
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, MessageSquare, MessageCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import ReCaptcha from '@/components/recaptcha/ReCaptcha';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { isEmailRegistered } from '@/utils/authUtils';
import emailjs from '@emailjs/browser';
import { useIsMobile } from '@/hooks/use-mobile';
import { SEOHead } from '@/components/seo/SEOHead';
import { Toaster } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';

const ContactUs = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [supportUserId, setSupportUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState('');
  const { toast } = useToast();

  // إعدادات EmailJS الصحيحة
  const EMAILJS_SERVICE_ID = 'service_o4swomd';
  const EMAILJS_TEMPLATE_ID = 'template_ui3sxuo';
  const EMAILJS_PUBLIC_KEY = 'zh6IRPp_GDeIRdt_R';

  // إضافة reCAPTCHA hook
  const {
    isVerified,
    recaptchaToken,
    handleRecaptchaVerify,
    handleRecaptchaExpired,
    handleRecaptchaError,
    resetRecaptcha,
    siteKey
  } = useRecaptcha();

  // ملء البيانات تلقائياً من حساب المستخدم
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.username || user.email?.split('@')[0] || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // جلب معرف حساب الدعم
  useEffect(() => {
    const fetchSupportUserId = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'adileboura@gmail.com')
          .single();
        
        if (data && !error) {
          setSupportUserId(data.id);
        }
      } catch (error) {
        console.error('خطأ في جلب معرف حساب الدعم:', error);
      }
    };
    
    fetchSupportUserId();
  }, []);


  // إضافة سكريبت الإعلان

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // التحقق من البريد الإلكتروني للمستخدمين غير المسجلين
    if (name === 'email' && !user) {
      setEmailValidationError('');
      validateEmailForGuests(value);
    }
  };

  const validateEmailForGuests = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailValidationError('');
      return;
    }

    try {
      const emailExists = await isEmailRegistered(email);
      if (!emailExists) {
        setEmailValidationError('هذا البريد الإلكتروني غير مسجل في الموقع. يجب تسجيل الدخول أولاً لإرسال رسالة.');
      } else {
        setEmailValidationError('');
      }
    } catch (error) {
      console.error('خطأ في التحقق من البريد الإلكتروني:', error);
    }
  };

  const sendEmailWithEmailJS = async () => {
    try {
      console.log('إرسال البريد الإلكتروني باستخدام EmailJS...');
      
      // إرسال للدعم
      const supportTemplateParams = {
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        message: formData.message,
        to_email: 'support@kotobi.com',
        reply_to: formData.email,
        user_id: user?.id || 'غير مسجل'
      };

      const supportResponse = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        supportTemplateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log('تم إرسال البريد الإلكتروني للدعم بنجاح:', supportResponse);

      // إرسال تأكيد للمستخدم
      const confirmationTemplateParams = {
        from_name: 'فريق كتبي',
        from_email: 'noreply@kotobi.com',
        subject: 'تأكيد استلام رسالتك - موقع كتبي',
        message: `مرحباً ${formData.name}،

شكراً لتواصلك معنا. لقد تم استلام رسالتك بعنوان "${formData.subject}" بنجاح.

سيقوم فريقنا بمراجعة رسالتك والرد عليك في أقرب وقت ممكن.

مع تحيات فريق كتبي`,
        to_email: formData.email,
        reply_to: 'support@kotobi.com',
        user_id: user?.id || 'غير مسجل'
      };

      const confirmationResponse = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        confirmationTemplateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log('تم إرسال تأكيد للمستخدم بنجاح:', confirmationResponse);
      
      return { supportResponse, confirmationResponse };
    } catch (error) {
      console.error('خطأ في إرسال البريد الإلكتروني:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "⚠️ يجب تسجيل الدخول",
        description: "يجب عليك تسجيل الدخول أولاً لإرسال رسالة",
        variant: "destructive"
      });
      return;
    }

    // التحقق من وجود خطأ في التحقق من البريد الإلكتروني
    if (emailValidationError) {
      toast({
        title: "❌ خطأ في البريد الإلكتروني",
        description: emailValidationError,
        variant: "destructive"
      });
      return;
    }
    
    // التحقق من reCAPTCHA
    if (!isVerified || !recaptchaToken) {
      toast({
        title: "🔒 التحقق من الأمان مطلوب",
        description: "يرجى إكمال التحقق من reCAPTCHA قبل إرسال الرسالة",
        variant: "destructive"
      });
      return;
    }

    
    setIsSubmitting(true);

    try {
      console.log('بدء عملية إرسال الرسالة:', formData);
      
      // 1. إرسال البريد الإلكتروني عبر EmailJS (للدعم والمستخدم)
      await sendEmailWithEmailJS();
      console.log('تم إرسال البريد الإلكتروني بنجاح');
      
      // 2. حفظ الرسالة في قاعدة البيانات
      const { data: messageId, error: saveError } = await supabaseFunctions.functions.invoke('send-contact-message', {
        body: {
          user_id: user.id,
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message
        }
      });

      if (saveError) {
        console.error('خطأ في حفظ الرسالة في قاعدة البيانات:', saveError);
        // لا نوقف العملية لأن البريد الإلكتروني تم إرساله بنجاح
      } else {
        console.log('تم حفظ الرسالة في قاعدة البيانات بنجاح، معرف الرسالة:', messageId);
      }
      
      // إظهار إشعار النجاح
      toast({
        title: "✅ تم إرسال رسالتك بنجاح",
        description: "تم إرسال رسالتك وحفظها في النظام. تم إرسال تأكيد إلى بريدك الإلكتروني وسيتم الرد عليك قريباً.",
        variant: "default"
      });
      
      // إعادة تعيين النموذج
      setFormData(prev => ({
        ...prev,
        subject: '',
        message: ''
      }));
      
      // إعادة تعيين reCAPTCHA
      resetRecaptcha();
    } catch (error: any) {
      console.error('خطأ في إرسال الرسالة:', error);
      
      let errorMessage = "حدث خطأ أثناء إرسال رسالتك. يرجى المحاولة مرة أخرى.";
      
      if (error.text) {
        errorMessage = `خطأ في إرسال البريد الإلكتروني: ${error.text}`;
      } else if (error.message?.includes('لا يمكنك إرسال رسالة أخرى')) {
        errorMessage = "لا يمكنك إرسال رسالة أخرى حتى يمر أسبوع من آخر رسالة";
      }
      
      toast({
        title: "❌ خطأ في إرسال الرسالة",
        description: errorMessage,
        variant: "destructive"
      });
      
      // إعادة تعيين reCAPTCHA عند الخطأ
      resetRecaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="اتصل بنا - منصة كتبي"
        description="تواصل مع فريق منصة كتبي. نرحب بآرائكم ومقترحاتكم لتطوير وتحسين خدماتنا. أرسل رسالة إلى فريق الدعم."
        keywords="اتصل بنا, تواصل, دعم فني, منصة كتبي, خدمة العملاء"
        canonical="https://kotobi.xyz/contact-us"
      />
      <Navbar />
      
      <div className={`container mx-auto px-4 py-8 max-w-4xl ${isMobile ? 'contact-page-mobile' : 'pb-8'}`}>
        <div className="text-center mb-8">
          <MessageSquare className="h-16 w-16 mx-auto text-book-primary mb-4" />
          <h1 className="text-4xl font-black text-foreground mb-2">اتصل بنا</h1>
          <div className="text-foreground text-xl leading-relaxed font-bold max-w-3xl mx-auto">
            <p className="mb-3 text-2xl font-black">
              **نرحب بكم زوارنا الكرام ونقدّر تواصلكم الدائم معنا.**
            </p>
            <p className="mb-3 text-xl font-bold">
              نحن نستمع إلى آرائكم ومقترحاتكم بكل ترحاب، فهي دافعنا للتطوير والتحسين.
            </p>
            <p className="text-xl font-bold">
              يمكنكم مشاركتنا أفكاركم عبر قنوات التواصل المتاحة، وسنكون سعداء بكل رسالة تصلنا.
            </p>
          </div>
        </div>

        {/* قسم المراسلة الداخلية */}
        <Card className="max-w-2xl mx-auto mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground mb-2">
                  مراسلة دعم كتبي مباشرة
                </h3>
                <p className="text-muted-foreground font-bold mb-4">
                  يمكنك مراسلة فريق دعم كتبي مباشرة داخل الموقع للحصول على مساعدة سريعة
                </p>
              </div>
              {user ? (
                <Button
                  onClick={() => {
                    if (supportUserId) {
                      navigate(`/messages?userId=${supportUserId}`);
                    } else {
                      // فتح صفحة الملف الشخصي للدعم
                      navigate('/user/support kotobi');
                    }
                  }}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-black"
                  size="lg"
                >
                  <MessageCircle className="w-5 h-5 ml-2" />
                  راسل دعم كتبي الآن
                  <ExternalLink className="w-4 h-4 mr-2" />
                </Button>
              ) : (
                <div className="text-center p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg w-full">
                  <p className="text-foreground font-black">
                    ⚠️ يجب تسجيل الدخول أولاً لمراسلة فريق الدعم
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="max-w-2xl mx-auto">
          {!user && (
            <Card className="mb-6 bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-foreground font-black text-lg">
                    ⚠️ يجب تسجيل الدخول أولاً لإرسال رسالة إلى فريق الدعم
                  </p>
                </div>
              </CardContent>
            </Card>
          )}


          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center text-foreground font-black">
                <Send className="h-5 w-5" />
                أرسل رسالة إلى فريق الدعم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-foreground font-bold text-base">الاسم الكامل *</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="أدخل اسمك الكامل"
                      required
                      className="mt-1 bg-input border-border text-foreground font-bold"
                      disabled={isSubmitting || !user}
                      readOnly={!!user}
                    />
                    {user && (
                      <p className="text-xs text-muted-foreground mt-1 font-bold">
                        تم ملء هذا الحقل تلقائياً من حسابك
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-foreground font-bold text-base">البريد الإلكتروني *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="أدخل بريدك الإلكتروني"
                      required
                      className={`mt-1 bg-input border-border text-foreground font-bold ${emailValidationError ? 'border-red-500' : ''}`}
                      disabled={isSubmitting || !user}
                      readOnly={!!user}
                    />
                    {user && (
                      <p className="text-xs text-muted-foreground mt-1 font-bold">
                        تم ملء هذا الحقل تلقائياً من حسابك
                      </p>
                    )}
                    {emailValidationError && (
                      <p className="text-xs text-red-400 mt-1 font-bold">
                        {emailValidationError}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject" className="text-foreground font-bold text-base">الموضوع *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="موضوع رسالتك"
                    required
                    className="mt-1 bg-input border-border text-foreground font-bold"
                    disabled={isSubmitting || !user}
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-foreground font-bold text-base">الرسالة *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="اكتب رسالتك هنا..."
                    rows={6}
                    required
                    className="mt-1 bg-input border-border text-foreground font-bold"
                    disabled={isSubmitting || !user}
                  />
                </div>

                {/* إضافة reCAPTCHA */}
                {user && (
                  <div className="flex justify-center">
                    <ReCaptcha
                      siteKey={siteKey}
                      action="contact"
                      onVerify={handleRecaptchaVerify}
                      onExpired={handleRecaptchaExpired}
                      onError={handleRecaptchaError}
                      className="transform scale-90 origin-center"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-book-primary to-book-secondary hover:from-book-primary/90 hover:to-book-secondary/90 text-white font-black text-lg"
                  size="lg"
                  disabled={
                    isSubmitting || 
                    !user || 
                    !isVerified || 
                    !formData.subject.trim() || 
                    !formData.message.trim() ||
                    !!emailValidationError
                  }
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* إضافة شريط التنقل السفلي للجوال */}
      {isMobile && <BottomNavigation />}
      
      {/* إضافة Toaster لإظهار الإشعارات */}
      <Toaster />
    </div>
  );
};

export default ContactUs;
