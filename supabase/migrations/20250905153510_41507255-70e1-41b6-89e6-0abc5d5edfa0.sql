-- حذف جميع الرسائل اليومية المتعلقة بتحديث صور المؤلفين
DELETE FROM public.daily_messages 
WHERE message LIKE '%ميزة جديدة%' 
   OR message LIKE '%صور المؤلفين%' 
   OR message LIKE '%حسابي%'
   OR message LIKE '%تحديث مهم%'
   OR message LIKE '%رفع صورة المؤلف%';