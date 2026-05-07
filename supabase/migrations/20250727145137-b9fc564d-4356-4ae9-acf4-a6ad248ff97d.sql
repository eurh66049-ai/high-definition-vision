-- إصلاح مشكلة دالة get_book_review_stats التي تسبب تضارب في أنواع البيانات
-- حذف الدالة الموجودة وإنشاؤها من جديد مع نوع بيانات واضح

DROP FUNCTION IF EXISTS public.get_book_review_stats(p_book_id text);
DROP FUNCTION IF EXISTS public.get_book_review_stats(p_book_id uuid);

-- إنشاء دالة جديدة تقبل UUID فقط لتجنب التضارب
CREATE OR REPLACE FUNCTION public.get_book_review_stats(p_book_id uuid)
RETURNS TABLE (
    total_reviews bigint,
    average_rating numeric,
    rating_distribution jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(br.rating), 0) as total_reviews,
        COALESCE(ROUND(AVG(br.rating), 2), 0.0) as average_rating,
        COALESCE(
            jsonb_build_object(
                '1', COUNT(CASE WHEN br.rating = 1 THEN 1 END),
                '2', COUNT(CASE WHEN br.rating = 2 THEN 1 END),
                '3', COUNT(CASE WHEN br.rating = 3 THEN 1 END),
                '4', COUNT(CASE WHEN br.rating = 4 THEN 1 END),
                '5', COUNT(CASE WHEN br.rating = 5 THEN 1 END)
            ),
            '{}'::jsonb
        ) as rating_distribution
    FROM book_reviews br 
    WHERE br.book_id = p_book_id;
END;
$$;

-- إنشاء دوال جديدة لإدارة تاريخ التنقل إذا لم تكن موجودة
CREATE OR REPLACE FUNCTION public.save_navigation_state(
    p_session_id text,
    p_path text,
    p_scroll_position integer,
    p_page_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- حذف الحالات القديمة لنفس الجلسة
    DELETE FROM navigation_history 
    WHERE session_id = p_session_id;
    
    -- إدراج الحالة الجديدة
    INSERT INTO navigation_history (
        session_id,
        path,
        scroll_position,
        page_data,
        user_id
    ) VALUES (
        p_session_id,
        p_path,
        p_scroll_position,
        p_page_data,
        auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_last_navigation_state(p_session_id text)
RETURNS TABLE (
    path text,
    scroll_position integer,
    page_data jsonb,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nh.path,
        nh.scroll_position,
        nh.page_data,
        nh.created_at
    FROM navigation_history nh
    WHERE nh.session_id = p_session_id
    ORDER BY nh.created_at DESC
    LIMIT 1;
END;
$$;