-- تحديث ratings في book_submissions لتعكس التقييمات الفعلية من book_reviews
UPDATE book_submissions 
SET rating = stats.average_rating
FROM (
  SELECT 
    bs.id,
    COALESCE(
      (SELECT ROUND(AVG(br.rating::numeric), 1)
       FROM book_reviews br 
       WHERE br.book_id = bs.id OR br.book_id = md5(bs.slug)::uuid
      ), 0
    ) as average_rating
  FROM book_submissions bs
  WHERE bs.status = 'approved'
) as stats
WHERE book_submissions.id = stats.id 
  AND book_submissions.status = 'approved'
  AND book_submissions.rating != stats.average_rating;

-- تحديث عدد المشاهدات للكتب التي لها تقييمات
UPDATE book_submissions 
SET views = COALESCE(views, 0) + 1
WHERE status = 'approved' 
  AND rating > 0
  AND views = 0;