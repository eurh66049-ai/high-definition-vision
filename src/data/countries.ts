// قائمة الدول العربية مع أكوادها وأعلامها
export interface Country {
  code: string;
  name: string;
  nameEn: string;
}

// خيار عدم اختيار دولة
export const noCountryOption: Country = { 
  code: 'NONE', 
  name: 'لا أريد تحديد دولة', 
  nameEn: 'No country selected' 
};

export const arabCountries: Country[] = [
  { code: 'SA', name: 'السعودية', nameEn: 'Saudi Arabia' },
  { code: 'EG', name: 'مصر', nameEn: 'Egypt' },
  { code: 'MA', name: 'المغرب', nameEn: 'Morocco' },
  { code: 'DZ', name: 'الجزائر', nameEn: 'Algeria' },
  { code: 'TN', name: 'تونس', nameEn: 'Tunisia' },
  { code: 'LY', name: 'ليبيا', nameEn: 'Libya' },
  { code: 'SD', name: 'السودان', nameEn: 'Sudan' },
  { code: 'AE', name: 'الإمارات', nameEn: 'UAE' },
  { code: 'KW', name: 'الكويت', nameEn: 'Kuwait' },
  { code: 'QA', name: 'قطر', nameEn: 'Qatar' },
  { code: 'BH', name: 'البحرين', nameEn: 'Bahrain' },
  { code: 'OM', name: 'عُمان', nameEn: 'Oman' },
  { code: 'YE', name: 'اليمن', nameEn: 'Yemen' },
  { code: 'IQ', name: 'العراق', nameEn: 'Iraq' },
  { code: 'SY', name: 'سوريا', nameEn: 'Syria' },
  { code: 'LB', name: 'لبنان', nameEn: 'Lebanon' },
  { code: 'JO', name: 'الأردن', nameEn: 'Jordan' },
  { code: 'PS', name: 'فلسطين', nameEn: 'Palestine' },
  { code: 'SO', name: 'الصومال', nameEn: 'Somalia' },
  { code: 'DJ', name: 'جيبوتي', nameEn: 'Djibouti' },
  { code: 'KM', name: 'جزر القمر', nameEn: 'Comoros' },
  { code: 'MR', name: 'موريتانيا', nameEn: 'Mauritania' }
];

