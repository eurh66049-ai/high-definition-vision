-- Author page: fetch author + interaction (follow/message/social/last_seen) in ONE RPC

CREATE OR REPLACE FUNCTION public.get_author_page_data(
  p_identifier TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author RECORD;
  v_profile RECORD;
  v_is_following BOOLEAN := FALSE;
  v_followers_count INT := 0;
  v_allow_messaging BOOLEAN := TRUE;
  v_last_seen TIMESTAMPTZ := NULL;
  v_social_links JSON := '{}'::json;
  v_message_request RECORD;
  v_message_request_json JSON := NULL;
  v_is_own_author BOOLEAN := FALSE;
  v_is_verified BOOLEAN := FALSE;
BEGIN
  -- Find author by slug OR id OR name
  SELECT a.*
  INTO v_author
  FROM public.authors a
  WHERE a.slug = p_identifier
     OR a.id::text = p_identifier
     OR lower(a.name) = lower(p_identifier)
     OR a.name ILIKE p_identifier
     OR a.name ILIKE replace(p_identifier, '-', ' ')
  ORDER BY
    (a.slug = p_identifier) DESC,
    (a.id::text = p_identifier) DESC,
    (lower(a.name) = lower(p_identifier)) DESC,
    a.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('author', NULL, 'interaction', NULL);
  END IF;

  -- Verified (fallback to column if RPC fails)
  BEGIN
    SELECT public.is_author_verified(p_author_id := v_author.id) INTO v_is_verified;
  EXCEPTION WHEN OTHERS THEN
    v_is_verified := COALESCE(v_author.is_verified, FALSE);
  END;

  -- Profile-derived data (messaging + last_seen + social)
  IF v_author.user_id IS NOT NULL THEN
    SELECT
      allow_messaging,
      last_seen,
      social_instagram,
      social_twitter,
      social_facebook,
      social_whatsapp,
      social_youtube,
      social_linkedin,
      social_tiktok
    INTO v_profile
    FROM public.profiles
    WHERE id = v_author.user_id;

    IF FOUND THEN
      v_allow_messaging := COALESCE(v_profile.allow_messaging, TRUE);
      v_last_seen := v_profile.last_seen;

      v_social_links := json_build_object(
        'instagram', v_profile.social_instagram,
        'twitter', v_profile.social_twitter,
        'facebook', v_profile.social_facebook,
        'whatsapp', v_profile.social_whatsapp,
        'youtube', v_profile.social_youtube,
        'linkedin', v_profile.social_linkedin,
        'tiktok', v_profile.social_tiktok
      );
    END IF;
  END IF;

  -- Fallback social links from authors.social_links
  IF (v_social_links = '{}'::json OR v_social_links IS NULL) AND v_author.social_links IS NOT NULL THEN
    v_social_links := v_author.social_links;
  END IF;

  -- Followers count (prefer cached column)
  v_followers_count := COALESCE(v_author.followers_count, 0);
  IF v_followers_count = 0 THEN
    SELECT COUNT(*)::int INTO v_followers_count
    FROM public.author_followers
    WHERE author_id = v_author.id;
  END IF;

  -- Auth-dependent interaction data
  IF auth.uid() IS NOT NULL THEN
    -- Own author detection
    IF v_author.user_id IS NOT NULL AND v_author.user_id = auth.uid() THEN
      v_is_own_author := TRUE;
    ELSE
      SELECT EXISTS(
        SELECT 1
        FROM public.book_submissions
        WHERE user_id = auth.uid()
          AND author = v_author.name
        LIMIT 1
      ) INTO v_is_own_author;
    END IF;

    -- Follow status
    SELECT EXISTS(
      SELECT 1
      FROM public.author_followers
      WHERE user_id = auth.uid()
        AND author_id = v_author.id
    ) INTO v_is_following;

    -- Message request status (only if author has a linked user)
    IF v_author.user_id IS NOT NULL AND auth.uid() <> v_author.user_id THEN
      SELECT id, sender_id, receiver_id, status, created_at
      INTO v_message_request
      FROM public.message_requests
      WHERE (sender_id = auth.uid() AND receiver_id = v_author.user_id)
         OR (sender_id = v_author.user_id AND receiver_id = auth.uid())
      ORDER BY created_at DESC
      LIMIT 1;

      IF FOUND THEN
        v_message_request_json := json_build_object(
          'id', v_message_request.id,
          'sender_id', v_message_request.sender_id,
          'receiver_id', v_message_request.receiver_id,
          'status', v_message_request.status,
          'is_sender', (v_message_request.sender_id = auth.uid())
        );
      END IF;
    END IF;
  END IF;

  RETURN json_build_object(
    'author', json_build_object(
      'id', v_author.id,
      'name', v_author.name,
      'bio', v_author.bio,
      'avatar_url', v_author.avatar_url,
      'books_count', COALESCE(v_author.books_count, 0),
      'country_code', v_author.country_code,
      'country_name', v_author.country_name,
      'followers_count', v_followers_count,
      'is_verified', v_is_verified,
      'user_id', v_author.user_id,
      'website', v_author.website,
      'created_at', v_author.created_at
    ),
    'interaction', json_build_object(
      'is_following', v_is_following,
      'is_own_author', v_is_own_author,
      'allow_messaging', v_allow_messaging,
      'last_seen', v_last_seen,
      'social_links', v_social_links,
      'message_request', v_message_request_json
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_author_page_data(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_author_page_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_author_page_data(TEXT) TO authenticated;
