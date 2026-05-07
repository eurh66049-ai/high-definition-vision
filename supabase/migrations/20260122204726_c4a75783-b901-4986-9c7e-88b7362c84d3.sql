
-- ========================================
-- فهارس لتسريع جدول profiles (الأكثر استخداماً)
-- ========================================

-- فهرس للبحث بالـ username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles USING btree (username);

-- فهرس للبحث بالـ email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);

-- فهرس مركب للـ followers
CREATE INDEX IF NOT EXISTS idx_profiles_followers ON public.profiles USING btree (followers_count DESC NULLS LAST);

-- ========================================
-- فهارس لجدول book_submissions (الأكثر seq_scan)
-- ========================================

-- فهرس للحالة والتاريخ
CREATE INDEX IF NOT EXISTS idx_book_submissions_status ON public.book_submissions USING btree (status);

-- فهرس للمؤلف
CREATE INDEX IF NOT EXISTS idx_book_submissions_author ON public.book_submissions USING btree (author);

-- فهرس للفئة
CREATE INDEX IF NOT EXISTS idx_book_submissions_category ON public.book_submissions USING btree (category);

-- فهرس للتاريخ (تنازلي للأحدث أولاً)
CREATE INDEX IF NOT EXISTS idx_book_submissions_created_at ON public.book_submissions USING btree (created_at DESC);

-- فهرس مركب للكتب المعتمدة
CREATE INDEX IF NOT EXISTS idx_book_submissions_approved ON public.book_submissions USING btree (status, created_at DESC) WHERE status = 'approved';

-- فهرس للـ slug
CREATE INDEX IF NOT EXISTS idx_book_submissions_slug ON public.book_submissions USING btree (slug);

-- فهرس للـ user_id
CREATE INDEX IF NOT EXISTS idx_book_submissions_user_id ON public.book_submissions USING btree (user_id);

-- ========================================
-- فهارس لجدول site_updates (9584 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_site_updates_active ON public.site_updates USING btree (is_active, created_at DESC);

-- ========================================
-- فهارس لجدول book_recommendations (5707 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_book_recommendations_user_id ON public.book_recommendations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_book_recommendations_book_id ON public.book_recommendations USING btree (book_id);
CREATE INDEX IF NOT EXISTS idx_book_recommendations_created ON public.book_recommendations USING btree (created_at DESC);

-- ========================================
-- فهارس لجدول book_dislikes (3303 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_book_dislikes_user_id ON public.book_dislikes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_book_dislikes_book_id ON public.book_dislikes USING btree (book_id);

-- ========================================
-- فهارس لجدول book_reviews (2098 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_book_reviews_book_id ON public.book_reviews USING btree (book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_user_id ON public.book_reviews USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_created ON public.book_reviews USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_reviews_rating ON public.book_reviews USING btree (rating);

-- ========================================
-- فهارس لجدول authors (1494 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_authors_name ON public.authors USING btree (name);
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON public.authors USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_authors_followers ON public.authors USING btree (followers_count DESC NULLS LAST);

-- ========================================
-- فهارس لجدول review_likes (1149 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON public.review_likes USING btree (review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON public.review_likes USING btree (user_id);

-- ========================================
-- فهارس لجدول author_followers (1107 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_author_followers_created ON public.author_followers USING btree (created_at DESC);

-- ========================================
-- فهارس لجدول quotes (795 seq_scan)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_book_id ON public.quotes USING btree (book_id);
CREATE INDEX IF NOT EXISTS idx_quotes_public ON public.quotes USING btree (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON public.quotes USING btree (created_at DESC);

-- ========================================
-- فهارس لجدول quote_likes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quote_likes_quote_id ON public.quote_likes USING btree (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_likes_user_id ON public.quote_likes USING btree (user_id);

-- ========================================
-- فهارس لجدول book_likes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_book_likes_book_id ON public.book_likes USING btree (book_id);
CREATE INDEX IF NOT EXISTS idx_book_likes_user_id ON public.book_likes USING btree (user_id);

-- ========================================
-- فهارس لجدول book_stats
-- ========================================

CREATE INDEX IF NOT EXISTS idx_book_stats_rating ON public.book_stats USING btree (rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_book_stats_downloads ON public.book_stats USING btree (downloads DESC NULLS LAST);

-- ========================================
-- فهارس لجدول notifications
-- ========================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications USING btree (created_at DESC);

-- ========================================
-- فهارس لجدول reading_history
-- ========================================

CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON public.reading_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_book_id ON public.reading_history USING btree (book_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read ON public.reading_history USING btree (last_read_at DESC);

-- ========================================
-- فهارس لجدول user_followers (الجديد)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_followers_follower ON public.user_followers USING btree (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_following ON public.user_followers USING btree (following_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_created ON public.user_followers USING btree (created_at DESC);

-- ========================================
-- تحديث الإحصائيات للمخطط
-- ========================================

ANALYZE public.profiles;
ANALYZE public.book_submissions;
ANALYZE public.book_reviews;
ANALYZE public.authors;
ANALYZE public.quotes;
ANALYZE public.notifications;
ANALYZE public.book_stats;
ANALYZE public.reading_history;
