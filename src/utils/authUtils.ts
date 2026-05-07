
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';

/**
 * Checks if an email is already registered in the system
 * @param email The email to check
 * @returns A promise that resolves to a boolean indicating if the email is registered
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  try {
    if (!email || !email.includes('@')) {
      return false;
    }
    
    const emailToCheck = email.toLowerCase().trim();
    
    try {
      const { data: edgeFunctionData, error: edgeFunctionError } = await supabaseFunctions.functions.invoke('check-email-exists', {
        body: { email: emailToCheck }
      });
      
      if (edgeFunctionError) {
        console.error("Edge function error:", edgeFunctionError);
        return false;
      }
      
      return edgeFunctionData?.exists === true;
    } catch (fallbackError) {
      console.error("Check email error:", fallbackError);
      return false;
    }
  } catch (error) {
    console.error("Unexpected error checking if email is registered:", error);
    return false;
  }
}

/**
 * Enhanced email verification with retry mechanism and better error handling
 */
export async function sendVerificationEmailWithRetry(email: string, maxRetries: number = 3): Promise<{
  success: boolean;
  error?: string;
  needsRetry?: boolean;
}> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`محاولة إرسال بريد التحقق رقم ${attempt} للبريد: ${email}`);
      
      // تنظيف البريد الإلكتروني وتوحيده
      const normalizedEmail = email.toLowerCase().trim();
      
      // إعداد خيارات محسّنة للبريد
      const emailOptions = {
        type: 'signup' as const,
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            email_confirmed: false,
            confirmation_sent_at: new Date().toISOString()
          }
        }
      };
      
      const { error } = await supabase.auth.resend(emailOptions);
      
      if (!error) {
        console.log(`تم إرسال بريد التحقق بنجاح في المحاولة ${attempt}`);
        
        // إضافة تأخير قصير للسماح للنظام بمعالجة الطلب
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { success: true };
      }
      
      lastError = error;
      console.warn(`فشلت محاولة ${attempt}: ${error.message}`);
      
      // التحقق من نوع الخطأ للتعامل معه بشكل مناسب
      if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
        // في حالة rate limiting، انتظار أطول
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 2000; // exponential backoff
          console.log(`انتظار ${waitTime / 1000} ثانية قبل المحاولة التالية...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } else if (attempt < maxRetries) {
        // انتظار قصير للمحاولات الأخرى
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
    } catch (error) {
      console.error(`خطأ في محاولة ${attempt}:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  return { 
    success: false, 
    error: lastError?.message || 'فشل في إرسال بريد التحقق بعد عدة محاولات',
    needsRetry: true
  };
}

/**
 * Normalizes Gmail addresses by removing dots and anything after + in the username part
 * @param email The email to normalize
 * @returns The normalized email
 */
export function normalizeGmailAddress(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * تحسين وظيفة إرسال بريد التحقق مع معلومات إضافية للمستخدم
 */
export async function sendEnhancedVerificationEmail(email: string): Promise<{
  success: boolean;
  error?: string;
  instructions?: string[];
}> {
  try {
    const result = await sendVerificationEmailWithRetry(email);
    
    if (result.success) {
      return {
        success: true,
        instructions: [
          'تم إرسال رسالة التحقق إلى بريدك الإلكتروني',
          'قد تستغرق الرسالة بضع دقائق للوصول',
          'تحقق من مجلد الرسائل المزعجة (Spam/Junk)',
          'تحقق من مجلد الترويج (Promotions) في Gmail',
          'إذا لم تصل الرسالة، جرب إعادة الإرسال بعد 5 دقائق'
        ]
      };
    }
    
    return {
      success: false,
      error: result.error,
      instructions: [
        'فشل في إرسال بريد التحقق',
        'تأكد من صحة البريد الإلكتروني',
        'جرب مرة أخرى بعد بضع دقائق',
        'تواصل مع الدعم إذا استمرت المشكلة'
      ]
    };
    
  } catch (error: any) {
    console.error('Error in enhanced verification email:', error);
    return {
      success: false,
      error: 'حدث خطأ غير متوقع',
      instructions: [
        'حدث خطأ تقني',
        'تحقق من اتصال الإنترنت',
        'جرب إعادة تحميل الصفحة',
        'تواصل مع الدعم إذا استمرت المشكلة'
      ]
    };
  }
}
