-- تحديث book_id في التقييم ليطابق الكتاب الصحيح
UPDATE book_reviews 
SET book_id = '505a5417-48d7-4acc-8efd-9589eab277c1'::uuid
WHERE book_id = '5326e659-e62a-b797-2dab-c84d679db4df'::uuid;