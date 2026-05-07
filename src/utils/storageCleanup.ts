import { supabase } from '@/integrations/supabase/client';

interface UploadedFile {
  url: string;
  bucket: string;
  path: string;
}

export class StorageCleanup {
  private uploadedFiles: UploadedFile[] = [];

  // تسجيل ملف تم رفعه للتنظيف في حالة الفشل
  registerUploadedFile(url: string, bucket: string) {
    // استخراج المسار من الرابط
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === bucket);
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      const path = urlParts.slice(bucketIndex + 1).join('/');
      this.uploadedFiles.push({ url, bucket, path });
      console.log(`📝 تم تسجيل ملف للتنظيف: ${bucket}/${path}`);
    }
  }

  // حذف جميع الملفات المسجلة
  async cleanupAllFiles(): Promise<void> {
    if (this.uploadedFiles.length === 0) {
      console.log('🧹 لا توجد ملفات للتنظيف');
      return;
    }

    console.log(`🧹 بدء تنظيف ${this.uploadedFiles.length} ملف...`);

    for (const file of this.uploadedFiles) {
      try {
        const { error } = await supabase.storage
          .from(file.bucket)
          .remove([file.path]);

        if (error) {
          console.error(`❌ فشل حذف ${file.bucket}/${file.path}:`, error);
        } else {
          console.log(`✅ تم حذف ${file.bucket}/${file.path}`);
        }
      } catch (error) {
        console.error(`❌ خطأ في حذف ${file.bucket}/${file.path}:`, error);
      }
    }

    // مسح قائمة الملفات بعد التنظيف
    this.uploadedFiles = [];
    console.log('🧹 انتهت عملية التنظيف');
  }

  // حذف ملف واحد محدد
  async cleanupSingleFile(url: string, bucket: string): Promise<boolean> {
    try {
      // استخراج المسار من الرابط
      const urlParts = url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === bucket);
      
      if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
        console.error('❌ لا يمكن استخراج المسار من الرابط:', url);
        return false;
      }

      const path = urlParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error(`❌ فشل حذف ${bucket}/${path}:`, error);
        return false;
      }

      console.log(`✅ تم حذف ${bucket}/${path}`);
      return true;
    } catch (error) {
      console.error(`❌ خطأ في حذف الملف:`, error);
      return false;
    }
  }

  // إعادة تعيين قائمة الملفات (للاستخدام عند النجاح)
  clearRegistry(): void {
    this.uploadedFiles = [];
    console.log('✅ تم مسح سجل الملفات');
  }

  // الحصول على عدد الملفات المسجلة
  getRegisteredFilesCount(): number {
    return this.uploadedFiles.length;
  }

  // الحصول على قائمة الملفات المسجلة
  getRegisteredFiles(): UploadedFile[] {
    return [...this.uploadedFiles];
  }
}

// إنشاء instance مشترك
export const storageCleanup = new StorageCleanup();