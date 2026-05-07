-- المرحلة الثانية: تنظيف التكرار وتحسين الأداء

-- 1. تنظيف صور المؤلفين المكررة - الاحتفاظ بأحدث صورة لكل مؤلف
WITH author_latest_images AS (
  SELECT DISTINCT ON (LOWER(TRIM(author))) 
    author,
    author_image_url,
    created_at
  FROM public.approved_books 
  WHERE author_image_url IS NOT NULL 
    AND author_image_url != ''
  ORDER BY LOWER(TRIM(author)), created_at DESC
),
duplicate_author_images AS (
  SELECT ab.author_image_url
  FROM public.approved_books ab
  WHERE ab.author_image_url IS NOT NULL 
    AND ab.author_image_url != ''
    AND NOT EXISTS (
      SELECT 1 FROM author_latest_images ali
      WHERE ali.author_image_url = ab.author_image_url
    )
)
UPDATE public.approved_books 
SET author_image_url = (
  SELECT ali.author_image_url 
  FROM author_latest_images ali 
  WHERE LOWER(TRIM(ali.author)) = LOWER(TRIM(approved_books.author))
)
WHERE author IS NOT NULL;

-- 2. تنظيف المؤلفين المكررين في جدول authors
DELETE FROM public.authors 
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(TRIM(name))) id
  FROM public.authors
  ORDER BY LOWER(TRIM(name)), created_at DESC
);

-- 3. تنظيف البيانات المكررة في pdf_metadata
DELETE FROM public.pdf_metadata 
WHERE id NOT IN (
  SELECT DISTINCT ON (book_id) id 
  FROM public.pdf_metadata 
  ORDER BY book_id, created_at DESC
);

-- 4. تنظيف البيانات المكررة في book_cache  
DELETE FROM public.book_cache 
WHERE id NOT IN (
  SELECT DISTINCT ON (book_id) id 
  FROM public.book_cache 
  ORDER BY book_id, last_accessed DESC NULLS LAST
);

-- 5. تنظيف البيانات المكررة في pdf_display_settings
DELETE FROM public.pdf_display_settings 
WHERE id NOT IN (
  SELECT DISTINCT ON (book_id) id 
  FROM public.pdf_display_settings 
  ORDER BY book_id, created_at DESC
);

