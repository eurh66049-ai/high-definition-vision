-- تحديث ratings في approved_books لتعكس التقييمات الفعلية
-- أولاً، دعنا نحدث الـ ratings للكتب التي لها تقييمات

UPDATE book_submissions 
SET rating = stats.average_rating
FROM (
  SELECT 
    ab.id,
    COALESCE(
      (SELECT ROUND(AVG(br.rating), 1)
       FROM book_reviews br 
       WHERE br.book_id = ab.id OR br.book_id = md5(ab.slug)::uuid
      ), 0
    ) as average_rating
  FROM approved_books ab
  WHERE ab.is_active = true
) as stats
WHERE book_submissions.id = stats.id 
  AND book_submissions.status = 'approved'
  AND book_submissions.rating != stats.average_rating;