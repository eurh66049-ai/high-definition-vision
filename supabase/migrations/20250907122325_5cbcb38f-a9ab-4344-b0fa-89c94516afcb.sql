-- إنشاء دالة لتنظيف روابط الكتب المحذوفة من dynamic_sitemap
CREATE OR REPLACE FUNCTION cleanup_orphaned_book_links()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف روابط الكتب التي لم تعد موجودة أو معتمدة
  DELETE FROM dynamic_sitemap ds
  WHERE ds.page_type = 'book'
  AND ds.entity_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM book_submissions bs 
    WHERE bs.id = ds.entity_id 
    AND bs.status = 'approved'
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- إنشاء trigger لحذف رابط الكتاب من dynamic_sitemap عند تغيير حالته أو حذفه
CREATE OR REPLACE FUNCTION auto_cleanup_book_sitemap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- عند تغيير الحالة من approved أو حذف السجل
  IF (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved') OR
     (TG_OP = 'DELETE' AND OLD.status = 'approved') THEN
    
    DELETE FROM dynamic_sitemap 
    WHERE page_type = 'book' 
    AND entity_id = COALESCE(OLD.id, NEW.id);
    
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ربط الـ trigger بجدول book_submissions
DROP TRIGGER IF EXISTS cleanup_book_sitemap_trigger ON book_submissions;
CREATE TRIGGER cleanup_book_sitemap_trigger
  AFTER UPDATE OR DELETE ON book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_cleanup_book_sitemap();

-- تنظيف الروابط الحالية المُحذوفة
SELECT cleanup_orphaned_book_links() as cleaned_links;