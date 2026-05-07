export const KOTOBI_AI_USER_ID = '00000000-0000-0000-0000-00000000a1a1';

export const KOTOBI_AI_AVATAR_URL = '/kotobi-ai-avatar.png?v=20260422-2';

export const isKotobiAiUser = (userId?: string | null) => userId === KOTOBI_AI_USER_ID;

export const resolveKotobiAiAvatar = ({
  userId,
  avatarUrl,
}: {
  userId?: string | null;
  avatarUrl?: string | null;
}) => {
  if (isKotobiAiUser(userId)) {
    return KOTOBI_AI_AVATAR_URL;
  }

  return avatarUrl ?? null;
};