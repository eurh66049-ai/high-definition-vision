-- إصلاح قيد action_taken في جدول message_violations
ALTER TABLE public.message_violations 
DROP CONSTRAINT IF EXISTS message_violations_action_taken_check;

-- إضافة قيد جديد يشمل جميع القيم المطلوبة
ALTER TABLE public.message_violations 
ADD CONSTRAINT message_violations_action_taken_check 
CHECK (action_taken IN ('warning', 'temp_ban', 'permanent_ban', 'message_deleted'));