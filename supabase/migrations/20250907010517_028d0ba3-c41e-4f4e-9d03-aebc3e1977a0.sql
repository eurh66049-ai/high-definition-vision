-- حذف الكتب المرفوضة الأربعة نهائياً
DELETE FROM public.book_submissions 
WHERE status = 'rejected' 
AND id IN (
  '7dbeeecf-a470-4b0e-8bae-4468282f1940',
  '9c86e9fd-0817-44b4-9589-42b3cddbb596', 
  '224b250f-b89b-40be-8237-257cd7b1e998',
  '9b67ff6f-18e4-4324-8357-b5e631f34265'
);

-- تنظيف أي ملفات مرتبطة من storage إذا كانت موجودة
DELETE FROM storage.objects 
WHERE bucket_id IN ('book-covers', 'book-files') 
AND name LIKE '%7dbeeecf-a470-4b0e-8bae-4468282f1940%'
OR name LIKE '%9c86e9fd-0817-44b4-9589-42b3cddbb596%'
OR name LIKE '%224b250f-b89b-40be-8237-257cd7b1e998%'
OR name LIKE '%9b67ff6f-18e4-4324-8357-b5e631f34265%';