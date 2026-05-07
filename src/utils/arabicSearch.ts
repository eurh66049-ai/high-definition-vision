export interface ArabicQueryVariant {
  normalized: string;
  compact: string;
}

export interface ArabicPageSearchDocument {
  page: number;
  pageText: string;
  normalizedText: string;
  compactText: string;
}

const ARABIC_DIACRITICS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const PAGE_MARKER_REGEX = /---\s*صفحة\s*\d+\s*---/g;

export const stripPageMarkers = (text: string) => (text ?? '').replace(PAGE_MARKER_REGEX, ' ').trim();

export const normalizeArabicText = (
  text: string,
  options: {
    keepSpaces?: boolean;
  } = {}
) => {
  const { keepSpaces = true } = options;

  const normalized = (text ?? '')
    .normalize('NFKC')
    .replace(/\r/g, ' ')
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, keepSpaces ? ' ' : '')
    .trim()
    .toLowerCase();

  return normalized;
};

const dedupeVariants = (variants: ArabicQueryVariant[]) => {
  const seen = new Set<string>();

  return variants.filter((variant) => {
    const key = `${variant.normalized}__${variant.compact}`;
    if (!variant.normalized && !variant.compact) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const buildArabicQueryVariants = (query: string): ArabicQueryVariant[] => {
  const normalized = normalizeArabicText(query);
  const compact = normalizeArabicText(query, { keepSpaces: false });
  const variants: ArabicQueryVariant[] = [{ normalized, compact }];

  if (normalized.startsWith('ال') && normalized.length > 3) {
    const withoutArticle = normalized.slice(2).trim();
    variants.push({
      normalized: withoutArticle,
      compact: normalizeArabicText(withoutArticle, { keepSpaces: false }),
    });
  } else if (normalized) {
    const withArticle = `ال${normalized}`;
    variants.push({
      normalized: withArticle,
      compact: normalizeArabicText(withArticle, { keepSpaces: false }),
    });
  }

  return dedupeVariants(variants);
};

export const buildArabicPageSearchDocument = (page: number, pageText: string): ArabicPageSearchDocument => {
  const cleanedPageText = stripPageMarkers(pageText).replace(/\s+/g, ' ').trim();

  return {
    page,
    pageText: cleanedPageText,
    normalizedText: normalizeArabicText(cleanedPageText),
    compactText: normalizeArabicText(cleanedPageText, { keepSpaces: false }),
  };
};

const countOccurrences = (haystack: string, needle: string) => {
  if (!haystack || !needle) return 0;

  let count = 0;
  let offset = 0;

  while (offset < haystack.length) {
    const foundAt = haystack.indexOf(needle, offset);
    if (foundAt === -1) break;
    count += 1;
    offset = foundAt + Math.max(needle.length, 1);
  }

  return count;
};

export const countBestArabicMatches = (
  document: ArabicPageSearchDocument,
  variants: ArabicQueryVariant[]
) => {
  let bestCount = 0;

  for (const variant of variants) {
    if (variant.normalized) {
      bestCount = Math.max(bestCount, countOccurrences(document.normalizedText, variant.normalized));
    }

    if (variant.compact) {
      bestCount = Math.max(bestCount, countOccurrences(document.compactText, variant.compact));
    }
  }

  return bestCount;
};

export const buildArabicSnippet = (
  pageText: string,
  rawQuery: string,
  variants: ArabicQueryVariant[]
) => {
  const cleanedPageText = stripPageMarkers(pageText).replace(/\s+/g, ' ').trim();
  if (!cleanedPageText) return '';

  const lowerPageText = cleanedPageText.toLowerCase();
  const rawCandidates = [
    rawQuery.trim(),
    ...rawQuery
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length),
  ].filter(Boolean);

  let position = rawCandidates
    .map((candidate) => lowerPageText.indexOf(candidate.toLowerCase()))
    .find((candidateIndex) => candidateIndex >= 0) ?? -1;

  if (position === -1) {
    const normalizedTokens = variants
      .flatMap((variant) => variant.normalized.split(/\s+/))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    position = normalizedTokens
      .map((token) => lowerPageText.indexOf(token))
      .find((candidateIndex) => candidateIndex >= 0) ?? -1;
  }

  if (position === -1) {
    const fallback = cleanedPageText.slice(0, 180).trim();
    return cleanedPageText.length > fallback.length ? `${fallback}…` : fallback;
  }

  const start = Math.max(0, position - 80);
  const end = Math.min(cleanedPageText.length, position + Math.max(rawQuery.trim().length, 24) + 120);
  const snippet = cleanedPageText.slice(start, end).trim();

  return `${start > 0 ? '…' : ''}${snippet}${end < cleanedPageText.length ? '…' : ''}`;
};