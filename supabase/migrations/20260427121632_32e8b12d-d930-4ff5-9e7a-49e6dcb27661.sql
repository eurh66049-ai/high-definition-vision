CREATE OR REPLACE FUNCTION public.is_text_corrupted(p_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  sample text;
  arabic_count int;
  total_letters int;
  pdf_marker_count int;
BEGIN
  IF p_text IS NULL OR length(p_text) < 100 THEN
    RETURN true;
  END IF;

  sample := substring(p_text, 1, 4000);

  pdf_marker_count := (
      (length(sample) - length(replace(sample, 'FlateDecode', ''))) / length('FlateDecode')
    + (length(sample) - length(replace(sample, 'endstream', ''))) / length('endstream')
    + (length(sample) - length(replace(sample, 'XObject', ''))) / length('XObject')
    + (length(sample) - length(replace(sample, 'DeviceRGB', ''))) / length('DeviceRGB')
    + (length(sample) - length(replace(sample, 'DCTDecode', ''))) / length('DCTDecode')
    + (length(sample) - length(replace(sample, 'JFIF', ''))) / length('JFIF')
  );

  IF pdf_marker_count >= 2 THEN
    RETURN true;
  END IF;

  arabic_count    := length(regexp_replace(sample, '[^\u0600-\u06FF]', '', 'g'));
  total_letters   := length(regexp_replace(sample, '[^A-Za-z\u0600-\u06FF]', '', 'g'));

  IF total_letters > 200 AND arabic_count::float / total_letters < 0.15 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;