-- حذف محتوى جميع الجداول مع الحفاظ على البنية
-- ترتيب الحذف يراعي قيود المفاتيح الخارجية

-- حذف الجداول التابعة أولاً
DELETE FROM public.review_likes;
DELETE FROM public.book_reviews;
DELETE FROM public.book_recommendations;
DELETE FROM public.pdf_annotations;
DELETE FROM public.pdf_bookmarks;
DELETE FROM public.pdf_viewer_state;
DELETE FROM public.reading_progress;
DELETE FROM public.reading_history;
DELETE FROM public.book_pages;
DELETE FROM public.pdf_pages;
DELETE FROM public.pdf_processing;
DELETE FROM public.pdf_image_conversion;
DELETE FROM public.pdf_metadata;
DELETE FROM public.pdf_display_settings;
DELETE FROM public.custom_pdf_viewer;
DELETE FROM public.book_cache;
DELETE FROM public.book_media;
DELETE FROM public.large_file_upload_progress;
DELETE FROM public.upload_session_tracking;
DELETE FROM public.book_processing_status;
DELETE FROM public.book_status_messages;
DELETE FROM public.book_upload_timers;
DELETE FROM public.notifications;

-- حذف الجداول الإدارية التابعة
DELETE FROM public.admin_batch_books;
DELETE FROM public.admin_uploaded_books;
DELETE FROM public.admin_bulk_submissions;
DELETE FROM public.admin_book_batches;
DELETE FROM public.admin_multi_book_uploads;

-- حذف الجداول الرئيسية
DELETE FROM public.approved_books;
DELETE FROM public.book_submissions;
DELETE FROM public.book_pdfs;
DELETE FROM public.books;
DELETE FROM public.media_files;

-- حذف جداول النظام والمستخدمين
DELETE FROM public.contact_messages;
DELETE FROM public.password_reset_requests;
DELETE FROM public.email_verification_codes;
DELETE FROM public.push_subscriptions;
DELETE FROM public.profiles;
DELETE FROM public.admin_users;

-- حذف البيانات المرجعية
DELETE FROM public.authors;
DELETE FROM public.categories;
DELETE FROM public.global_book_order;