-- تحديث دالة sync_author_data_in_books لتحديث بيانات المؤلف في جدول authors
CREATE OR REPLACE FUNCTION public.sync_author_data_in_books()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  -- تحديث بيانات المؤلف في جميع الكتب عند تغيير بيانات المؤلف
  UPDATE public.book_submissions 
  SET 
    author_bio = NEW.bio,
    author_image_url = COALESCE(NEW.avatar_url, author_image_url)
  WHERE 
    LOWER(TRIM(author)) = LOWER(TRIM(NEW.name))
    AND status = 'approved';
  
  RETURN NEW;
END;
$$;

-- إنشاء دالة لتحديث bio المؤلف في جدول authors من أحدث كتاب معتمد
CREATE OR REPLACE FUNCTION public.update_author_bio_from_books()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- تحديث bio المؤلفين الذين لديهم bio فارغ أو null من أحدث كتاب معتمد
  UPDATE public.authors 
  SET bio = (
    SELECT bs.author_bio 
    FROM public.book_submissions bs 
    WHERE LOWER(TRIM(bs.author)) = LOWER(TRIM(authors.name))
      AND bs.status = 'approved'
      AND bs.author_bio IS NOT NULL 
      AND bs.author_bio != ''
    ORDER BY bs.created_at DESC
    LIMIT 1
  )
  WHERE (bio IS NULL OR bio = '')
    AND EXISTS (
      SELECT 1 
      FROM public.book_submissions bs 
      WHERE LOWER(TRIM(bs.author)) = LOWER(TRIM(authors.name))
        AND bs.status = 'approved'
        AND bs.author_bio IS NOT NULL 
        AND bs.author_bio != ''
    );
    
  -- تحديث avatar_url المؤلفين من أحدث كتاب معتمد إذا لم يكن موجود
  UPDATE public.authors 
  SET avatar_url = (
    SELECT bs.author_image_url 
    FROM public.book_submissions bs 
    WHERE LOWER(TRIM(bs.author)) = LOWER(TRIM(authors.name))
      AND bs.status = 'approved'
      AND bs.author_image_url IS NOT NULL 
      AND bs.author_image_url != ''
    ORDER BY bs.created_at DESC
    LIMIT 1
  )
  WHERE (avatar_url IS NULL OR avatar_url = '')
    AND EXISTS (
      SELECT 1 
      FROM public.book_submissions bs 
      WHERE LOWER(TRIM(bs.author)) = LOWER(TRIM(authors.name))
        AND bs.status = 'approved'
        AND bs.author_image_url IS NOT NULL 
        AND bs.author_image_url != ''
    );
END;
$$;

-- تشغيل الدالة لتحديث بيانات المؤلفين الحالية
SELECT public.update_author_bio_from_books();