-- إضافة حقل تاريخ الميلاد إلى جدول profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date;

-- إضافة تعليق على الحقل
COMMENT ON COLUMN public.profiles.birth_date IS 'تاريخ ميلاد المستخدم';