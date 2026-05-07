-- إنشاء دالة لمزامنة بيانات المؤلفين من الكتب المعتمدة
CREATE OR REPLACE FUNCTION sync_author_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- مزامنة جدول authors مع بيانات الكتب المعتمدة
  INSERT INTO public.authors (name, bio, avatar_url, books_count, created_at)
  SELECT 
    bs.author as name,
    bs.author_bio as bio,
    bs.author_image_url as avatar_url,
    COUNT(*) as books_count,
    MIN(bs.created_at) as created_at
  FROM public.book_submissions bs
  WHERE bs.status = 'approved'
    AND bs.author IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.authors a 
      WHERE LOWER(TRIM(a.name)) = LOWER(TRIM(bs.author))
    )
  GROUP BY bs.author, bs.author_bio, bs.author_image_url
  ON CONFLICT (name) DO NOTHING;

  -- تحديث عدد الكتب للمؤلفين الموجودين
  UPDATE public.authors 
  SET books_count = book_counts.count,
      bio = COALESCE(book_counts.latest_bio, bio),
      avatar_url = COALESCE(book_counts.latest_avatar, avatar_url)
  FROM (
    SELECT 
      bs.author,
      COUNT(*) as count,
      (array_agg(bs.author_bio ORDER BY bs.created_at DESC))[1] as latest_bio,
      (array_agg(bs.author_image_url ORDER BY bs.created_at DESC))[1] as latest_avatar
    FROM public.book_submissions bs
    WHERE bs.status = 'approved'
      AND bs.author IS NOT NULL
    GROUP BY bs.author
  ) book_counts
  WHERE LOWER(TRIM(authors.name)) = LOWER(TRIM(book_counts.author));
END;
$$;