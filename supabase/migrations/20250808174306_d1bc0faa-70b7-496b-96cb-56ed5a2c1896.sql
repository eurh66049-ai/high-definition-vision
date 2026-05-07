-- إضافة حقل للتحكم في إظهار زر المراسلة للمؤلفين
ALTER TABLE public.profiles 
ADD COLUMN allow_messaging boolean DEFAULT true;

-- إضافة تعليق على العمود
COMMENT ON COLUMN public.profiles.allow_messaging IS 'يتحكم في إظهار زر المراسلة في صفحة المؤلف';