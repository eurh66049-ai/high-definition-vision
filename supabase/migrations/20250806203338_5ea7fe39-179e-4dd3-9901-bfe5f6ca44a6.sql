-- تعديل RLS policies للاقتباسات للسماح بالقراءة العامة بدون تسجيل دخول
DROP POLICY IF EXISTS "Anyone can view quotes with user info" ON public.quotes;

-- إنشاء policy جديدة للقراءة العامة
CREATE POLICY "Public can view all quotes" 
ON public.quotes 
FOR SELECT 
USING (true);

-- التأكد من أن الـ policies الأخرى ما زالت تعمل للمستخدمين المسجلين
-- (policies الإدراج والتعديل والحذف تبقى كما هي للمستخدمين المسجلين فقط)