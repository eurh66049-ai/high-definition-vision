-- تحديث دالة get_categories_with_counts لدمج التصنيفات الإنجليزية والعربية معاً
CREATE OR REPLACE FUNCTION public.get_categories_with_counts()
RETURNS TABLE(category text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH category_mapping AS (
    -- ربط التصنيفات المكررة معاً
    SELECT 
      bs.category as original_category,
      CASE 
        WHEN bs.category = 'poetry' THEN 'شعر'
        WHEN bs.category = 'شعر' THEN 'شعر'
        WHEN bs.category = 'novels' THEN 'روايات'
        WHEN bs.category = 'روايات' THEN 'روايات'
        WHEN bs.category = 'philosophy-culture' THEN 'فلسفة وثقافة'
        WHEN bs.category = 'فلسفة وثقافة' THEN 'فلسفة وثقافة'
        WHEN bs.category = 'literature' THEN 'أدب'
        WHEN bs.category = 'أدب' THEN 'أدب'
        WHEN bs.category = 'islamic-sciences' THEN 'العلوم الإسلامية'
        WHEN bs.category = 'العلوم الإسلامية' THEN 'العلوم الإسلامية'
        WHEN bs.category = 'human-development' THEN 'تطوير الذات'
        WHEN bs.category = 'تطوير الذات' THEN 'تطوير الذات'
        -- إضافة المزيد من التصنيفات حسب الحاجة
        ELSE bs.category
      END as unified_category
    FROM public.book_submissions bs
    WHERE bs.status = 'approved'
      AND bs.category IS NOT NULL
      AND bs.category != ''
  )
  SELECT 
    cm.unified_category as category,
    COUNT(*) as count
  FROM category_mapping cm
  GROUP BY cm.unified_category
  ORDER BY count DESC;
END;
$$;