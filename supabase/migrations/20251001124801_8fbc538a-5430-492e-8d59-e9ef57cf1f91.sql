-- إضافة حقل book_slug إلى جدول quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS book_slug text;

-- تحديث book_slug من جدول book_submissions للاقتباسات الموجودة
UPDATE public.quotes q
SET book_slug = bs.slug
FROM public.book_submissions bs
WHERE q.book_id = bs.id
  AND bs.slug IS NOT NULL
  AND bs.status = 'approved';

-- إنشاء trigger لتحديث book_slug تلقائياً عند إضافة اقتباس جديد
CREATE OR REPLACE FUNCTION public.update_quote_book_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- الحصول على slug من book_submissions
  SELECT slug INTO NEW.book_slug
  FROM public.book_submissions
  WHERE id = NEW.book_id
    AND status = 'approved'
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger على جدول quotes
DROP TRIGGER IF EXISTS trigger_update_quote_book_slug ON public.quotes;
CREATE TRIGGER trigger_update_quote_book_slug
  BEFORE INSERT OR UPDATE OF book_id
  ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_book_slug();