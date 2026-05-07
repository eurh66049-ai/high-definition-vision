import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Eye, EyeOff, Mail, ArrowLeft, CheckCircle, RefreshCw, AlertCircle, CalendarIcon, Clock, CheckSquare, KeyRound, Sparkles, ShieldCheck } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from "framer-motion";
import { SEOHead } from '@/components/seo/SEOHead';
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { Card, CardContent } from '@/components/ui/card';

// Cloudflare Turnstile Site Key
const TURNSTILE_SITE_KEY = '0x4AAAAAACK9IROTagvIalhB';

interface AuthProps {}

const Auth: React.FC<AuthProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [otpValue, setOtpValue] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showPasswordResetOTP, setShowPasswordResetOTP] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordResetOtpValue, setPasswordResetOtpValue] = useState('');
  const [isVerifyingPasswordResetOtp, setIsVerifyingPasswordResetOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const { toast } = useToast();
  const { user, signIn, signUp, resendConfirmationEmail, resendCooldown, verifyOTP, isEmailRegistered } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasOAuthCode = Boolean(searchParams.get('code'));
  
  // التحقق من وجود البيانات المطلوبة لتسجيل الدخول
  const isSignInFormValid = email && password;
  const isSignUpFormValid = email && password && name && confirmPassword && agreeToTerms;

  useEffect(() => {
    const authCode = searchParams.get('code');
    if (!authCode) return;

    let isMounted = true;

    const handleOAuthCallback = async () => {
      try {
        setIsLoading(true);
        setLoginError('');

        const { error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          throw error;
        }

        if (isMounted) {
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('OAuth callback exchange error:', error);
        if (isMounted) {
          setLoginError('تعذر إكمال تسجيل الدخول عبر Google');
          toast({
            title: "تعذر إكمال تسجيل الدخول",
            description: "تمت العودة من Google لكن تعذر تثبيت الجلسة داخل الموقع",
            variant: "error"
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void handleOAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams, toast]);

  useEffect(() => {
    if (!user || hasOAuthCode) return;

    // التحقق من وجود مسار محفوظ للعودة إليه
    const redirectPath = localStorage.getItem('auth_redirect_path');
    console.log('مسار الإعادة التوجيه المحفوظ:', redirectPath);
    if (redirectPath) {
      console.log('إعادة توجيه المستخدم إلى:', redirectPath);
      localStorage.removeItem('auth_redirect_path');
      navigate(redirectPath, { replace: true });
    } else {
      console.log('لا يوجد مسار محفوظ، الانتقال للصفحة الرئيسية');
      navigate('/', { replace: true });
    }
  }, [user, navigate, hasOAuthCode]);

  // تنظيف النموذج عند تغيير التبويب
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setBirthYear('');
    setBirthMonth('');
    setBirthDay('');
    setAgreeToTerms(false);
    setLoginError('');
    setCaptchaToken(null);
    setTurnstileKey((k) => k + 1);
    turnstileRef.current?.reset();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetForm();
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setLoginError('');
      await supabase.auth.signOut({ scope: 'local' });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        console.error('Google sign in error:', error);
        setLoginError('حدث خطأ أثناء تسجيل الدخول بـ Google');
        toast({
          title: "خطأ في تسجيل الدخول",
          description: "حدث خطأ أثناء تسجيل الدخول بـ Google",
          variant: "error"
        });
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setLoginError('حدث خطأ أثناء تسجيل الدخول بـ Google');
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "حدث خطأ أثناء تسجيل الدخول بـ Google",
        variant: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!email || !password) {
      const errorMessage = "الرجاء إدخال البريد الإلكتروني وكلمة المرور";
      setLoginError(errorMessage);
      toast({
        title: "حقول مطلوبة",
        description: errorMessage,
        variant: "error"
      });
      return;
    }

    if (!captchaToken) {
      const errorMessage = "الرجاء إكمال التحقق الأمني";
      setLoginError(errorMessage);
      toast({
        title: "التحقق مطلوب",
        description: errorMessage,
        variant: "error"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await signIn(email, password, captchaToken);
      
      if (result.error) {
        // التحقق من عدم تأكيد البريد
        if ((result as any).needsEmailConfirmation) {
          // لا تعيد استخدام نفس Turnstile token (يسبب timeout-or-duplicate)
          setCaptchaToken(null);
          setTurnstileKey((k) => k + 1);
          setPendingVerificationEmail((result as any).email || email);
          setShowEmailVerification(true);
          return;
        }
        
        const errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        setLoginError(errorMessage);
        // إعادة تعيين Turnstile
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      }
      
    } catch (error) {
      console.error('Signin error:', error);
      const errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      setLoginError(errorMessage);
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name) {
      toast({
        title: "حقول مطلوبة",
        description: "الرجاء إدخال جميع الحقول المطلوبة",
        variant: "error"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "كلمات المرور غير متطابقة",
        description: "يرجى التأكد من تطابق كلمات المرور",
        variant: "error"
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "كلمة المرور قصيرة جداً",
        description: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل",
        variant: "error"
      });
      return;
    }

    if (!agreeToTerms) {
      toast({
        title: "الموافقة على الشروط",
        description: "يجب الموافقة على شروط الاستخدام",
        variant: "error"
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: "التحقق مطلوب",
        description: "الرجاء إكمال التحقق الأمني",
        variant: "error"
      });
      return;
    }
    
    const birthDateValue =
      birthYear && birthMonth && birthDay
        ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
        : undefined;

    setIsLoading(true);
    
    try {
      const result = await signUp(email, password, name, captchaToken, birthDateValue);
      
      if (result.error) {
        setCaptchaToken(null);
        turnstileRef.current?.reset();
        return;
      }
      
      // إذا تم إنشاء المستخدم بنجاح ويحتاج لتأكيد البريد
      if ((result as any).needsEmailConfirmation) {
        // لا تعيد استخدام نفس Turnstile token (يسبب timeout-or-duplicate)
        setCaptchaToken(null);
        setTurnstileKey((k) => k + 1);
        setPendingVerificationEmail((result as any).email || email);
        setShowEmailVerification(true);
      }
      
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "فشل التسجيل",
        description: error.message || "حدث خطأ أثناء التسجيل",
        variant: "error"
      });
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "البريد الإلكتروني مطلوب",
        description: "الرجاء إدخال البريد الإلكتروني",
        variant: "error"
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: "التحقق مطلوب",
        description: "الرجاء إكمال التحقق الأمني أولاً",
        variant: "error"
      });
      return;
    }

    setIsLoading(true);
    // استخدم token مرة واحدة فقط ثم اطلب token جديد (لتفادي timeout-or-duplicate)
    const tokenToUse = captchaToken;
    setCaptchaToken(null);
    setTurnstileKey((k) => k + 1);
    
    try {
      // التحقق أولاً من أن البريد مسجل في الموقع
      const emailExists = await isEmailRegistered(email);
      
      if (!emailExists) {
        toast({
          title: "البريد غير مسجل",
          description: "هذا البريد الإلكتروني غير مسجل في موقعنا. يرجى التحقق من البريد أو إنشاء حساب جديد.",
          variant: "error"
        });
        setIsLoading(false);
        return;
      }

      // إرسال OTP لإعادة تعيين كلمة المرور
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        captchaToken: tokenToUse,
      } as any);

      if (error) {
        throw error;
      }

      toast({
        title: "تم إرسال رمز التحقق",
        description: "تحقق من بريدك الإلكتروني للحصول على رمز التحقق",
        variant: "success"
      });

      setPasswordResetEmail(email);
      setForgotPassword(false);
      setShowPasswordResetOTP(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: "خطأ في إرسال الرمز",
        description: error.message || "حدث خطأ أثناء إرسال رمز التحقق",
        variant: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "البريد الإلكتروني مطلوب",
        description: "الرجاء التأكد من صحة البريد الإلكتروني",
        variant: "error"
      });
      return;
    }

    await resendConfirmationEmail(email);
  };

  // دالة التحقق من OTP لإعادة تعيين كلمة المرور
  const handleVerifyPasswordResetOTP = async () => {
    if (passwordResetOtpValue.length !== 6) {
      toast({
        title: "رمز غير مكتمل",
        description: "يرجى إدخال الرمز المكون من 6 أرقام",
        variant: "error"
      });
      return;
    }

    setIsVerifyingPasswordResetOtp(true);
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: passwordResetEmail,
        token: passwordResetOtpValue,
        type: 'recovery'
      });

      if (error) {
        throw error;
      }

      setOtpVerified(true);
      toast({
        title: "تم التحقق بنجاح",
        description: "يمكنك الآن إدخال كلمة المرور الجديدة",
        variant: "success"
      });
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast({
        title: "رمز غير صحيح",
        description: "الرمز المدخل غير صحيح أو منتهي الصلاحية",
        variant: "error"
      });
      setPasswordResetOtpValue('');
    } finally {
      setIsVerifyingPasswordResetOtp(false);
    }
  };

  // دالة تحديث كلمة المرور
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast({
        title: "حقول مطلوبة",
        description: "الرجاء إدخال كلمة المرور وتأكيدها",
        variant: "error"
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "كلمات المرور غير متطابقة",
        description: "يرجى التأكد من تطابق كلمات المرور",
        variant: "error"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "كلمة المرور قصيرة جداً",
        description: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل",
        variant: "error"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "تم تحديث كلمة المرور بنجاح! ✅",
        description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة",
        variant: "success"
      });

      // تسجيل الخروج وإعادة التوجيه لتسجيل الدخول
      await supabase.auth.signOut();
      
      // إعادة تعيين الحالة
      setShowPasswordResetOTP(false);
      setPasswordResetEmail('');
      setPasswordResetOtpValue('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtpVerified(false);
      setActiveTab('signin');
      
    } catch (error: any) {
      console.error('Update password error:', error);
      toast({
        title: "فشل في تحديث كلمة المرور",
        description: error.message || "حدث خطأ أثناء تحديث كلمة المرور",
        variant: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // دالة إعادة إرسال OTP لإعادة تعيين كلمة المرور
  const handleResendPasswordResetOTP = async () => {
    if (isResending || resendCooldown > 0) return;

    if (!captchaToken) {
      toast({
        title: "التحقق مطلوب",
        description: "يرجى إكمال التحقق الأمني أولاً ثم اضغط إعادة الإرسال",
        variant: "error"
      });
      return;
    }

    setIsResending(true);

    // استخدم token مرة واحدة فقط ثم اطلب token جديد
    const tokenToUse = captchaToken;
    setCaptchaToken(null);
    setTurnstileKey((k) => k + 1);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(passwordResetEmail, {
        captchaToken: tokenToUse,
      } as any);

      if (error) {
        throw error;
      }

      toast({
        title: "تم إعادة إرسال الرمز",
        description: "تحقق من بريدك الإلكتروني",
        variant: "success"
      });
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إعادة إرسال الرمز",
        variant: "error"
      });
    } finally {
      setIsResending(false);
    }
  };

  if (forgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 border border-border">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">نسيت كلمة المرور؟</h2>
            <p className="text-muted-foreground text-sm">
              أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق لإعادة تعيين كلمة المرور
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-12 py-3 bg-background border-border text-foreground placeholder-muted-foreground rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Captcha */}
            <div className="flex justify-center">
              <Turnstile
                key={`turnstile-${turnstileKey}-recover`}
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => setCaptchaToken(null)}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: 'dark' }}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !captchaToken}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-3 rounded-lg font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري إرسال الرمز...
                </>
              ) : (
                "إرسال رمز التحقق"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setForgotPassword(false);
                resetForm();
              }}
              className="w-full flex items-center justify-center text-primary hover:text-primary/80 py-2 font-medium"
            >
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة لتسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  // شاشة إدخال كلمة المرور الجديدة (بعد التحقق من OTP)
  if (showPasswordResetOTP && otpVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 pb-28">
        <div className="max-w-md w-full">
          <Card className="border-border shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-8 text-center border-b border-border">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-green-500/30">
                <ShieldCheck className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                إنشاء كلمة مرور جديدة
              </h2>
              <p className="text-muted-foreground text-sm">
                تم التحقق من هويتك بنجاح! أدخل كلمة المرور الجديدة
              </p>
            </div>

            <CardContent className="p-6">
              {/* Success Badge */}
              <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  تم التحقق من الرمز بنجاح
                </span>
              </div>

              {/* New Password Form */}
              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <KeyRound className="inline h-4 w-4 ml-1 text-primary" />
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full py-3 pl-12 bg-background border-border text-foreground rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <KeyRound className="inline h-4 w-4 ml-1 text-primary" />
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full py-3 pl-12 bg-background border-border text-foreground rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Match Indicator */}
                {confirmNewPassword && (
                  <div className={`flex items-center gap-2 text-sm ${newPassword === confirmNewPassword ? 'text-green-500' : 'text-red-500'}`}>
                    {newPassword === confirmNewPassword ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>كلمات المرور متطابقة</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span>كلمات المرور غير متطابقة</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Update Password Button */}
              <Button
                onClick={handleUpdatePassword}
                disabled={isLoading || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                className="w-full py-5 text-base font-bold rounded-lg mb-4 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري تحديث كلمة المرور...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-5 w-5" />
                    تحديث كلمة المرور
                  </>
                )}
              </Button>

              {/* Security Tips */}
              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 text-right">
                    <p className="font-semibold text-foreground">نصائح أمنية:</p>
                    <p className="text-muted-foreground">• استخدم 6 أحرف على الأقل</p>
                    <p className="text-muted-foreground">• أضف أرقام ورموز للأمان</p>
                    <p className="text-muted-foreground">• لا تشارك كلمة المرور مع أحد</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // شاشة إدخال رمز التحقق OTP لإعادة تعيين كلمة المرور
  if (showPasswordResetOTP && !otpVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 pb-28">
        <div className="max-w-md w-full">
          <Card className="border-border shadow-lg">
            {/* Header */}
            <div className="bg-primary/10 p-6 text-center border-b border-border">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                إعادة تعيين كلمة المرور
              </h2>
              <p className="text-muted-foreground text-sm mb-3">
                أدخل الرمز المكون من 6 أرقام المرسل إلى
              </p>
              <div className="inline-flex items-center gap-2 bg-muted text-foreground font-medium px-4 py-2 rounded-lg text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span className="break-all" dir="ltr">{passwordResetEmail}</span>
              </div>
            </div>

            <CardContent className="p-6">
              {/* OTP Input */}
              <div className="mb-6">
                <div className="flex justify-center mb-4" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={passwordResetOtpValue}
                    onChange={(value) => setPasswordResetOtpValue(value)}
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot 
                          key={index}
                          index={index} 
                          className="w-10 h-12 text-lg font-bold rounded-lg border-2 border-border bg-muted text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" 
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>الرمز صالح لمدة 10 دقائق</span>
                </div>
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerifyPasswordResetOTP}
                disabled={passwordResetOtpValue.length !== 6 || isVerifyingPasswordResetOtp}
                className="w-full py-5 text-base font-bold rounded-lg mb-4"
              >
                {isVerifyingPasswordResetOtp ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="ml-2 h-5 w-5" />
                    تأكيد الرمز
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-card text-xs text-muted-foreground">لم يصلك الرمز؟</span>
                </div>
              </div>

              {/* Captcha */}
              <div className="flex justify-center mb-4">
                <Turnstile
                  key={`turnstile-${turnstileKey}-recover-resend`}
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: 'dark' }}
                />
              </div>

              {/* Resend Button */}
              <Button
                onClick={handleResendPasswordResetOTP}
                disabled={resendCooldown > 0 || isResending || !captchaToken}
                variant="outline"
                className="w-full py-4 rounded-lg mb-3"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="ml-2 h-4 w-4" />
                    إعادة الإرسال بعد {resendCooldown} ثانية
                  </>
                ) : (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    إعادة إرسال الرمز
                  </>
                )}
              </Button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPasswordResetOTP(false);
                  setPasswordResetEmail('');
                  setPasswordResetOtpValue('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setOtpVerified(false);
                  resetForm();
                }}
                className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground py-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                العودة لتسجيل الدخول
              </button>

              {/* Help Tips */}
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 text-right">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">نصائح:</p>
                    <p className="text-muted-foreground">• تحقق من مجلد الرسائل المزعجة</p>
                    <p className="text-muted-foreground">• تأكد من صحة البريد الإلكتروني</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ملاحظة: عند الانتقال لشاشة التحقق نعمل إعادة mount للـ Turnstile عبر turnstileKey
  // لتفادي خطأ Supabase: captcha protection (timeout-or-duplicate)

  // شاشة تأكيد البريد الإلكتروني بـ OTP
  if (showEmailVerification) {
    const handleResendOTP = async () => {
      if (isResending || resendCooldown > 0) return;

      if (!captchaToken) {
        toast({
          title: "تحقق مطلوب",
          description: "يرجى إكمال التحقق الأمني أولاً ثم اضغط إعادة الإرسال",
          variant: "error"
        });
        return;
      }

      setIsResending(true);

      // استخدم token مرة واحدة فقط ثم اطلب token جديد
      const tokenToUse = captchaToken;
      setCaptchaToken(null);
      setTurnstileKey((k) => k + 1);

      try {
        await resendConfirmationEmail(pendingVerificationEmail, tokenToUse);
      } catch (error) {
        console.error('Error resending OTP:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إرسال رمز التحقق",
          variant: "error"
        });
      } finally {
        setIsResending(false);
      }
    };

    const handleVerifyOTP = async () => {
      if (otpValue.length !== 6) {
        toast({
          title: "رمز غير مكتمل",
          description: "يرجى إدخال الرمز المكون من 6 أرقام",
          variant: "error"
        });
        return;
      }

      setIsVerifyingOtp(true);
      const result = await verifyOTP(pendingVerificationEmail, otpValue);
      setIsVerifyingOtp(false);

      if (result.error) {
        setOtpValue(''); // مسح الرمز في حالة الخطأ
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 pb-28">
        <div className="max-w-md w-full">
          <Card className="border-border shadow-lg">
            {/* Header */}
            <div className="bg-primary/10 p-6 text-center border-b border-border">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                تحقق من بريدك الإلكتروني
              </h2>
              <p className="text-muted-foreground text-sm mb-3">
                أدخل الرمز المكون من 6 أرقام المرسل إلى
              </p>
              <div className="inline-flex items-center gap-2 bg-muted text-foreground font-medium px-4 py-2 rounded-lg text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span className="break-all" dir="ltr">{pendingVerificationEmail}</span>
              </div>
            </div>

            <CardContent className="p-6">
              {/* OTP Input */}
              <div className="mb-6">
                <div className="flex justify-center mb-4" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={(value) => setOtpValue(value)}
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot 
                          key={index}
                          index={index} 
                          className="w-10 h-12 text-lg font-bold rounded-lg border-2 border-border bg-muted text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" 
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>الرمز صالح لمدة 10 دقائق</span>
                </div>
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerifyOTP}
                disabled={otpValue.length !== 6 || isVerifyingOtp}
                className="w-full py-5 text-base font-bold rounded-lg mb-4"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="ml-2 h-5 w-5" />
                    تأكيد الرمز
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-card text-xs text-muted-foreground">لم يصلك الرمز؟</span>
                </div>
              </div>

              {/* Captcha */}
              <div className="flex justify-center mb-4">
                <Turnstile
                  key={`turnstile-${turnstileKey}-verify`}
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: 'dark' }}
                />
              </div>

              {/* Resend Button */}
              <Button
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || isResending || !captchaToken}
                variant="outline"
                className="w-full py-4 rounded-lg mb-3"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="ml-2 h-4 w-4" />
                    إعادة الإرسال بعد {resendCooldown} ثانية
                  </>
                ) : (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    إعادة إرسال الرمز
                  </>
                )}
              </Button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmailVerification(false);
                  setPendingVerificationEmail('');
                  setOtpValue('');
                  resetForm();
                }}
                className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground py-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                العودة لتسجيل الدخول
              </button>

              {/* Help Tips */}
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 text-right">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">نصائح:</p>
                    <p className="text-muted-foreground">• تحقق من مجلد الرسائل المزعجة</p>
                    <p className="text-muted-foreground">• تأكد من صحة البريد الإلكتروني</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEOHead
        title="تسجيل الدخول أو إنشاء حساب - منصة كتبي"
        description="سجّل دخولك أو أنشئ حساباً جديداً في منصة كتبي للوصول إلى آلاف الكتب العربية المجانية وإدارة مكتبتك الشخصية."
        noindex={true}
      />
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg overflow-hidden border border-border">

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* تسجيل الدخول */}
          <TabsContent value="signin" className="m-0">
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">تسجيل الدخول</h2>
                
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  type="button"
                  className="w-full h-12 px-6 bg-white dark:bg-[hsl(220,14%,16%)] hover:bg-gray-50 dark:hover:bg-[hsl(220,14%,20%)] text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-[hsl(220,12%,25%)] rounded-xl text-base font-semibold transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-3 mb-6 hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  دخول عبر Google
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">أو</span>
                  </div>
                </div>
              </div>

              {/* رسالة خطأ تسجيل الدخول - محدثة بألوان الوضع الداكن */}
              {loginError && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p className="text-destructive text-sm font-medium">{loginError}</p>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLoginError('');
                    }}
                    className="w-full py-3 bg-background border-border text-foreground placeholder-muted-foreground rounded-lg focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">كلمة المرور</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="كلمة المرور"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError('');
                      }}
                      className="w-full py-3 pl-12 bg-background border-border text-foreground placeholder-muted-foreground rounded-lg focus:ring-primary focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Cloudflare Turnstile CAPTCHA */}
                <div className="flex justify-center my-2">
                  <Turnstile
                    key={`turnstile-${turnstileKey}-auth`}
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{
                      theme: 'auto',
                      size: 'normal'
                    }}
                  />
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setForgotPassword(true)}
                    className="text-sm text-primary hover:text-primary/80 font-medium underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !isSignInFormValid}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${
                    isSignInFormValid && !isLoading
                      ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg transform hover:scale-105'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      تسجيل الدخول
                    </>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </Button>

                <div className="text-center">
                  <span className="text-muted-foreground">ليس لديك حساب بالفعل؟ </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="text-primary hover:text-primary/80 font-bold underline"
                  >
                    إنشاء حساب
                  </button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* إنشاء حساب جديد */}
          <TabsContent value="signup" className="m-0">
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">إنشاء حساب جديد</h2>
                
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  type="button"
                  className="w-full h-12 px-6 bg-white dark:bg-[hsl(220,14%,16%)] hover:bg-gray-50 dark:hover:bg-[hsl(220,14%,20%)] text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-[hsl(220,12%,25%)] rounded-xl text-base font-semibold transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-3 mb-6 hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  دخول عبر Google
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">أو</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="الاسم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full py-3 bg-background border-border text-foreground placeholder-muted-foreground rounded-lg focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <Input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-3 bg-background border-border text-foreground placeholder-muted-foreground rounded-lg focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-3 pl-12 bg-background border-border text-foreground placeholder-muted-foreground rounded-lg focus:ring-primary focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="تأكيد كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full py-3 pl-12 bg-background border-border text-foreground placeholder-muted-foreground rounded-lg focus:ring-primary focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">تاريخ الميلاد (اختياري)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="w-full py-3 px-3 bg-background border border-border text-foreground rounded-lg focus:ring-primary focus:border-primary"
                    >
                      <option value="">السنة</option>
                      {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      className="w-full py-3 px-3 bg-background border border-border text-foreground rounded-lg focus:ring-primary focus:border-primary"
                    >
                      <option value="">الشهر</option>
                      {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map((month, i) => (
                        <option key={i + 1} value={i + 1}>{month}</option>
                      ))}
                    </select>
                    
                    <select
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      className="w-full py-3 px-3 bg-background border border-border text-foreground rounded-lg focus:ring-primary focus:border-primary"
                    >
                      <option value="">اليوم</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cloudflare Turnstile CAPTCHA للتسجيل */}
                <div className="flex justify-center">
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{
                      theme: 'auto',
                      size: 'normal'
                    }}
                  />
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <input
                    type="checkbox"
                    id="agree"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="rounded border-border bg-background"
                  />
                  <label htmlFor="agree" className="text-sm text-foreground">
                    أوافق على شروط الاستخدام
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !isSignUpFormValid}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${
                    isSignUpFormValid && !isLoading
                      ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg transform hover:scale-105'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      إنشاء حساب
                    </>
                  ) : (
                    "إنشاء حساب"
                  )}
                </Button>

                <div className="text-center">
                  <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('signin')}
                    className="text-primary hover:text-primary/80 font-bold underline"
                  >
                    تسجيل الدخول
                  </button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
