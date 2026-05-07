-- نقل الكتب من تصنيف "رواية" إلى "novels"
UPDATE public.book_submissions 
SET category = 'novels'
WHERE category = 'رواية' AND status = 'approved';

-- تحديث دالة get_categories_with_pagination لاستبعاد تصنيف "رواية"
CREATE OR REPLACE FUNCTION public.get_categories_with_pagination(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(category text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH mapped AS (
    SELECT
      CASE 
        WHEN bs.category IN ('poetry','شعر') THEN 'شعر'
        WHEN bs.category IN ('novels','روايات','رواية') THEN 'روايات'
        WHEN bs.category IN ('philosophy-culture','فلسفة وثقافة') THEN 'فلسفة وثقافة'
        WHEN bs.category IN ('literature','أدب') THEN 'أدب'
        WHEN bs.category IN ('islamic-sciences','العلوم الإسلامية') THEN 'العلوم الإسلامية'
        WHEN bs.category IN ('human-development','تطوير الذات','personal-development','Human Development') THEN 'تطوير الذات'
        ELSE bs.category
      END AS unified_category
    FROM public.book_submissions bs
    WHERE bs.status = 'approved'
      AND bs.category IS NOT NULL
      AND bs.category <> ''
  )
  SELECT unified_category AS category, COUNT(*) AS count
  FROM mapped
  GROUP BY unified_category
  ORDER BY count DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;