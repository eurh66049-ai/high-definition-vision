# Edge Function: add-pdf-watermark

## الوظيفة
إضافة شعار موقع كتبي تلقائياً على الصفحة الأولى من ملفات PDF المرفوعة.

## الاستخدام

### من JavaScript/TypeScript:
```javascript
const { data, error } = await supabase.functions.invoke('add-pdf-watermark', {
  body: {
    pdfUrl: 'https://...supabase.co/storage/v1/object/public/book-files/example.pdf',
    bucket: 'book-files'
  }
})

if (data?.watermarkedUrl) {
  console.log('PDF مع شعار:', data.watermarkedUrl)
}
```

### المعاملات:
- `pdfUrl` (مطلوب): رابط ملف PDF في Supabase Storage
- `bucket` (اختياري): اسم bucket، افتراضياً 'book-files'

### الإرجاع:
```json
{
  "success": true,
  "message": "تم إضافة الشعار على PDF بنجاح",
  "originalUrl": "رابط PDF الأصلي",
  "watermarkedUrl": "رابط PDF مع الشعار",
  "fileSize": 123456
}
```

## المتطلبات

1. **شعار الموقع**: يجب أن يكون موجوداً في Storage:
   - Bucket: `book-covers`
   - المسار: `kotobi-watermark-logo.png`

2. **صلاحيات**: Edge Function يستخدم Service Role Key للوصول إلى Storage

## كيف يعمل؟

1. تحميل ملف PDF الأصلي من Storage
2. تحميل شعار الموقع من Storage
3. استخدام مكتبة `pdf-lib` لفتح PDF
4. إضافة الشعار على الصفحة الأولى (أعلى يمين)
5. حفظ PDF المعدل
6. رفع PDF المعدل إلى Storage
7. حذف PDF الأصلي (اختياري)

## التخصيص

### تغيير موضع الشعار:
```typescript
// في index.ts:
firstPage.drawImage(logoImage, {
  x: width - logoWidth - margin,  // يمين
  y: height - logoHeight - margin, // أعلى
  // للوضع في أسفل يسار:
  // x: margin,
  // y: margin,
})
```

### تغيير حجم الشعار:
```typescript
const logoWidth = 150  // الحجم الافتراضي: 120
```

### تغيير الشفافية:
```typescript
opacity: 0.70  // الافتراضي: 0.85
```

## معالجة الأخطاء

- إذا فشل تحميل الشعار: يعود بـ PDF الأصلي بدون تعديل
- إذا فشل معالجة PDF: يعود بـ PDF الأصلي
- إذا فشل رفع PDF المعدل: يعود بـ PDF الأصلي

## Logs

راجع logs Edge Function في Supabase Dashboard للتحقق من عملية المعالجة:
- `🎨 بدء إضافة شعار الموقع على PDF`
- `✅ تم إضافة الشعار على الصفحة الأولى`
- `💾 حفظ PDF المعدل`
- `✅ تم رفع PDF المعدل بنجاح`
