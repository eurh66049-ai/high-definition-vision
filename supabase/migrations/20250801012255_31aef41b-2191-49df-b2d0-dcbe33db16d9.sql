-- حذف الدالة التي تحاول الوصول إلى page_meta_tags
DROP FUNCTION IF EXISTS public.generate_author_meta_tags() CASCADE;

-- حذف أي trigger مرتبط بها
DROP TRIGGER IF EXISTS generate_author_meta_tags_trigger ON public.authors;