-- إنشاء دالة add_book_review محدثة
CREATE OR REPLACE FUNCTION public.add_book_review(
  p_book_id text,
  p_user_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_recommend boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_uuid UUID;
  v_review_id UUID;
BEGIN
  -- تحويل ID الكتاب إلى UUID
  BEGIN
    v_book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    -- إذا لم ينجح التحويل المباشر، استخدم MD5
    v_book_uuid := md5(p_book_id)::UUID;
  END;

  -- التحقق من عدم وجود تقييم سابق من نفس المستخدم لنفس الكتاب
  IF EXISTS (
    SELECT 1 FROM public.book_reviews 
    WHERE book_id = v_book_uuid AND user_id = p_user_id
  ) THEN
    -- تحديث التقييم الموجود
    UPDATE public.book_reviews 
    SET 
      rating = p_rating,
      comment = p_comment,
      recommend = p_recommend,
      created_at = NOW()
    WHERE book_id = v_book_uuid AND user_id = p_user_id
    RETURNING id INTO v_review_id;
  ELSE
    -- إدراج تقييم جديد
    INSERT INTO public.book_reviews (
      book_id,
      user_id,
      rating,
      comment,
      recommend
    ) VALUES (
      v_book_uuid,
      p_user_id,
      p_rating,
      p_comment,
      p_recommend
    ) RETURNING id INTO v_review_id;
  END IF;

  RETURN v_review_id;
END;
$$;