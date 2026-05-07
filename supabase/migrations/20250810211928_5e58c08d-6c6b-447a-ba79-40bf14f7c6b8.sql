-- إزالة جميع الجداول والدوال المتعلقة بنظام المراسلة

-- حذف الدوال المتعلقة بالمراسلة
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid, uuid);
DROP FUNCTION IF EXISTS get_or_create_conversation(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_conversations(uuid);
DROP FUNCTION IF EXISTS update_user_last_seen(uuid);

-- حذف الجداول المتعلقة بالمراسلة
DROP TABLE IF EXISTS message_reports CASCADE;
DROP TABLE IF EXISTS message_violations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- حذف أي triggers متعلقة بالمراسلة (في حالة وجودها)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;