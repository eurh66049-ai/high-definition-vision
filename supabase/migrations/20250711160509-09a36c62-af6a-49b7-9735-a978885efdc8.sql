
-- تحديث view approved_books لتتضمن slug
DROP VIEW IF EXISTS public.approved_books;

CREATE VIEW public.approved_books AS
SELECT 
    book_submissions.id,
    book_submissions.user_id,
    book_submissions.title,
    book_submissions.subtitle,
    book_submissions.author,
    book_submissions.author_bio,
    book_submissions.author_image_url,
    book_submissions.category,
    book_submissions.publisher,
    book_submissions.translator,
    book_submissions.description,
    book_submissions.publication_year,
    book_submissions.page_count,
    book_submissions.language,
    book_submissions.display_type,
    book_submissions.cover_image_url,
    book_submissions.book_file_url,
    book_submissions.file_type,
    book_submissions.file_size,
    book_submissions.file_metadata,
    book_submissions.rights_confirmation,
    book_submissions.created_at,
    book_submissions.reviewed_at,
    book_submissions.user_email,
    book_submissions.processing_status,
    book_submissions.views,
    book_submissions.rating,
    book_submissions.slug,
    true AS is_active
FROM book_submissions
WHERE (book_submissions.status = 'approved'::text);
