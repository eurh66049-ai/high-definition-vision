-- إضافة عمود التوثيق إلى جدول profiles
ALTER TABLE public.profiles 
ADD COLUMN is_verified BOOLEAN DEFAULT false;

-- إنشاء جدول لتتبع عمليات شراء شارة التوثيق
CREATE TABLE public.verification_purchases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paypal_payment_id TEXT,
    paypal_payer_id TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 2.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    verified_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS على الجدول الجديد
ALTER TABLE public.verification_purchases ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can view their own verification purchases" 
ON public.verification_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification purchases" 
ON public.verification_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update verification purchases" 
ON public.verification_purchases 
FOR UPDATE 
USING (true);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_verification_purchases_user_id ON public.verification_purchases(user_id);
CREATE INDEX idx_verification_purchases_paypal_payment_id ON public.verification_purchases(paypal_payment_id);

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION public.update_verification_purchases_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_verification_purchases_updated_at
BEFORE UPDATE ON public.verification_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_verification_purchases_updated_at();

-- إنشاء دالة لتحديث حالة التوثيق عند الدفع الناجح
CREATE OR REPLACE FUNCTION public.mark_user_as_verified(p_user_id UUID, p_payment_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- تحديث حالة التوثيق في profiles
  UPDATE public.profiles 
  SET is_verified = true 
  WHERE id = p_user_id;
  
  -- تحديث حالة الدفع
  UPDATE public.verification_purchases 
  SET 
    payment_status = 'completed',
    verified_date = now(),
    updated_at = now()
  WHERE user_id = p_user_id AND paypal_payment_id = p_payment_id;
  
  RETURN true;
END;
$function$;