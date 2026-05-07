-- إضافة القيد الفريد المفقود على author_id في جدول verified_authors
ALTER TABLE verified_authors 
ADD CONSTRAINT unique_verified_author_id UNIQUE (author_id);