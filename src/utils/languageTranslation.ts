/**
 * ترجمة أسماء اللغات إلى العربية
 */

const languageTranslations: { [key: string]: string } = {
  // اللغة العربية
  'arabic': 'العربية',
  'arab': 'العربية',
  'ar': 'العربية',
  
  // اللغة الإنجليزية
  'english': 'الإنجليزية',
  'en': 'الإنجليزية',
  
  // اللغة الفرنسية
  'french': 'الفرنسية',
  'fr': 'الفرنسية',
  
  // اللغة الألمانية
  'german': 'الألمانية',
  'de': 'الألمانية',
  
  // اللغة الإسبانية
  'spanish': 'الإسبانية',
  'es': 'الإسبانية',
  
  // اللغة الإيطالية
  'italian': 'الإيطالية',
  'it': 'الإيطالية',
  
  // اللغة التركية
  'turkish': 'التركية',
  'tr': 'التركية',
  
  // اللغة الفارسية
  'persian': 'الفارسية',
  'farsi': 'الفارسية',
  'fa': 'الفارسية',
  
  // اللغة الأردية
  'urdu': 'الأردية',
  'ur': 'الأردية',
  
  // اللغة الكردية
  'kurdish': 'الكردية',
  'ku': 'الكردية',
  
  // اللغة الأمازيغية
  'berber': 'الأمازيغية',
  'amazigh': 'الأمازيغية',
  
  // اللغة العبرية
  'hebrew': 'العبرية',
  'he': 'العبرية',
  
  // لغات أخرى شائعة
  'russian': 'الروسية',
  'ru': 'الروسية',
  'chinese': 'الصينية',
  'zh': 'الصينية',
  'japanese': 'اليابانية',
  'ja': 'اليابانية',
  'korean': 'الكورية',
  'ko': 'الكورية',
  'hindi': 'الهندية',
  'hi': 'الهندية',
  'portuguese': 'البرتغالية',
  'pt': 'البرتغالية',
  'dutch': 'الهولندية',
  'nl': 'الهولندية',
  'swedish': 'السويدية',
  'sv': 'السويدية',
  'norwegian': 'النرويجية',
  'no': 'النرويجية',
  'danish': 'الدنماركية',
  'da': 'الدنماركية',
  'finnish': 'الفنلندية',
  'fi': 'الفنلندية',
  'greek': 'اليونانية',
  'el': 'اليونانية',
  'polish': 'البولندية',
  'pl': 'البولندية',
  'czech': 'التشيكية',
  'cs': 'التشيكية',
  'hungarian': 'المجرية',
  'hu': 'المجرية',
  'romanian': 'الرومانية',
  'ro': 'الرومانية',
  'bulgarian': 'البلغارية',
  'bg': 'البلغارية',
  'croatian': 'الكرواتية',
  'hr': 'الكرواتية',
  'serbian': 'الصربية',
  'sr': 'الصربية',
  'bosnian': 'البوسنية',
  'bs': 'البوسنية',
  'albanian': 'الألبانية',
  'sq': 'الألبانية',
  'macedonian': 'المقدونية',
  'mk': 'المقدونية',
  'slovak': 'السلوفاكية',
  'sk': 'السلوفاكية',
  'slovenian': 'السلوفينية',
  'sl': 'السلوفينية',
  'estonian': 'الإستونية',
  'et': 'الإستونية',
  'latvian': 'اللاتفية',
  'lv': 'اللاتفية',
  'lithuanian': 'الليتوانية',
  'lt': 'الليتوانية'
};

/**
 * ترجمة اسم اللغة إلى العربية
 * @param language اسم اللغة بالإنجليزية أو الكود
 * @returns اسم اللغة بالعربية
 */
export const getLanguageInArabic = (language: string): string => {
  if (!language) return '';
  
  const normalizedLanguage = language.toLowerCase().trim();
  const arabicName = languageTranslations[normalizedLanguage];
  
  // إذا لم نجد ترجمة، نعيد الاسم الأصلي مع تنسيق أفضل
  if (!arabicName) {
    // نحول الحرف الأول إلى حرف كبير
    return language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
  }
  
  return arabicName;
};

/**
 * التحقق من وجود ترجمة للغة معينة
 * @param language اسم اللغة
 * @returns true إذا كانت الترجمة متوفرة
 */
export const hasLanguageTranslation = (language: string): boolean => {
  if (!language) return false;
  const normalizedLanguage = language.toLowerCase().trim();
  return languageTranslations.hasOwnProperty(normalizedLanguage);
};

/**
 * الحصول على جميع اللغات المتاحة
 * @returns مصفوفة من اللغات بالعربية والإنجليزية
 */
export const getAllLanguages = (): Array<{english: string, arabic: string}> => {
  return Object.entries(languageTranslations).map(([english, arabic]) => ({
    english,
    arabic
  }));
};