-- إصلاح جدول approved_books بإضافة الأعمدة المفقودة
ALTER TABLE public.approved_books 
ADD COLUMN IF NOT EXISTS downloads integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS submission_id uuid;

-- تحديث قيم downloads الافتراضية للكتب الموجودة
UPDATE public.approved_books 
SET downloads = 0 
WHERE downloads IS NULL;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_approved_books_downloads 
ON public.approved_books(downloads);

CREATE INDEX IF NOT EXISTS idx_approved_books_submission_id 
ON public.approved_books(submission_id);

-- إنشاء دالة محسّنة للحصول على إحصائيات المراجعات
CREATE OR REPLACE FUNCTION public.get_book_review_stats(p_book_id uuid)
RETURNS TABLE(
  total_reviews integer,
  average_rating numeric,
  five_star_count integer,
  four_star_count integer,
  three_star_count integer,
  two_star_count integer,
  one_star_count integer,
  recommend_count integer,
  not_recommend_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_reviews,
    COALESCE(ROUND(AVG(rating::numeric), 1), 0) as average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END)::integer as five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END)::integer as four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END)::integer as three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END)::integer as two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END)::integer as one_star_count,
    COUNT(CASE WHEN recommend = true THEN 1 END)::integer as recommend_count,
    COUNT(CASE WHEN recommend = false THEN 1 END)::integer as not_recommend_count
  FROM public.book_reviews 
  WHERE book_id = p_book_id;
END;
$$;

-- تحديث دالة increment_book_downloads لجدول approved_books
CREATE OR REPLACE FUNCTION public.increment_book_downloads(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- زيادة عدد التحميلات في جدول book_submissions
  UPDATE public.book_submissions 
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_book_id AND status = 'approved';
  
  -- زيادة عدد التحميلات في جدول approved_books إذا وُجد
  UPDATE public.approved_books 
  SET downloads = COALESCE(downloads, 0) + 1
  WHERE id = p_book_id;
END;
$$;

-- تحديث trigger لضمان تطابق البيانات بين book_submissions و approved_books
CREATE OR REPLACE FUNCTION public.sync_approved_books()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- عند الموافقة على كتاب، تحديث أو إنشاء سجل في approved_books
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.approved_books (
      id, title, subtitle, author, author_bio, author_image_url,
      category, description, language, publication_year, page_count,
      cover_image_url, book_file_url, file_type, display_type,
      views, rating, created_at, user_id, user_email, file_size,
      slug, publisher, translator, processing_status, file_metadata,
      rights_confirmation, reviewed_at, is_active, downloads, submission_id
    ) VALUES (
      NEW.id, NEW.title, NEW.subtitle, NEW.author, NEW.author_bio, NEW.author_image_url,
      NEW.category, NEW.description, NEW.language, NEW.publication_year, NEW.page_count,
      NEW.cover_image_url, NEW.book_file_url, NEW.file_type, NEW.display_type,
      NEW.views, NEW.rating, NEW.created_at, NEW.user_id, NEW.user_email, NEW.file_size,
      NEW.slug, NEW.publisher, NEW.translator, NEW.processing_status, NEW.file_metadata,
      NEW.rights_confirmation, NEW.reviewed_at, true, 0, NEW.id
    )
    ON CONFLICT (id) DO UPDATE SET
      title = NEW.title,
      subtitle = NEW.subtitle,
      author = NEW.author,
      author_bio = NEW.author_bio,
      author_image_url = NEW.author_image_url,
      category = NEW.category,
      description = NEW.description,
      language = NEW.language,
      publication_year = NEW.publication_year,
      page_count = NEW.page_count,
      cover_image_url = NEW.cover_image_url,
      book_file_url = NEW.book_file_url,
      file_type = NEW.file_type,
      display_type = NEW.display_type,
      views = NEW.views,
      rating = NEW.rating,
      user_id = NEW.user_id,
      user_email = NEW.user_email,
      file_size = NEW.file_size,
      slug = NEW.slug,
      publisher = NEW.publisher,
      translator = NEW.translator,
      processing_status = NEW.processing_status,
      file_metadata = NEW.file_metadata,
      rights_confirmation = NEW.rights_confirmation,
      reviewed_at = NEW.reviewed_at,
      is_active = true,
      submission_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger إذا لم يكن موجوداً
DROP TRIGGER IF EXISTS sync_approved_books_trigger ON public.book_submissions;
CREATE TRIGGER sync_approved_books_trigger
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_approved_books();