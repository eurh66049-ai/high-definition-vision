-- إنشاء دالة لتنظيف وتحسين نص نبذة المؤلف
CREATE OR REPLACE FUNCTION public.normalize_author_bio(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- إذا كان النص فارغاً أو null، إرجاع null
  IF input_text IS NULL OR TRIM(input_text) = '' THEN
    RETURN NULL;
  END IF;
  
  -- تطبيع كسر الأسطر المختلفة إلى \n
  -- تحويل \r\n إلى \n أولاً
  input_text := REPLACE(input_text, E'\r\n', E'\n');
  -- تحويل \r المنفردة إلى \n
  input_text := REPLACE(input_text, E'\r', E'\n');
  
  -- إزالة المسافات الزائدة في بداية ونهاية كل سطر مع الحفاظ على الأسطر الفارغة
  input_text := REGEXP_REPLACE(input_text, E'[ \t]+\n', E'\n', 'g');
  input_text := REGEXP_REPLACE(input_text, E'\n[ \t]+', E'\n', 'g');
  
  -- تقليل الأسطر الفارغة المتعددة المتتالية إلى سطرين فارغين كحد أقصى
  input_text := REGEXP_REPLACE(input_text, E'\n{4,}', E'\n\n\n', 'g');
  
  -- إزالة المسافات الزائدة في البداية والنهاية مع الحفاظ على كسر الأسطر
  input_text := REGEXP_REPLACE(input_text, E'^[ \t\n]+', '');
  input_text := REGEXP_REPLACE(input_text, E'[ \t\n]+$', '');
  
  RETURN input_text;
END;
$$;