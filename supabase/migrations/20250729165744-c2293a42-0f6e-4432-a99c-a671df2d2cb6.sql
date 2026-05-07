-- إضافة قيد unique لمنع تكرار المتابعة
ALTER TABLE public.author_followers 
ADD CONSTRAINT unique_user_author_follow 
UNIQUE (user_id, author_id);