
-- =============================================
-- 1. FIX: admin_users privilege escalation
-- =============================================
DROP POLICY IF EXISTS "Users can insert their own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;

-- =============================================
-- 2. FIX: verification_purchases open UPDATE
-- =============================================
DROP POLICY IF EXISTS "System can update verification purchases" ON public.verification_purchases;
CREATE POLICY "Only admins can update verification purchases"
  ON public.verification_purchases FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());

-- =============================================
-- 3. FIX: audiobook_jobs & audiobook_text
-- =============================================
DROP POLICY IF EXISTS "Allow service role full access to audiobook_jobs" ON public.audiobook_jobs;
DROP POLICY IF EXISTS "Allow service role full access to audiobook_text" ON public.audiobook_text;

CREATE POLICY "Admins can manage audiobook_jobs"
  ON public.audiobook_jobs FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can manage audiobook_text"
  ON public.audiobook_text FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Authenticated users can read audiobook_jobs"
  ON public.audiobook_jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read audiobook_text"
  ON public.audiobook_text FOR SELECT TO authenticated USING (true);

-- =============================================
-- 4. FIX: profiles - create safe public view
-- =============================================
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT id, username, avatar_url, bio, country_code, country_name,
  followers_count, following_count, points, is_verified, last_seen, created_at,
  social_facebook, social_instagram, social_linkedin, social_tiktok,
  social_twitter, social_whatsapp, social_youtube, website
FROM public.profiles;

-- =============================================
-- 5. FIX: page_state_cache open access
-- =============================================
DROP POLICY IF EXISTS "Allow public access for page cache" ON public.page_state_cache;

CREATE POLICY "Users can manage their own page cache"
  ON public.page_state_cache FOR ALL TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anonymous can read page cache by session"
  ON public.page_state_cache FOR SELECT TO anon
  USING (user_id IS NULL);

-- =============================================
-- 6. FIX: book_extracted_text open write
-- =============================================
DROP POLICY IF EXISTS "Service can insert book text" ON public.book_extracted_text;
DROP POLICY IF EXISTS "Service can update book text" ON public.book_extracted_text;

CREATE POLICY "Admins can insert book extracted text"
  ON public.book_extracted_text FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update book extracted text"
  ON public.book_extracted_text FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());

-- =============================================
-- 7. FIX: Storage ownership checks
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated users to delete from book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from book-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from book-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update book-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update book-uploads" ON storage.objects;

CREATE POLICY "Users can delete own book-covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-covers' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_current_user_admin()));

CREATE POLICY "Users can delete own book-files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_current_user_admin()));

CREATE POLICY "Users can delete own book-uploads" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-uploads' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_current_user_admin()));

CREATE POLICY "Users can update own book-covers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'book-covers' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_current_user_admin()));

CREATE POLICY "Users can update own book-files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'book-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_current_user_admin()));

CREATE POLICY "Users can update own book-uploads" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'book-uploads' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_current_user_admin()));

-- =============================================
-- 8. FIX: Security definer views
-- =============================================
DROP MATERIALIZED VIEW IF EXISTS public.approved_books_covers;
CREATE MATERIALIZED VIEW public.approved_books_covers AS
SELECT id, title, cover_image_url, author FROM public.approved_books;

DROP VIEW IF EXISTS public.public_books;
CREATE OR REPLACE VIEW public.public_books
WITH (security_invoker = on)
AS SELECT * FROM public.book_submissions WHERE status = 'approved';

DROP VIEW IF EXISTS public.storage_protection_status;
CREATE OR REPLACE VIEW public.storage_protection_status
WITH (security_invoker = on)
AS SELECT b.id as bucket_id, b.name as bucket_name, b.public as is_public,
  CASE WHEN b.public THEN 'WARNING: Public bucket' ELSE 'OK: Private bucket' END as status
FROM storage.buckets b;
