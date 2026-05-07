const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value?: string | null) => {
  if (!value) return false;
  return UUID_RE.test(value.trim());
};

export const getPublicUserProfilePath = (identifier: string) => {
  const safe = encodeURIComponent((identifier || '').trim());
  return `/user/${safe}`;
};
