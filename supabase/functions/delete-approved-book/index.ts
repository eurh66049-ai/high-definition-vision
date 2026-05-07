
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractStoragePath(url: string, bucketName: string): string | null {
  if (!url) return null;
  try {
    // Extract path after /object/public/{bucket}/ or /object/{bucket}/
    const patterns = [
      `/object/public/${bucketName}/`,
      `/object/${bucketName}/`,
      `/storage/v1/object/public/${bucketName}/`,
    ];
    for (const pattern of patterns) {
      const idx = url.indexOf(pattern);
      if (idx !== -1) {
        return decodeURIComponent(url.substring(idx + pattern.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { bookId, reason, adminEmail } = await req.json()

    console.log('=== بدء عملية حذف الكتاب المعتمد ===')
    console.log('Book ID:', bookId)

    if (!bookId) throw new Error('معرف الكتاب مطلوب')
    if (!reason || reason.trim() === '') throw new Error('سبب الحذف مطلوب')
    if (!adminEmail) throw new Error('البريد الإلكتروني للمدير مطلوب')

    // التحقق من صلاحيات المدير
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('email, is_active')
      .eq('email', adminEmail)
      .eq('is_active', true)
      .single()

    if (adminError || !adminCheck) {
      throw new Error('غير مسموح لك بحذف الكتب - صلاحيات غير صحيحة')
    }

    // جلب بيانات الكتاب
    const { data: book, error: bookError } = await supabaseClient
      .from('book_submissions')
      .select('*')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      throw new Error('الكتاب غير موجود')
    }

    console.log('الكتاب:', book.title)

    // حفظ نسخة احتياطية
    await supabaseClient.from('deleted_files_backup').insert([
      { original_book_id: bookId, file_type: 'approved_book', original_file_url: book.cover_image_url, deletion_reason: reason.trim(), deleted_at: new Date().toISOString() },
      { original_book_id: bookId, file_type: 'approved_book_file', original_file_url: book.book_file_url, deletion_reason: reason.trim(), deleted_at: new Date().toISOString() },
      { original_book_id: bookId, file_type: 'approved_author_image', original_file_url: book.author_image_url, deletion_reason: reason.trim(), deleted_at: new Date().toISOString() },
    ])

    let deletedFiles = 0;

    // حذف الملفات من Storage عبر API
    const filesToDelete: { bucket: string, path: string }[] = [];

    // صورة الغلاف
    if (book.cover_image_url) {
      const coverPath = extractStoragePath(book.cover_image_url, 'book-covers');
      if (coverPath) filesToDelete.push({ bucket: 'book-covers', path: coverPath });
    }

    // ملف الكتاب
    if (book.book_file_url) {
      const filePath = extractStoragePath(book.book_file_url, 'book-files');
      if (filePath) filesToDelete.push({ bucket: 'book-files', path: filePath });
      // قد يكون في book-covers أيضاً
      const filePath2 = extractStoragePath(book.book_file_url, 'book-covers');
      if (filePath2) filesToDelete.push({ bucket: 'book-covers', path: filePath2 });
    }

    // صورة المؤلف
    if (book.author_image_url) {
      const authorPath = extractStoragePath(book.author_image_url, 'book-covers');
      if (authorPath) filesToDelete.push({ bucket: 'book-covers', path: authorPath });
    }

    // حذف كل ملف عبر Storage API
    for (const file of filesToDelete) {
      try {
        const { error } = await supabaseClient.storage.from(file.bucket).remove([file.path]);
        if (!error) {
          deletedFiles++;
          console.log(`✅ تم حذف: ${file.bucket}/${file.path}`);
        } else {
          console.log(`⚠️ فشل حذف: ${file.bucket}/${file.path}:`, error.message);
        }
      } catch (e) {
        console.log(`⚠️ خطأ في حذف ملف: ${file.bucket}/${file.path}:`, e.message);
      }
    }

    // حذف البيانات المرتبطة
    await supabaseClient.from('book_likes').delete().eq('book_id', bookId);
    await supabaseClient.from('book_dislikes').delete().eq('book_id', bookId);
    await supabaseClient.from('book_reviews').delete().eq('book_id', bookId);
    await supabaseClient.from('book_stats').delete().eq('book_id', bookId);
    await supabaseClient.from('book_recommendations').delete().eq('book_id', bookId);
    await supabaseClient.from('book_extracted_text').delete().eq('book_id', bookId);
    await supabaseClient.from('reading_progress').delete().eq('book_id', bookId);
    await supabaseClient.from('reading_history').delete().eq('book_id', bookId);
    await supabaseClient.from('quotes').delete().eq('book_id', bookId);

    // حذف الكتاب نفسه
    const { error: deleteError } = await supabaseClient
      .from('book_submissions')
      .delete()
      .eq('id', bookId)

    if (deleteError) {
      console.error('خطأ في حذف الكتاب:', deleteError);
      throw new Error('فشل في حذف سجل الكتاب: ' + deleteError.message);
    }

    console.log(`✅ تم حذف الكتاب "${book.title}" نهائياً - ${deletedFiles} ملف محذوف`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم حذف الكتاب "${book.title}" نهائياً`,
        deleted_files: deletedFiles,
        book_title: book.title
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('خطأ في عملية الحذف:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'حدث خطأ أثناء حذف الكتاب' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
