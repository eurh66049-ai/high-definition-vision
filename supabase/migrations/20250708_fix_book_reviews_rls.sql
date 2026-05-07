-- إصلاح سياسات الأمان لجدول book_reviews للسماح بقراءة جميع التقييمات علناً

-- إزالة السياسات الحالية
DROP POLICY IF EXISTS "User can read and add their book_reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "User can insert their review" ON public.book_reviews;

-- إضافة سياسة للقراءة العامة للتقييمات (يمكن لأي شخص قراءة جميع التقييمات)
CREATE POLICY "Public can read all book reviews"
  ON public.book_reviews
  FOR SELECT
  USING (true);

-- إضافة سياسة للكتابة (يمكن للمستخدمين المسجلين فقط إضافة تقييماتهم الخاصة)
CREATE POLICY "Authenticated users can insert their own reviews"
  ON public.book_reviews
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

-- إضافة سياسة للتحديث (يمكن للمستخدمين تحديث تقييماتهم الخاصة فقط)
CREATE POLICY "Users can update their own reviews"
  ON public.book_reviews
  FOR UPDATE
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

-- إضافة سياسة للحذف (يمكن للمستخدمين حذف تقييماتهم الخاصة فقط)
CREATE POLICY "Users can delete their own reviews"
  ON public.book_reviews
  FOR DELETE
  USING (auth.uid()::uuid = user_id);