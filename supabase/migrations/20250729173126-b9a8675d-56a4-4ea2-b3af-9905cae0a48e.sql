-- حذف الـ trigger المكرر لعدد المتابعين
DROP TRIGGER IF EXISTS update_followers_count_trigger ON public.author_followers;

-- التأكد من وجود trigger واحد فقط
-- الاحتفاظ بـ update_author_followers_count_trigger الذي هو الأصلي

-- إعادة تعيين عدد المتابعين الصحيح لجميع المؤلفين
UPDATE public.authors 
SET followers_count = (
  SELECT COUNT(*) 
  FROM public.author_followers af 
  WHERE af.author_id = authors.id
);