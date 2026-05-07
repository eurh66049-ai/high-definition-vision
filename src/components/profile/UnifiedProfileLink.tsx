import React, { useCallback, useMemo } from 'react';
import { type LinkProps } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { getPublicUserProfilePath } from '@/utils/userProfile';

// Cache resolved paths to avoid repeated Supabase calls across the app.
// Keyed by userId when available, otherwise by username.
const resolvedPathCache = new Map<string, string>();

type Props = Omit<LinkProps, 'to'> & {
  userId?: string | null;
  username?: string | null;
};

function getCacheKey(userId?: string | null, username?: string | null) {
  if (userId) return `uid:${userId}`;
  return `un:${(username || '').trim()}`;
}

function getUserFallbackPath(userId?: string | null, username?: string | null) {
  const identifier = (username || '').trim() || (userId || '').trim();
  return identifier ? getPublicUserProfilePath(identifier) : '/';
}

export function UnifiedProfileLink({ userId, username, onClick, className, children, ...props }: Props) {
  const cacheKey = useMemo(() => getCacheKey(userId, username), [userId, username]);

  const fallbackTo = useMemo(() => {
    const cached = resolvedPathCache.get(cacheKey);
    return cached || getUserFallbackPath(userId, username);
  }, [cacheKey, userId, username]);

  const resolvePath = useCallback(async () => {
    const cached = resolvedPathCache.get(cacheKey);
    if (cached) return cached;

    // If we have userId, we can reliably detect if the user is an author.
    if (userId) {
      const { data, error } = await supabase
        .from('authors')
        .select('slug, name')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        const identifier = (data.slug || '').trim() || (data.name || '').trim();
        if (identifier) {
          const authorPath = `/author/${encodeURIComponent(identifier)}`;
          resolvedPathCache.set(cacheKey, authorPath);
          return authorPath;
        }
      }
    }

    const userPath = getUserFallbackPath(userId, username);
    resolvedPathCache.set(cacheKey, userPath);
    return userPath;
  }, [cacheKey, userId, username]);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e as any);
      if (e.defaultPrevented) return;

      // Allow open-in-new-tab / modifiers to work normally
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      const path = await resolvePath();
      // Use window.location for reliable navigation
      window.location.href = path;
    },
    [onClick, resolvePath]
  );

  return (
    <a 
      href={fallbackTo} 
      onClick={handleClick} 
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}