-- 6. إنشاء فهارس فريدة لمنع التكرار المستقبلي
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_metadata_book_id_unique 
ON public.pdf_metadata(book_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_book_cache_book_id_unique 
ON public.book_cache(book_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_display_settings_book_id_unique 
ON public.pdf_display_settings(book_id);

-- 7. إنشاء فهرس فريد للمؤلفين لمنع التكرار
CREATE UNIQUE INDEX IF NOT EXISTS idx_authors_name_unique 
ON public.authors(LOWER(TRIM(name)));

-- 8. تحديث دالة مزامنة المؤلفين لمنع التكرار
CREATE OR REPLACE FUNCTION public.sync_author_data_no_duplicates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- مزامنة المؤلفين من approved_books إلى authors مع منع التكرار
  INSERT INTO public.authors (name, bio, avatar_url)
  SELECT DISTINCT 
    ab.author,
    ab.author_bio,
    ab.author_image_url
  FROM public.approved_books ab
  WHERE ab.author IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.authors a 
      WHERE LOWER(TRIM(a.name)) = LOWER(TRIM(ab.author))
    )
  ON CONFLICT (LOWER(TRIM(name))) DO UPDATE SET
    bio = COALESCE(EXCLUDED.bio, authors.bio),
    avatar_url = COALESCE(EXCLUDED.avatar_url, authors.avatar_url);
  
  -- تحديث عدد الكتب لكل مؤلف
  UPDATE public.authors 
  SET books_count = (
    SELECT COUNT(*) 
    FROM public.approved_books ab 
    WHERE LOWER(TRIM(ab.author)) = LOWER(TRIM(authors.name))
      AND ab.is_active = true
  );
END;
$$;

-- 9. إنشاء تريغر لمنع إدراج مؤلفين مكررين
CREATE OR REPLACE FUNCTION public.prevent_duplicate_authors()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- التحقق من وجود مؤلف بنفس الاسم
  IF EXISTS (
    SELECT 1 FROM public.authors 
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
      AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'مؤلف بهذا الاسم موجود مسبقاً: %', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء التريغر
DROP TRIGGER IF EXISTS prevent_duplicate_authors_trigger ON public.authors;
CREATE TRIGGER prevent_duplicate_authors_trigger
  BEFORE INSERT OR UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_authors();

-- 10. إنشاء دالة لتحديث عدد الكتب تلقائياً عند إضافة كتاب جديد
CREATE OR REPLACE FUNCTION public.update_author_books_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- تحديث عدد الكتب للمؤلف الجديد
  IF TG_OP = 'INSERT' THEN
    UPDATE public.authors 
    SET books_count = books_count + 1
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.author));
    
    -- إذا لم يوجد المؤلف، أضفه
    IF NOT FOUND THEN
      INSERT INTO public.authors (name, bio, avatar_url, books_count)
      VALUES (NEW.author, NEW.author_bio, NEW.author_image_url, 1)
      ON CONFLICT (LOWER(TRIM(name))) DO UPDATE SET
        books_count = authors.books_count + 1,
        bio = COALESCE(NEW.author_bio, authors.bio),
        avatar_url = COALESCE(NEW.author_image_url, authors.avatar_url);
    END IF;
  END IF;
  
  -- تحديث عدد الكتب للمؤلف القديم والجديد عند التحديث
  IF TG_OP = 'UPDATE' AND OLD.author != NEW.author THEN
    -- تقليل العدد للمؤلف القديم
    UPDATE public.authors 
    SET books_count = GREATEST(books_count - 1, 0)
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(OLD.author));
    
    -- زيادة العدد للمؤلف الجديد
    UPDATE public.authors 
    SET books_count = books_count + 1
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.author));
    
    -- إذا لم يوجد المؤلف الجديد، أضفه
    IF NOT FOUND THEN
      INSERT INTO public.authors (name, bio, avatar_url, books_count)
      VALUES (NEW.author, NEW.author_bio, NEW.author_image_url, 1)
      ON CONFLICT (LOWER(TRIM(name))) DO UPDATE SET
        books_count = authors.books_count + 1;
    END IF;
  END IF;
  
  -- تقليل عدد الكتب عند الحذف
  IF TG_OP = 'DELETE' THEN
    UPDATE public.authors 
    SET books_count = GREATEST(books_count - 1, 0)
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(OLD.author));
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء التريغر لتحديث عدد الكتب
DROP TRIGGER IF EXISTS update_author_books_count_trigger ON public.approved_books;
CREATE TRIGGER update_author_books_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.approved_books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_books_count();

-- 11. إنشاء دالة لتنظيف الملفات اليتيمة (مبسطة)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_media_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- حذف الملفات التي لا ترتبط بأي كتاب معتمد
  DELETE FROM public.media_files
  WHERE file_type = 'cover_image' 
    AND NOT EXISTS (
      SELECT 1 FROM public.approved_books ab 
      WHERE ab.cover_image_url = media_files.file_url
    );
  
  -- حذف ملفات PDF غير المرتبطة
  DELETE FROM public.media_files
  WHERE file_type = 'book_pdf' 
    AND NOT EXISTS (
      SELECT 1 FROM public.approved_books ab 
      WHERE ab.book_file_url = media_files.file_url
    );
  
  -- حذف صور المؤلفين غير المرتبطة
  DELETE FROM public.media_files
  WHERE file_type = 'author_image' 
    AND NOT EXISTS (
      SELECT 1 FROM public.approved_books ab 
      WHERE ab.author_image_url = media_files.file_url
    );
END;
$$;

-- 12. تشغيل دالة التنظيف
SELECT public.cleanup_orphaned_media_files();

-- 13. تشغيل دالة مزامنة المؤلفين المحدثة
SELECT public.sync_author_data_no_duplicates();

-- 14. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_approved_books_author_name ON public.approved_books(LOWER(TRIM(author)));
CREATE INDEX IF NOT EXISTS idx_approved_books_active ON public.approved_books(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_media_files_file_type ON public.media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_book_media_book_table_id ON public.book_media(book_table, book_id);