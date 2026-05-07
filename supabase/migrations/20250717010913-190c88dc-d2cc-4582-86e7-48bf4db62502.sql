-- إضافة حقل الجنس إلى جدول الملفات الشخصية
ALTER TABLE public.profiles 
ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));