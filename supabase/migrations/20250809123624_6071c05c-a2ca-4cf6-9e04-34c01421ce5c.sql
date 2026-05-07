-- Add Moroccan Darija variants for "تقود" insult forms and Arabizi forms to banned_words
-- Only insert if not already present

-- Arabic forms
INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'تقود', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'تقود');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'كتقود', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'كتقود');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'تتقود', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'تتقود');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'كتقواد', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'كتقواد');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'تقواد', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'تقواد');

-- Arabizi forms
INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 't9wd', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 't9wd');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'tqwd', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'tqwd');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 't9wad', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 't9wad');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'tqwad', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'tqwad');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'kat9wd', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'kat9wd');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'katqwd', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'katqwd');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'kat9wad', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'kat9wad');

INSERT INTO public.banned_words (word, category, severity, language, is_active)
SELECT 'katqwad', 'insult', 'critical', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words WHERE word = 'katqwad');