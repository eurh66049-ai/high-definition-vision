-- إنشاء دالة محسّنة لجلب إحصائيات الكتب المجمعة
CREATE OR REPLACE FUNCTION get_books_batch_stats_fixed(book_ids uuid[])
RETURNS TABLE (
    book_id uuid,
    total_reviews bigint,
    average_rating numeric,
    rating_distribution jsonb
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as book_id,
        COALESCE(COUNT(br.id), 0) as total_reviews,
        COALESCE(AVG(br.rating), 0.0) as average_rating,
        COALESCE(
            jsonb_build_object(
                '1', COUNT(br.id) FILTER (WHERE br.rating = 1),
                '2', COUNT(br.id) FILTER (WHERE br.rating = 2),
                '3', COUNT(br.id) FILTER (WHERE br.rating = 3),
                '4', COUNT(br.id) FILTER (WHERE br.rating = 4),
                '5', COUNT(br.id) FILTER (WHERE br.rating = 5)
            ),
            '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb
        ) as rating_distribution
    FROM 
        unnest(book_ids) AS b(id)
    LEFT JOIN 
        book_reviews br ON br.book_id = b.id
    GROUP BY 
        b.id;
END;
$$;