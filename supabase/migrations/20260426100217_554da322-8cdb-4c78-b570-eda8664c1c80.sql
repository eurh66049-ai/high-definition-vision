UPDATE profiles p
SET last_seen = sub.last_activity
FROM (
  SELECT b.profile_id, MAX(l.created_at) AS last_activity
  FROM ai_bot_book_activity_log l
  JOIN ai_bot_accounts b ON b.id = l.bot_id
  WHERE l.status = 'success'
  GROUP BY b.profile_id
) sub
WHERE p.id = sub.profile_id AND p.is_ai_bot = true;