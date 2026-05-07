-- إصلاح دالة save_navigation_state - إزالة التحميل الزائد المتضارب
DROP FUNCTION IF EXISTS public.save_navigation_state(text, text, integer, jsonb);
DROP FUNCTION IF EXISTS public.save_navigation_state(text, text, numeric, jsonb);

-- إنشاء دالة واحدة موحدة للـ navigation state
CREATE OR REPLACE FUNCTION public.save_navigation_state(
    p_session_id text,
    p_path text,
    p_scroll_position numeric DEFAULT 0,
    p_page_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.navigation_history (session_id, path, scroll_position, page_data, user_id, created_at, updated_at)
    VALUES (p_session_id, p_path, p_scroll_position, p_page_data, auth.uid(), now(), now())
    ON CONFLICT (session_id, path) 
    DO UPDATE SET 
        scroll_position = EXCLUDED.scroll_position,
        page_data = EXCLUDED.page_data,
        updated_at = now();
END;
$$;

-- إصلاح دالة get_books_batch_stats - إزالة التحميل الزائد المتضارب  
DROP FUNCTION IF EXISTS public.get_books_batch_stats(text[]);
DROP FUNCTION IF EXISTS public.get_books_batch_stats(uuid[]);

-- إنشاء دالة واحدة موحدة للإحصائيات
CREATE OR REPLACE FUNCTION public.get_books_batch_stats(
    book_ids uuid[]
) RETURNS TABLE (
    book_id uuid,
    total_reviews integer,
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
        bs.id as book_id,
        COALESCE(COUNT(br.id)::integer, 0) as total_reviews,
        COALESCE(AVG(br.rating)::numeric, 0.0) as average_rating,
        COALESCE(
            jsonb_object_agg(
                br.rating::text, 
                COUNT(br.rating)
            ) FILTER (WHERE br.rating IS NOT NULL),
            '{}'::jsonb
        ) as rating_distribution
    FROM unnest(book_ids) AS bid(id)
    LEFT JOIN book_submissions bs ON bs.id = bid.id AND bs.status = 'approved'
    LEFT JOIN book_reviews br ON br.book_id = bs.id
    GROUP BY bs.id;
END;
$$;

-- تحسين أداء الدالة get_optimized_books_home_shuffled
CREATE OR REPLACE FUNCTION public.get_optimized_books_home_shuffled(
    p_limit integer DEFAULT 24,
    p_offset integer DEFAULT 0
) RETURNS TABLE (
    id uuid,
    title text,
    author text,
    category text,
    cover_image_url text,
    rating numeric,
    views integer,
    created_at timestamp with time zone,
    slug text,
    language text,
    page_count integer,
    book_file_type text,
    display_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bs.id,
        bs.title,
        bs.author,
        bs.category,
        bs.cover_image_url,
        COALESCE(bs.rating, 0.0) as rating,
        COALESCE(bs.views, 0) as views,
        bs.created_at,
        bs.slug,
        bs.language,
        COALESCE(bs.page_count, 0) as page_count,
        COALESCE(bs.book_file_type, 'pdf') as book_file_type,
        bs.display_type
    FROM book_submissions bs
    WHERE bs.status = 'approved'
    ORDER BY RANDOM()
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION public.save_navigation_state TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_batch_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_optimized_books_home_shuffled TO anon, authenticated;