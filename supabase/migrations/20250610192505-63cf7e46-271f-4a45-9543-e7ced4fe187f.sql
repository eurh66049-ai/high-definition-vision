
-- إزالة القيود التي تمنع امتدادات PDF
ALTER TABLE public.approved_books DROP CONSTRAINT IF EXISTS check_non_pdf_url_format;
ALTER TABLE public.book_submissions DROP CONSTRAINT IF EXISTS check_non_pdf_url_format;

-- إزالة الدالة القديمة التي تمنع PDF
DROP FUNCTION IF EXISTS public.validate_non_pdf_url(text);

-- إنشاء دالة لتصحيح روابط PDF وإضافة امتداد .pdf
CREATE OR REPLACE FUNCTION public.fix_pdf_urls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث روابط الكتب المعتمدة
  UPDATE public.approved_books 
  SET book_file_url = book_file_url || '.pdf'
  WHERE book_file_url IS NOT NULL 
  AND book_file_url != ''
  AND NOT (lower(book_file_url) LIKE '%.pdf' OR lower(book_file_url) LIKE '%.pdf?%');

  -- تحديث روابط طلبات الكتب
  UPDATE public.book_submissions 
  SET book_file_url = book_file_url || '.pdf'
  WHERE book_file_url IS NOT NULL 
  AND book_file_url != ''
  AND NOT (lower(book_file_url) LIKE '%.pdf' OR lower(book_file_url) LIKE '%.pdf?%');

  -- تحديث روابط جدول الكتب العامة
  UPDATE public.books 
  SET pdf_url = pdf_url || '.pdf'
  WHERE pdf_url IS NOT NULL 
  AND pdf_url != ''
  AND NOT (lower(pdf_url) LIKE '%.pdf' OR lower(pdf_url) LIKE '%.pdf?%');

  -- تحديث روابط جدول book_pdfs
  UPDATE public.book_pdfs 
  SET pdf_url = pdf_url || '.pdf'
  WHERE pdf_url IS NOT NULL 
  AND pdf_url != ''
  AND NOT (lower(pdf_url) LIKE '%.pdf' OR lower(pdf_url) LIKE '%.pdf?%');
END;
$$;

-- تشغيل الدالة لتصحيح الروابط الموجودة
SELECT public.fix_pdf_urls();

-- إنشاء دالة trigger لضمان إضافة .pdf تلقائياً للروابط الجديدة
CREATE OR REPLACE FUNCTION public.ensure_pdf_extension()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- للكتب المعتمدة
  IF TG_TABLE_NAME = 'approved_books' AND NEW.book_file_url IS NOT NULL AND NEW.book_file_url != '' THEN
    IF NOT (lower(NEW.book_file_url) LIKE '%.pdf' OR lower(NEW.book_file_url) LIKE '%.pdf?%') THEN
      NEW.book_file_url := NEW.book_file_url || '.pdf';
    END IF;
  END IF;

  -- لطلبات الكتب
  IF TG_TABLE_NAME = 'book_submissions' AND NEW.book_file_url IS NOT NULL AND NEW.book_file_url != '' THEN
    IF NOT (lower(NEW.book_file_url) LIKE '%.pdf' OR lower(NEW.book_file_url) LIKE '%.pdf?%') THEN
      NEW.book_file_url := NEW.book_file_url || '.pdf';
    END IF;
  END IF;

  -- للكتب العامة
  IF TG_TABLE_NAME = 'books' AND NEW.pdf_url IS NOT NULL AND NEW.pdf_url != '' THEN
    IF NOT (lower(NEW.pdf_url) LIKE '%.pdf' OR lower(NEW.pdf_url) LIKE '%.pdf?%') THEN
      NEW.pdf_url := NEW.pdf_url || '.pdf';
    END IF;
  END IF;

  -- لجدول book_pdfs
  IF TG_TABLE_NAME = 'book_pdfs' AND NEW.pdf_url IS NOT NULL AND NEW.pdf_url != '' THEN
    IF NOT (lower(NEW.pdf_url) LIKE '%.pdf' OR lower(NEW.pdf_url) LIKE '%.pdf?%') THEN
      NEW.pdf_url := NEW.pdf_url || '.pdf';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء التريغرات للجداول المختلفة
DROP TRIGGER IF EXISTS ensure_pdf_extension_approved_books ON public.approved_books;
CREATE TRIGGER ensure_pdf_extension_approved_books
  BEFORE INSERT OR UPDATE ON public.approved_books
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_pdf_extension();

DROP TRIGGER IF EXISTS ensure_pdf_extension_book_submissions ON public.book_submissions;
CREATE TRIGGER ensure_pdf_extension_book_submissions
  BEFORE INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_pdf_extension();

DROP TRIGGER IF EXISTS ensure_pdf_extension_books ON public.books;
CREATE TRIGGER ensure_pdf_extension_books
  BEFORE INSERT OR UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_pdf_extension();

DROP TRIGGER IF EXISTS ensure_pdf_extension_book_pdfs ON public.book_pdfs;
CREATE TRIGGER ensure_pdf_extension_book_pdfs
  BEFORE INSERT OR UPDATE ON public.book_pdfs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_pdf_extension();

-- إنشاء دالة للتحقق من صحة رابط PDF
CREATE OR REPLACE FUNCTION public.validate_pdf_url(pdf_url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- التحقق من أن الرابط يحتوي على المجال الصحيح وامتداد PDF
  RETURN pdf_url IS NOT NULL 
    AND pdf_url != ''
    AND pdf_url LIKE '%supabase.co/storage/v1/object/public/%'
    AND (lower(pdf_url) LIKE '%.pdf' OR lower(pdf_url) LIKE '%.pdf?%');
END;
$$;
