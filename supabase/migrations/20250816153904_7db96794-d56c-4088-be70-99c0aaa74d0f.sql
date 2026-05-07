-- إصلاح دالة get_books_batch_stats لحل مشكلة "aggregate function calls cannot be nested"
CREATE OR REPLACE FUNCTION public.get_books_batch_stats(book_ids uuid[])
RETURNS TABLE(
    book_id uuid,
    total_reviews integer,
    average_rating numeric,
    rating_distribution jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH book_review_stats AS (
        SELECT 
            bs.id,
            COUNT(br.id) as review_count,
            AVG(br.rating) as avg_rating
        FROM unnest(book_ids) AS bid(id)
        LEFT JOIN book_submissions bs ON bs.id = bid.id AND bs.status = 'approved'
        LEFT JOIN book_reviews br ON br.book_id = bs.id
        GROUP BY bs.id
    ),
    rating_dist AS (
        SELECT 
            bs.id,
            jsonb_object_agg(
                br.rating::text, 
                COUNT(br.rating)
            ) as distribution
        FROM unnest(book_ids) AS bid(id)
        LEFT JOIN book_submissions bs ON bs.id = bid.id AND bs.status = 'approved'
        LEFT JOIN book_reviews br ON br.book_id = bs.id
        WHERE br.rating IS NOT NULL
        GROUP BY bs.id
    )
    SELECT 
        brs.id as book_id,
        COALESCE(brs.review_count::integer, 0) as total_reviews,
        COALESCE(brs.avg_rating::numeric, 0.0) as average_rating,
        COALESCE(rd.distribution, '{}'::jsonb) as rating_distribution
    FROM book_review_stats brs
    LEFT JOIN rating_dist rd ON rd.id = brs.id;
END;
$$;