// جميع دول العالم
export const worldCountries: Country[] = [
  // أوروبا
  { code: 'AL', name: 'ألبانيا', nameEn: 'Albania' },
  { code: 'AD', name: 'أندورا', nameEn: 'Andorra' },
  { code: 'AM', name: 'أرمينيا', nameEn: 'Armenia' },
  { code: 'AT', name: 'النمسا', nameEn: 'Austria' },
  { code: 'AZ', name: 'أذربيجان', nameEn: 'Azerbaijan' },
  { code: 'BY', name: 'بيلاروسيا', nameEn: 'Belarus' },
  { code: 'BE', name: 'بلجيكا', nameEn: 'Belgium' },
  { code: 'BA', name: 'البوسنة والهرسك', nameEn: 'Bosnia and Herzegovina' },
  { code: 'BG', name: 'بلغاريا', nameEn: 'Bulgaria' },
  { code: 'HR', name: 'كرواتيا', nameEn: 'Croatia' },
  { code: 'CY', name: 'قبرص', nameEn: 'Cyprus' },
  { code: 'CZ', name: 'التشيك', nameEn: 'Czech Republic' },
  { code: 'DK', name: 'الدنمارك', nameEn: 'Denmark' },
  { code: 'EE', name: 'إستونيا', nameEn: 'Estonia' },
  { code: 'FI', name: 'فنلندا', nameEn: 'Finland' },
  { code: 'FR', name: 'فرنسا', nameEn: 'France' },
  { code: 'GE', name: 'جورجيا', nameEn: 'Georgia' },
  { code: 'DE', name: 'ألمانيا', nameEn: 'Germany' },
  { code: 'GR', name: 'اليونان', nameEn: 'Greece' },
  { code: 'HU', name: 'المجر', nameEn: 'Hungary' },
  { code: 'IS', name: 'آيسلندا', nameEn: 'Iceland' },
  { code: 'IE', name: 'أيرلندا', nameEn: 'Ireland' },
  { code: 'IT', name: 'إيطاليا', nameEn: 'Italy' },
  { code: 'XK', name: 'كوسوفو', nameEn: 'Kosovo' },
  { code: 'LV', name: 'لاتفيا', nameEn: 'Latvia' },
  { code: 'LI', name: 'ليختنشتاين', nameEn: 'Liechtenstein' },
  { code: 'LT', name: 'ليتوانيا', nameEn: 'Lithuania' },
  { code: 'LU', name: 'لوكسمبورغ', nameEn: 'Luxembourg' },
  { code: 'MT', name: 'مالطا', nameEn: 'Malta' },
  { code: 'MD', name: 'مولدوفا', nameEn: 'Moldova' },
  { code: 'MC', name: 'موناكو', nameEn: 'Monaco' },
  { code: 'ME', name: 'الجبل الأسود', nameEn: 'Montenegro' },
  { code: 'NL', name: 'هولندا', nameEn: 'Netherlands' },
  { code: 'MK', name: 'مقدونيا الشمالية', nameEn: 'North Macedonia' },
  { code: 'NO', name: 'النرويج', nameEn: 'Norway' },
  { code: 'PL', name: 'بولندا', nameEn: 'Poland' },
  { code: 'PT', name: 'البرتغال', nameEn: 'Portugal' },
  { code: 'RO', name: 'رومانيا', nameEn: 'Romania' },
  { code: 'RU', name: 'روسيا', nameEn: 'Russia' },
  { code: 'SM', name: 'سان مارينو', nameEn: 'San Marino' },
  { code: 'RS', name: 'صربيا', nameEn: 'Serbia' },
  { code: 'SK', name: 'سلوفاكيا', nameEn: 'Slovakia' },
  { code: 'SI', name: 'سلوفينيا', nameEn: 'Slovenia' },
  { code: 'ES', name: 'إسبانيا', nameEn: 'Spain' },
  { code: 'SE', name: 'السويد', nameEn: 'Sweden' },
  { code: 'CH', name: 'سويسرا', nameEn: 'Switzerland' },
  { code: 'TR', name: 'تركيا', nameEn: 'Turkey' },
  { code: 'UA', name: 'أوكرانيا', nameEn: 'Ukraine' },
  { code: 'GB', name: 'المملكة المتحدة', nameEn: 'United Kingdom' },
  { code: 'VA', name: 'الفاتيكان', nameEn: 'Vatican City' },

  // آسيا
  { code: 'AF', name: 'أفغانستان', nameEn: 'Afghanistan' },
  { code: 'BD', name: 'بنغلاديش', nameEn: 'Bangladesh' },
  { code: 'BT', name: 'بوتان', nameEn: 'Bhutan' },
  { code: 'BN', name: 'بروناي', nameEn: 'Brunei' },
  { code: 'KH', name: 'كمبوديا', nameEn: 'Cambodia' },
  { code: 'CN', name: 'الصين', nameEn: 'China' },
  { code: 'TL', name: 'تيمور الشرقية', nameEn: 'East Timor' },
  { code: 'IN', name: 'الهند', nameEn: 'India' },
  { code: 'ID', name: 'إندونيسيا', nameEn: 'Indonesia' },
  { code: 'IR', name: 'إيران', nameEn: 'Iran' },
  { code: 'JP', name: 'اليابان', nameEn: 'Japan' },
  { code: 'KZ', name: 'كازاخستان', nameEn: 'Kazakhstan' },
  { code: 'KG', name: 'قيرغيزستان', nameEn: 'Kyrgyzstan' },
  { code: 'LA', name: 'لاوس', nameEn: 'Laos' },
  { code: 'MY', name: 'ماليزيا', nameEn: 'Malaysia' },
  { code: 'MV', name: 'المالديف', nameEn: 'Maldives' },
  { code: 'MN', name: 'منغوليا', nameEn: 'Mongolia' },
  { code: 'MM', name: 'ميانمار', nameEn: 'Myanmar' },
  { code: 'NP', name: 'نيبال', nameEn: 'Nepal' },
  { code: 'KP', name: 'كوريا الشمالية', nameEn: 'North Korea' },
  { code: 'PK', name: 'باكستان', nameEn: 'Pakistan' },
  { code: 'PH', name: 'الفلبين', nameEn: 'Philippines' },
  { code: 'SG', name: 'سنغافورة', nameEn: 'Singapore' },
  { code: 'KR', name: 'كوريا الجنوبية', nameEn: 'South Korea' },
  { code: 'LK', name: 'سريلانكا', nameEn: 'Sri Lanka' },
  { code: 'TJ', name: 'طاجيكستان', nameEn: 'Tajikistan' },
  { code: 'TH', name: 'تايلاند', nameEn: 'Thailand' },
  { code: 'TM', name: 'تركمانستان', nameEn: 'Turkmenistan' },
  { code: 'UZ', name: 'أوزبكستان', nameEn: 'Uzbekistan' },
  { code: 'VN', name: 'فيتنام', nameEn: 'Vietnam' },

  // أفريقيا
  { code: 'AO', name: 'أنغولا', nameEn: 'Angola' },
  { code: 'BJ', name: 'بنين', nameEn: 'Benin' },
  { code: 'BW', name: 'بوتسوانا', nameEn: 'Botswana' },
  { code: 'BF', name: 'بوركينا فاسو', nameEn: 'Burkina Faso' },
  { code: 'BI', name: 'بوروندي', nameEn: 'Burundi' },
  { code: 'CV', name: 'الرأس الأخضر', nameEn: 'Cape Verde' },
  { code: 'CM', name: 'الكاميرون', nameEn: 'Cameroon' },
  { code: 'CF', name: 'جمهورية أفريقيا الوسطى', nameEn: 'Central African Republic' },
  { code: 'TD', name: 'تشاد', nameEn: 'Chad' },
  { code: 'CG', name: 'الكونغو', nameEn: 'Congo' },
  { code: 'CD', name: 'جمهورية الكونغو الديمقراطية', nameEn: 'Democratic Republic of the Congo' },
  { code: 'CI', name: 'ساحل العاج', nameEn: 'Ivory Coast' },
  { code: 'ER', name: 'إرتيريا', nameEn: 'Eritrea' },
  { code: 'SZ', name: 'إسواتيني', nameEn: 'Eswatini' },
  { code: 'ET', name: 'إثيوبيا', nameEn: 'Ethiopia' },
  { code: 'GA', name: 'الغابون', nameEn: 'Gabon' },
  { code: 'GM', name: 'غامبيا', nameEn: 'Gambia' },
  { code: 'GH', name: 'غانا', nameEn: 'Ghana' },
  { code: 'GN', name: 'غينيا', nameEn: 'Guinea' },
  { code: 'GW', name: 'غينيا بيساو', nameEn: 'Guinea-Bissau' },
  { code: 'KE', name: 'كينيا', nameEn: 'Kenya' },
  { code: 'LS', name: 'ليسوتو', nameEn: 'Lesotho' },
  { code: 'LR', name: 'ليبيريا', nameEn: 'Liberia' },
  { code: 'MG', name: 'مدغشقر', nameEn: 'Madagascar' },
  { code: 'MW', name: 'ملاوي', nameEn: 'Malawi' },
  { code: 'ML', name: 'مالي', nameEn: 'Mali' },
  { code: 'MZ', name: 'موزمبيق', nameEn: 'Mozambique' },
  { code: 'NA', name: 'ناميبيا', nameEn: 'Namibia' },
  { code: 'NE', name: 'النيجر', nameEn: 'Niger' },
  { code: 'NG', name: 'نيجيريا', nameEn: 'Nigeria' },
  { code: 'RW', name: 'رواندا', nameEn: 'Rwanda' },
  { code: 'ST', name: 'ساو تومي وبرينسيبي', nameEn: 'São Tomé and Príncipe' },
  { code: 'SN', name: 'السنغال', nameEn: 'Senegal' },
  { code: 'SC', name: 'سيشيل', nameEn: 'Seychelles' },
  { code: 'SL', name: 'سيراليون', nameEn: 'Sierra Leone' },
  { code: 'ZA', name: 'جنوب أفريقيا', nameEn: 'South Africa' },
  { code: 'SS', name: 'جنوب السودان', nameEn: 'South Sudan' },
  { code: 'TZ', name: 'تنزانيا', nameEn: 'Tanzania' },
  { code: 'TG', name: 'توغو', nameEn: 'Togo' },
  { code: 'UG', name: 'أوغندا', nameEn: 'Uganda' },
  { code: 'ZM', name: 'زامبيا', nameEn: 'Zambia' },
  { code: 'ZW', name: 'زيمبابوي', nameEn: 'Zimbabwe' },

  // أمريكا الشمالية
  { code: 'CA', name: 'كندا', nameEn: 'Canada' },
  { code: 'MX', name: 'المكسيك', nameEn: 'Mexico' },
  { code: 'US', name: 'الولايات المتحدة', nameEn: 'United States' },

  // أمريكا الوسطى والكاريبي
  { code: 'AG', name: 'أنتيغوا وبربودا', nameEn: 'Antigua and Barbuda' },
  { code: 'BS', name: 'البهاما', nameEn: 'Bahamas' },
  { code: 'BB', name: 'بربادوس', nameEn: 'Barbados' },
  { code: 'BZ', name: 'بليز', nameEn: 'Belize' },
  { code: 'CR', name: 'كوستاريكا', nameEn: 'Costa Rica' },
  { code: 'CU', name: 'كوبا', nameEn: 'Cuba' },
  { code: 'DM', name: 'دومينيكا', nameEn: 'Dominica' },
  { code: 'DO', name: 'جمهورية الدومينيكان', nameEn: 'Dominican Republic' },
  { code: 'SV', name: 'السلفادور', nameEn: 'El Salvador' },
  { code: 'GD', name: 'غرينادا', nameEn: 'Grenada' },
  { code: 'GT', name: 'غواتيمالا', nameEn: 'Guatemala' },
  { code: 'HT', name: 'هايتي', nameEn: 'Haiti' },
  { code: 'HN', name: 'هندوراس', nameEn: 'Honduras' },
  { code: 'JM', name: 'جامايكا', nameEn: 'Jamaica' },
  { code: 'NI', name: 'نيكاراغوا', nameEn: 'Nicaragua' },
  { code: 'PA', name: 'بنما', nameEn: 'Panama' },
  { code: 'KN', name: 'سانت كيتس ونيفيس', nameEn: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'سانت لوسيا', nameEn: 'Saint Lucia' },
  { code: 'VC', name: 'سانت فينسنت والغرينادين', nameEn: 'Saint Vincent and the Grenadines' },
  { code: 'TT', name: 'ترينيداد وتوباغو', nameEn: 'Trinidad and Tobago' },

  // أمريكا الجنوبية
  { code: 'AR', name: 'الأرجنتين', nameEn: 'Argentina' },
  { code: 'BO', name: 'بوليفيا', nameEn: 'Bolivia' },
  { code: 'BR', name: 'البرازيل', nameEn: 'Brazil' },
  { code: 'CL', name: 'تشيلي', nameEn: 'Chile' },
  { code: 'CO', name: 'كولومبيا', nameEn: 'Colombia' },
  { code: 'EC', name: 'الإكوادور', nameEn: 'Ecuador' },
  { code: 'GY', name: 'غيانا', nameEn: 'Guyana' },
  { code: 'PY', name: 'باراغواي', nameEn: 'Paraguay' },
  { code: 'PE', name: 'البيرو', nameEn: 'Peru' },
  { code: 'SR', name: 'سورينام', nameEn: 'Suriname' },
  { code: 'UY', name: 'أوروغواي', nameEn: 'Uruguay' },
  { code: 'VE', name: 'فنزويلا', nameEn: 'Venezuela' },

  // أوقيانوسيا
  { code: 'AU', name: 'أستراليا', nameEn: 'Australia' },
  { code: 'FJ', name: 'فيجي', nameEn: 'Fiji' },
  { code: 'KI', name: 'كيريباتي', nameEn: 'Kiribati' },
  { code: 'MH', name: 'جزر مارشال', nameEn: 'Marshall Islands' },
  { code: 'FM', name: 'ميكرونيزيا', nameEn: 'Micronesia' },
  { code: 'NR', name: 'ناورو', nameEn: 'Nauru' },
  { code: 'NZ', name: 'نيوزيلندا', nameEn: 'New Zealand' },
  { code: 'PW', name: 'بالاو', nameEn: 'Palau' },
  { code: 'PG', name: 'بابوا غينيا الجديدة', nameEn: 'Papua New Guinea' },
  { code: 'WS', name: 'ساموا', nameEn: 'Samoa' },
  { code: 'SB', name: 'جزر سليمان', nameEn: 'Solomon Islands' },
  { code: 'TO', name: 'تونغا', nameEn: 'Tonga' },
  { code: 'TV', name: 'توفالو', nameEn: 'Tuvalu' },
  { code: 'VU', name: 'فانواتو', nameEn: 'Vanuatu' }
];

// دمج جميع الدول مع خيار عدم اختيار دولة
export const allCountries: Country[] = [noCountryOption, ...arabCountries, ...worldCountries];

// وظيفة للحصول على علم الدولة
export const getCountryFlag = (countryCode: string): string => {
  if (countryCode === 'NONE') return '🌍';
  return `https://flagsapi.com/${countryCode.toUpperCase()}/flat/32.png`;
};

// وظيفة للبحث عن دولة بالكود
export const getCountryByCode = (code: string): Country | undefined => {
  if (code === 'NONE') return noCountryOption;
  return allCountries.find(country => country.code.toLowerCase() === code.toLowerCase());
};