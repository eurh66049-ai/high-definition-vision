-- حذف الجداول والوظائف غير المستخدمة من قاعدة البيانات

-- 1. حذف الجداول غير المستخدمة
DROP TABLE IF EXISTS public.admin_bulk_submissions CASCADE;
DROP TABLE IF EXISTS public.book_upload_timers CASCADE;
DROP TABLE IF EXISTS public.book_processing_status CASCADE;
DROP TABLE IF EXISTS public.book_status_messages CASCADE;
DROP TABLE IF EXISTS public.book_cache CASCADE;
DROP TABLE IF EXISTS public.book_pages CASCADE;
DROP TABLE IF EXISTS public.pdf_pages CASCADE;
DROP TABLE IF EXISTS public.pdf_processing CASCADE;
DROP TABLE IF EXISTS public.pdf_image_conversion CASCADE;
DROP TABLE IF EXISTS public.pdf_metadata CASCADE;
DROP TABLE IF EXISTS public.pdf_display_settings CASCADE;
DROP TABLE IF EXISTS public.custom_pdf_viewer CASCADE;
DROP TABLE IF EXISTS public.pdf_annotations CASCADE;
DROP TABLE IF EXISTS public.pdf_bookmarks CASCADE;
DROP TABLE IF EXISTS public.pdf_viewer_state CASCADE;
DROP TABLE IF EXISTS public.upload_session_tracking CASCADE;
DROP TABLE IF EXISTS public.large_file_upload_progress CASCADE;
DROP TABLE IF EXISTS public.password_reset_requests CASCADE;
DROP TABLE IF EXISTS public.email_verification_codes CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.book_pdfs CASCADE;
DROP TABLE IF EXISTS public.contact_messages CASCADE;
DROP TABLE IF EXISTS public.global_book_order CASCADE;
DROP TABLE IF EXISTS public.admin_batch_books CASCADE;
DROP TABLE IF EXISTS public.admin_book_batches CASCADE;
DROP TABLE IF EXISTS public.admin_multi_book_uploads CASCADE;
DROP TABLE IF EXISTS public.admin_uploaded_books CASCADE;
DROP TABLE IF EXISTS public.media_files CASCADE;
DROP TABLE IF EXISTS public.book_media CASCADE;

-- 2. حذف الفهارس والقيود المرتبطة (إن وجدت)
DROP INDEX IF EXISTS idx_book_cache_book_id;
DROP INDEX IF EXISTS idx_pdf_pages_book_id;
DROP INDEX IF EXISTS idx_book_pages_book_id;
DROP INDEX IF EXISTS idx_upload_progress_submission;

-- 3. حذف الوظائف غير المستخدمة
DROP FUNCTION IF EXISTS public.add_pdf_conversion CASCADE;
DROP FUNCTION IF EXISTS public.add_pdf_page CASCADE;
DROP FUNCTION IF EXISTS public.add_pdf_page_image CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_duplicate_storage_files CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_verification_codes CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_push_subscriptions CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_upload_progress CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_upload_sessions CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_orphaned_media_files CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_orphaned_storage_files CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_temp_mobile_uploads CASCADE;
DROP FUNCTION IF EXISTS public.comprehensive_restore_all_data CASCADE;
DROP FUNCTION IF EXISTS public.consolidate_storage_buckets CASCADE;
DROP FUNCTION IF EXISTS public.create_upload_timer CASCADE;
DROP FUNCTION IF EXISTS public.create_new_book_order CASCADE;
DROP FUNCTION IF EXISTS public.generate_verification_code CASCADE;
DROP FUNCTION IF EXISTS public.get_active_book_order CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_batch_stats CASCADE;
DROP FUNCTION IF EXISTS public.get_book_pages CASCADE;
DROP FUNCTION IF EXISTS public.get_chunks_stats CASCADE;
DROP FUNCTION IF EXISTS public.get_enhanced_pdf_info CASCADE;
DROP FUNCTION IF EXISTS public.get_next_message_time CASCADE;
DROP FUNCTION IF EXISTS public.get_pdf_conversion_info CASCADE;
DROP FUNCTION IF EXISTS public.get_pdf_display_info CASCADE;
DROP FUNCTION IF EXISTS public.get_pdf_page_images CASCADE;
DROP FUNCTION IF EXISTS public.get_pdf_with_cors_headers CASCADE;
DROP FUNCTION IF EXISTS public.get_pending_book_details CASCADE;
DROP FUNCTION IF EXISTS public.get_upload_session_status CASCADE;
DROP FUNCTION IF EXISTS public.get_upload_status CASCADE;
DROP FUNCTION IF EXISTS public.get_user_active_subscriptions CASCADE;
DROP FUNCTION IF EXISTS public.get_pdf_viewer_state CASCADE;
DROP FUNCTION IF EXISTS public.save_pdf_viewer_state CASCADE;
DROP FUNCTION IF EXISTS public.update_chunk_progress CASCADE;
DROP FUNCTION IF EXISTS public.update_book_submission_file_info CASCADE;
DROP FUNCTION IF EXISTS public.fix_pdf_urls CASCADE;
DROP FUNCTION IF EXISTS public.process_admin_book_batch CASCADE;
DROP FUNCTION IF EXISTS public.request_password_reset CASCADE;
DROP FUNCTION IF EXISTS public.can_send_message CASCADE;
DROP FUNCTION IF EXISTS public.can_send_weekly_message CASCADE;
DROP FUNCTION IF EXISTS public.save_contact_message CASCADE;

-- 4. حذف المشغلات (Triggers) غير المستخدمة
DROP TRIGGER IF EXISTS copy_author_fields_on_approval ON public.approved_books;
DROP TRIGGER IF EXISTS copy_file_size_on_approval ON public.approved_books;

-- 5. حذف أنواع البيانات المخصصة غير المستخدمة (إن وجدت)
-- معظم أنواع البيانات المخصصة قد تكون مستخدمة، لذا سنتركها

-- تنظيف نهائي - إعادة تنظيم قاعدة البيانات
VACUUM ANALYZE;