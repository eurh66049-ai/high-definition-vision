import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import clickSound from '/click-sound.mp3';
import * as authUtils from '@/utils/authUtils';
import { toast } from 'sonner';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string, name?: string, captchaToken?: string, birthDate?: string) => Promise<{ error?: any; needsEmailConfirmation?: boolean; email?: string }>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: any }>;
  loading: boolean;
  isEmailRegistered: (email: string) => Promise<boolean>;
  resendConfirmationEmail: (email: string, captchaToken?: string) => Promise<{ error?: any, cooldownSeconds?: number }>;
  resendCooldown: number;
  verifyOTP: (email: string, token: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const MINIMUM_RESEND_DELAY = 60;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  
  // Defer audio loading to avoid blocking initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof Audio !== 'undefined') {
        setAudio(new Audio(clickSound));
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // يساعد في تمييز (تسجيل الخروج من كل الأجهزة) عن تسجيل الخروج العادي لتجنب رسائل غير دقيقة
  const pendingGlobalSignOutRef = useRef(false);
  const revalidatingSessionRef = useRef(false);
  // يُمكّن إظهار toast "تم تسجيل الخروج" فقط عند تسجيل خروج صريح من المستخدم
  const explicitSignOutRef = useRef(false);
  // يتتبع إذا كان لدينا جلسة فعلية قبل حدث SIGNED_OUT (لتجنب الرسائل الكاذبة عند token فاسد)
  const hadSessionRef = useRef(false);
  // يتتبع آخر وقت لتسجيل الدخول لتجاهل أحداث SIGNED_OUT المباشرة بعده
  const lastSignInAtRef = useRef<number>(0);

  const navigate = useCallback((path: string) => {
    window.location.href = path;
  }, []);

  const playSound = () => {
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(err => console.log('Error playing sound:', err));
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    console.log("Setting up auth state change listener");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const hadSession = hadSessionRef.current;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        hadSessionRef.current = !!newSession;

        if (event === 'SIGNED_IN' && newSession?.user) {
          lastSignInAtRef.current = Date.now();
          // التحقق من أن هذا ليس عملية إعادة تعيين كلمة المرور
          const currentPath = window.location.pathname;
          if (currentPath !== '/reset-password') {
            playSound();
            // إذا كان تسجيل الدخول عبر Google، حفظ صورة الملف الشخصي
            if (newSession.user.app_metadata?.provider === 'google') {
              setTimeout(async () => {
                await updateGoogleAvatarForExistingUser(newSession.user);
              }, 1000);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // تجاهل أحداث SIGNED_OUT الكاذبة:
          // 1. إذا لم تكن هناك جلسة فعلية من قبل (token فاسد في التخزين)
          // 2. إذا حدث ذلك مباشرة بعد تسجيل الدخول (أقل من 3 ثوانٍ)
          const timeSinceSignIn = Date.now() - lastSignInAtRef.current;
          const isFalseSignOut = !hadSession || (lastSignInAtRef.current > 0 && timeSinceSignIn < 3000);

          if (isFalseSignOut && !explicitSignOutRef.current) {
            console.log('Ignoring false SIGNED_OUT event (no prior session or just after sign-in)');
            return;
          }

          playSound();

          if (pendingGlobalSignOutRef.current) {
            pendingGlobalSignOutRef.current = false;
            toast.info("تم تسجيل الخروج من جميع الأجهزة", {
              description: "تم إنهاء جميع الجلسات النشطة لهذا الحساب"
            });
          } else if (explicitSignOutRef.current) {
            toast.info("تم تسجيل الخروج", {
              description: "نتمنى أن نراك مرة أخرى قريبًا"
            });
          }
          explicitSignOutRef.current = false;
        } else if (event === 'PASSWORD_RECOVERY') {
          // عند استلام رابط إعادة تعيين كلمة المرور، توجيه المستخدم لصفحة إعادة التعيين
          console.log('Password recovery event detected');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      hadSessionRef.current = !!currentSession;
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // إعادة التحقق من الجلسة بشكل دوري/عند الرجوع للتبويب، حتى يتم اكتشاف تسجيل الخروج من جهاز آخر بسرعة
  const revalidateSession = useCallback(async () => {
    if (revalidatingSessionRef.current) return;
    revalidatingSessionRef.current = true;

    try {
      const { error } = await supabase.auth.refreshSession();

      // تسجيل الخروج فقط عند أخطاء المصادقة الحقيقية (مثل إلغاء الجلسة)
      // وليس عند أخطاء الشبكة أو timeout
      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        const isAuthError = 
          errorMsg.includes('refresh_token') ||
          errorMsg.includes('invalid') ||
          errorMsg.includes('expired') ||
          errorMsg.includes('not found') ||
          errorMsg.includes('session_not_found') ||
          error.status === 401 || 
          error.status === 403;
        
        if (isAuthError) {
          console.log('Auth error detected, signing out:', errorMsg);
          await supabase.auth.signOut();
        } else {
          console.warn('Transient session refresh error (not signing out):', errorMsg);
        }
      }
    } catch (e) {
      // أخطاء الشبكة لا تسبب تسجيل الخروج
      console.warn('Network error during session refresh:', e);
    } finally {
      revalidatingSessionRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    const handleFocus = () => {
      void revalidateSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void revalidateSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, revalidateSession]);

  useEffect(() => {
    if (!session) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void revalidateSession();
      }
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [session, revalidateSession]);

  // دالة لتحديث صورة Google للمستخدمين الجدد فقط (لا تستبدل الصور المخصصة)
  const updateGoogleAvatarForExistingUser = async (user: any) => {
    try {
      const googleAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      
      if (googleAvatarUrl) {
        console.log('Checking Google avatar for existing user:', googleAvatarUrl);
        
        // جلب الملف الشخصي الحالي
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        // تحديث الصورة فقط إذا لم تكن موجودة (للمستخدمين الجدد)
        // لا نستبدل الصور المخصصة إذا كانت موجودة
        if (!currentProfile?.avatar_url) {
          await supabase
            .from('profiles')
            .update({ avatar_url: googleAvatarUrl })
            .eq('id', user.id);
          
          console.log('Google avatar added for new user');
        } else {
          console.log('User already has custom avatar, preserving it:', currentProfile.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error updating Google avatar:', error);
    }
  };

  // --- حذف أي كود متعلق بالتحقق، الإبقاء فقط على التحقق من البريد المكرر ---
  const isEmailRegistered = async (email: string): Promise<boolean> => {
    if (!email || !email.includes('@')) {
      return false;
    }
    try {
      const emailToCheck = email.toLowerCase().trim();
      const { data, error } = await supabaseFunctions.functions.invoke('check-email-exists', {
        body: { email: emailToCheck }
      });
      if (error) {
        console.error('خطأ في التحقق من البريد الإلكتروني:', error);
        return false;
      }
      return data?.exists === true;
    } catch (error) {
      console.error('خطأ غير متوقع عند التحقق من البريد الإلكتروني:', error);
      return false;
    }
  };

  // إعادة إرسال رمز التحقق OTP
  const resendConfirmationEmail = async (email: string, captchaToken?: string) => {
    if (resendCooldown > 0) {
      return { cooldownSeconds: resendCooldown };
    }

    try {
      const emailToUse = email.toLowerCase().trim();
      // إرسال رمز OTP للبريد الإلكتروني
      const { error } = await supabase.auth.signInWithOtp({
        email: emailToUse,
        options: {
          shouldCreateUser: false, // لا نريد إنشاء مستخدم جديد، فقط إرسال رمز التحقق
          captchaToken: captchaToken
        }
      });

      if (error) {
        if (error.message?.includes('429') || error.status === 429) {
          toast.error("الرجاء الانتظار", {
            description: "تم إرسال عدة رسائل. انتظر قليلاً قبل المحاولة مرة أخرى."
          });
          setResendCooldown(120);
          return { cooldownSeconds: 120 };
        }
        throw error;
      }

      toast.success("تم إرسال رمز التحقق", {
        description: "تحقق من بريدك الإلكتروني للحصول على رمز التحقق المكون من 6 أرقام"
      });
      
      setResendCooldown(MINIMUM_RESEND_DELAY);
      return { cooldownSeconds: MINIMUM_RESEND_DELAY };
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      toast.error("فشل إرسال رمز التحقق", {
        description: error.message || "حدث خطأ أثناء إرسال رمز التحقق"
      });
      return { error };
    }
  };

  // التحقق من رمز OTP
  const verifyOTP = async (email: string, token: string) => {
    try {
      const emailToUse = email.toLowerCase().trim();
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailToUse,
        token,
        type: 'email'
      });

      if (error) {
        toast.error("رمز التحقق غير صحيح", {
          description: "يرجى التحقق من الرمز المدخل والمحاولة مرة أخرى"
        });
        return { error };
      }

      if (data?.session) {
        playSound();
        toast.success("تم التحقق بنجاح! 🎉", {
          description: "مرحباً بك في كتبي"
        });
        
        const redirectPath = localStorage.getItem('auth_redirect_path');
        if (redirectPath) {
          localStorage.removeItem('auth_redirect_path');
          navigate(redirectPath);
        } else {
          navigate('/');
        }
      }

      return {};
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error("فشل التحقق", {
        description: error.message || "حدث خطأ أثناء التحقق من الرمز"
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    try {
      const emailToUse = email.toLowerCase().trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
        options: captchaToken ? { captchaToken } : undefined
      });
      
      if (error) {
        // التحقق من خطأ عدم تأكيد البريد
        if (error.message?.includes('Email not confirmed') || 
            error.message?.includes('email_not_confirmed')) {
          toast.error("البريد غير مؤكد", {
            description: "يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد."
          });
          return { error, needsEmailConfirmation: true, email: emailToUse };
        }
        
        toast.error("بيانات غير صحيحة", {
          description: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        });
        return { error };
      }
      
      playSound();
      
      // التحقق من وجود مسار محفوظ للعودة إليه
      const redirectPath = localStorage.getItem('auth_redirect_path');
      if (redirectPath) {
        console.log('توجيه المستخدم من AuthContext إلى:', redirectPath);
        localStorage.removeItem('auth_redirect_path');
        navigate(redirectPath);
      } else {
        navigate('/');
      }
      
      return {};
    } catch (error: any) {
      toast.error("فشل تسجيل الدخول", {
        description: "بيانات غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور"
      });
      return { error };
    }
  };

  // تسجيل مستخدم جديد مع تأكيد البريد الإلكتروني
  const signUp = async (
    email: string,
    password: string,
    name?: string,
    captchaToken?: string,
    birthDate?: string
  ) => {
    try {
      const emailToUse = email.toLowerCase().trim();
      const birthDateKey = `pending_signup_birth_date:${emailToUse}`;

      // تنظيف أي قيمة قديمة (لتفادي حفظ تاريخ خاطئ في حال أعاد المستخدم المحاولة)
      if (birthDate && typeof window !== 'undefined') {
        localStorage.removeItem(birthDateKey);
      }
      
      // تحقق أنه غير مسجل سابقًا
      const isEmailExists = await isEmailRegistered(emailToUse);
      if (isEmailExists) {
        toast.error("البريد الإلكتروني مسجل بالفعل", {
          description: "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر."
        });
        return { error: { message: 'البريد الإلكتروني مسجل بالفعل.' } };
      }

      // إنشاء الحساب - سيتطلب تأكيد البريد الإلكتروني
      const signUpOptions = {
        email: emailToUse,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          captchaToken: captchaToken,
          data: {
            username: name || emailToUse.split('@')[0],
            full_name: name,
            signup_timestamp: new Date().toISOString()
          }
        }
      };

      const { data, error } = await supabase.auth.signUp(signUpOptions);

      // التعامل مع الأخطاء
      if (error) {
        if (birthDate && typeof window !== 'undefined') {
          localStorage.removeItem(birthDateKey);
        }

        if ((error.message && error.message.includes("429")) || error.status === 429) {
          toast.error("محاولات متكررة", {
            description: "يرجى الانتظار قليلاً قبل المحاولة من جديد."
          });
        } else {
          toast.error("فشل إنشاء الحساب", {
            description: error.message || "حدث خطأ أثناء محاولة إنشاء الحساب"
          });
        }
        return { error };
      }

      // تم إنشاء الحساب بنجاح - يحتاج المستخدم لتأكيد بريده
      if (data?.user) {
        // التحقق مما إذا كان المستخدم قد تم تأكيده مسبقاً (حالة نادرة)
        if (data.session) {
          // المستخدم مؤكد مسبقاً (مثلاً من OAuth)
          if (birthDate) {
            try {
              const { error: birthDateError } = await supabase
                .from('profiles')
                .update({ birth_date: birthDate })
                .eq('id', data.user.id);

              if (birthDateError) {
                console.error('Error saving birth date after signup:', birthDateError);
              }
            } catch (e) {
              console.error('Error saving birth date after signup:', e);
            }
          }

          playSound();
          toast.success("تم إنشاء الحساب بنجاح! 🎉", {
            description: "مرحباً بك في كتبي"
          });
          navigate('/');
          return {};
        } else {
          // المستخدم يحتاج لتأكيد بريده
          if (birthDate && typeof window !== 'undefined') {
            localStorage.setItem(birthDateKey, birthDate);
          }

          toast.success("تم إنشاء الحساب! 📧", {
            description: "تحقق من بريدك الإلكتروني لتأكيد حسابك قبل تسجيل الدخول"
          });
          return { needsEmailConfirmation: true, email: emailToUse };
        }
      } else {
        if (birthDate && typeof window !== 'undefined') {
          localStorage.removeItem(birthDateKey);
        }

        toast.error("تعذر إنشاء الحساب", {
          description: "لم يتمكن النظام من إنشاء الحساب. يرجى إعادة المحاولة."
        });
        return { error: { message: 'فشل في إنشاء الحساب' } };
      }
    } catch (error: any) {
      toast.error("فشل إنشاء الحساب", {
        description: error.message || "حدث خطأ أثناء محاولة إنشاء الحساب"
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      playSound();
      explicitSignOutRef.current = true;
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      explicitSignOutRef.current = false;
      toast.error("خطأ في تسجيل الخروج", {
        description: "حدث خطأ أثناء محاولة تسجيل الخروج"
      });
    }
  };

  // تسجيل الخروج من جميع الأجهزة
  const signOutAllDevices = async () => {
    try {
      playSound();
      pendingGlobalSignOutRef.current = true;
      // استخدام scope: 'global' لتسجيل الخروج من جميع الجلسات
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        throw error;
      }
      navigate('/auth');
    } catch (error: any) {
      pendingGlobalSignOutRef.current = false;
      toast.error("خطأ في تسجيل الخروج", {
        description: error.message || "حدث خطأ أثناء محاولة تسجيل الخروج من جميع الأجهزة"
      });
    }
  };

  // وظيفة حذف الحساب بشكل كامل
  const deleteAccount = async () => {
    if (!user) return { error: { message: "المستخدم غير مسجل الدخول" } };
    
    try {
      console.log("بدء عملية حذف الحساب للمستخدم:", user.id);
      
      // 1. حذف جميع سجلات تقدم القراءة المرتبطة بالمستخدم
      const { error: readingProgressError } = await supabase
        .from('reading_progress')
        .delete()
        .eq('user_id', user.id);
      
      if (readingProgressError) {
        console.warn('Error deleting reading progress:', readingProgressError);
      }
      
      // 2. حذف جميع مراجعات الكتب المرتبطة بالمستخدم
      const { error: reviewsError } = await supabase
        .from('book_reviews')
        .delete()
        .eq('user_id', user.id);
      
      if (reviewsError) {
        console.warn('Error deleting book reviews:', reviewsError);
      }
      
      // 3. حذف جميع توصيات الكتب المرتبطة بالمستخدم
      const { error: recommendationsError } = await supabase
        .from('book_recommendations')
        .delete()
        .eq('user_id', user.id);
      
      if (recommendationsError) {
        console.warn('Error deleting book recommendations:', recommendationsError);
      }
      
      // 4. حذف الملف الشخصي للمستخدم من جدول profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) {
        console.warn('Error deleting profile:', profileError);
      }
      
      // 5. محاولة حذف الصورة الرمزية إذا كانت موجودة
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
          
        if (profileData?.avatar_url) {
          await supabase.storage
            .from('avatars')
            .remove([profileData.avatar_url]);
        }
      } catch (storageError) {
        console.warn('Error deleting avatar:', storageError);
      }
      
      // 6. استدعاء وظيفة Edge Function لحذف المستخدم من جدول auth.users
      console.log("استدعاء وظيفة حذف المستخدم باستخدام Edge Function");
      const { data, error: deleteUserError } = await supabaseFunctions.functions.invoke('delete-user', {
        body: { userId: user.id }
      });
      
      if (deleteUserError) {
        console.error("خطأ في حذف المستخدم:", deleteUserError);
        throw deleteUserError;
      }
      
      console.log("نتيجة استدعاء حذف المستخدم:", data);
      
      // 7. تسجيل الخروج
      await signOut();
      
      playSound();
      toast.success("تم حذف الحساب", {
        description: "تم حذف حسابك بنجاح بشكل كامل من النظام"
      });
      
      navigate('/');
      return {};
      
    } catch (error: any) {
      console.error('خطأ في حذف الحساب:', error);
      toast.error("خطأ في حذف الحساب", {
        description: error.message || "حدث خطأ أثناء محاولة حذف حسابك، يرجى المحاولة مرة أخرى"
      });
      return { error };
    }
  };

  const value: AuthContextProps = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    signOutAllDevices,
    deleteAccount,
    loading,
    isEmailRegistered,
    resendConfirmationEmail,
    resendCooldown,
    verifyOTP
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
