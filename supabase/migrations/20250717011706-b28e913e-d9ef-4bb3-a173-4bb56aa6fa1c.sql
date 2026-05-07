-- تحديث قيود الجنس لتكون ذكر أو أنثى فقط
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_gender_check 
CHECK (gender IN ('male', 'female'));