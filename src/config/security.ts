// إعدادات الأمان للموقع
export const SecurityConfig = {
  // إعدادات حماية البيانات
  dataProtection: {
    enableEncryption: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 ساعة
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 دقيقة
  },

  // إعدادات حماية الخصوصية
  privacy: {
    hideDevInfo: process.env.NODE_ENV === 'production',
    disableConsole: process.env.NODE_ENV === 'production',
    preventRightClick: process.env.NODE_ENV === 'production',
    preventDevTools: process.env.NODE_ENV === 'production',
  },

  // إعدادات الطلبات الآمنة
  requests: {
    maxRetries: 3,
    timeout: 10000, // 10 ثوان
    validateHeaders: true,
    useCSRF: true,
  },

  // قائمة المجالات الموثوقة
  trustedDomains: [
    'kotobi.xyz',
    'kydmyxsgyxeubhmqzrgo.supabase.co',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ],

  // كلمات محظورة للتنظيف
  blockedKeywords: [
    'script',
    'eval',
    'javascript:',
    'vbscript:',
    'onload',
    'onerror',
    'onclick'
  ],

  // إعدادات التشفير
  encryption: {
    algorithm: 'base64', // تشفير بسيط
    saltLength: 16,
    iterations: 1000
  }
};

// دالة التحقق من المجال الموثوق
export function isTrustedDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname;
    return SecurityConfig.trustedDomains.some(trusted => 
      domain === trusted || domain.endsWith('.' + trusted)
    );
  } catch {
    return false;
  }
}

// دالة التحقق من المحتوى الآمن
export function isContentSafe(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return !SecurityConfig.blockedKeywords.some(keyword => 
    lowerContent.includes(keyword)
  );
}