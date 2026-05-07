-- إزالة الجداول المتعلقة بالمراسلة (إذا كانت موجودة)
DROP TABLE IF EXISTS message_reports CASCADE;
DROP TABLE IF EXISTS message_violations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;