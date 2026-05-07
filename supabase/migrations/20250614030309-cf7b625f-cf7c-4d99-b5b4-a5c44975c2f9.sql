
-- إنشاء جدول لحفظ ترتيب الكتب العالمي
CREATE TABLE IF NOT EXISTS public.global_book_order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_ids TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- فهرسة للبحث السريع عن الترتيب النشط
CREATE INDEX IF NOT EXISTS idx_global_book_order_active ON public.global_book_order (is_active, expires_at);

-- دالة لإنشاء ترتيب عشوائي جديد للكتب
CREATE OR REPLACE FUNCTION public.create_new_book_order()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_book_ids TEXT[];
BEGIN
  -- جلب جميع معرفات الكتب المعتمدة
  SELECT ARRAY_AGG(id::text ORDER BY random()) 
  INTO v_book_ids
  FROM public.approved_books 
  WHERE is_active = true;
  
  -- إلغاء تفعيل الترتيبات السابقة
  UPDATE public.global_book_order 
  SET is_active = false 
  WHERE is_active = true;
  
  -- إنشاء ترتيب جديد
  INSERT INTO public.global_book_order (book_ids, expires_at)
  VALUES (
    v_book_ids,
    now() + interval '1 hour'
  )
  RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;

-- دالة للحصول على الترتيب النشط أو إنشاء واحد جديد
CREATE OR REPLACE FUNCTION public.get_active_book_order()
RETURNS TABLE(book_ids TEXT[], expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_ids TEXT[];
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- البحث عن ترتيب نشط لم ينته بعد
  SELECT gbo.book_ids, gbo.expires_at
  INTO v_book_ids, v_expires_at
  FROM public.global_book_order gbo
  WHERE gbo.is_active = true 
    AND gbo.expires_at > now()
  ORDER BY gbo.created_at DESC
  LIMIT 1;
  
  -- إذا لم يوجد ترتيب نشط، إنشاء واحد جديد
  IF v_book_ids IS NULL THEN
    PERFORM public.create_new_book_order();
    
    -- جلب الترتيب الجديد
    SELECT gbo.book_ids, gbo.expires_at
    INTO v_book_ids, v_expires_at
    FROM public.global_book_order gbo
    WHERE gbo.is_active = true
    ORDER BY gbo.created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT v_book_ids, v_expires_at;
END;
$$;

-- إنشاء ترتيب أولي
SELECT public.create_new_book_order();
