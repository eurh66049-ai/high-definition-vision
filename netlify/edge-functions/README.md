# Edge Functions لمنصة كتبي

## book-meta.ts

هذه دالة Edge Function تتولى توليد meta tags ديناميكية لصفحات الكتب عند مشاركة الروابط على مواقع التواصل الاجتماعي.

### كيف تعمل

1. **اكتشاف Bot/Crawler**: تتحقق الدالة من User Agent لتحديد ما إذا كان الطلب من bot أو crawler
2. **البحث عن الكتاب**: تبحث عن الكتاب في قاعدة البيانات حسب ID
3. **توليد HTML ديناميكي**: تولد صفحة HTML مع meta tags محددة للكتاب
4. **إعادة التوجيه**: توجه المستخدمين العاديين للتطبيق الأساسي

### إضافة كتب جديدة

لإضافة كتب جديدة للنظام، حدث ملف `book-data.ts`:

```typescript
{
  "id": "معرف-فريد-للكتاب",
  "title": "عنوان الكتاب",
  "author": "اسم المؤلف", 
  "description": "وصف مختصر للكتاب",
  "category": "تصنيف الكتاب",
  "cover_image_url": "رابط صورة الغلاف",
  "publication_year": 2023
}
```

### User Agents المدعومة

- Facebook: `facebookexternalhit`
- Twitter: `twitterbot` 
- LinkedIn: `linkedinbot`
- WhatsApp: `whatsapp`
- Telegram: `telegram`
- Discord: `discord`
- Slack: `slack`
- Google: `googlebot`
- Bing: `bingbot`

### Caching

- مدة التخزين المؤقت: 5 دقائق
- نوع المحتوى: `text/html; charset=utf-8`

### Testing

لاختبار الدالة محلياً:

```bash
curl -H "User-Agent: facebookexternalhit/1.1" https://yoursite.netlify.app/book/book-id
```