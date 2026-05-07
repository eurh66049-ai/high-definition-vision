/**
 * دوال مساعدة لإنشاء slug من عنوان الكتاب واسم المؤلف
 */

/**
 * تحويل العنوان والمؤلف إلى slug صالح للURL
 */
export function createBookSlug(title: string, author: string): string {
  // تنظيف العنوان والمؤلف بشكل منفصل أولاً
  const cleanTitle = title
    .trim()
    .replace(/[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  const cleanAuthor = author
    .trim()
    .replace(/[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // دمج العنوان والمؤلف مع ضمان وجود فاصل
  const combined = `${cleanTitle} ${cleanAuthor}`;
  
  return combined
    .trim()
    // استبدال المساحات بشرطات
    .replace(/\s+/g, '-')
    // إزالة الشرطات المتعددة
    .replace(/-+/g, '-')
    // إزالة الشرطات في البداية والنهاية
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * استخراج العنوان والمؤلف من slug
 */
export function parseBookSlug(slug: string): { title: string; author: string } | null {
  if (!slug) return null;
  
  const parts = slug.split('-');
  if (parts.length < 2) return null;
  
  // نعتبر أن آخر جزء هو اسم المؤلف والباقي هو العنوان
  const author = parts[parts.length - 1];
  const title = parts.slice(0, -1).join('-');
  
  return {
    title: title.replace(/-/g, ' '),
    author: author.replace(/-/g, ' ')
  };
}

/**
 * تنظيف النص من الأحرف الخاصة والمساحات الزائدة
 */
export function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9\s]/g, '');
}