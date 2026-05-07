
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractStoragePath(url: string, bucketName: string): string | null {
  if (!url) return null;
  try {
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

async function deleteBook(supabaseClient: any, bookId: string, reason: string) {
  // جلب بيانات الكتاب
  const { data: book, error: bookError } = await supabaseClient
    .from('book_submissions')
    .select('*')
    .eq('id', bookId)
    .single()

  if (bookError || !book) {
    throw new Error('الكتاب غير موجود')
  }

  // حفظ نسخة احتياطية
  await supabaseClient.from('deleted_files_backup').insert([
    { original_book_id: bookId, file_type: 'approved_book', original_file_url: book.cover_image_url, deletion_reason: reason, deleted_at: new Date().toISOString() },
    { original_book_id: bookId, file_type: 'approved_book_file', original_file_url: book.book_file_url, deletion_reason: reason, deleted_at: new Date().toISOString() },
  ])

  let deletedFiles = 0;
  const filesToDelete: { bucket: string, path: string }[] = [];

  if (book.cover_image_url) {
    const p = extractStoragePath(book.cover_image_url, 'book-covers');
    if (p) filesToDelete.push({ bucket: 'book-covers', path: p });
  }
  if (book.book_file_url) {
    const p = extractStoragePath(book.book_file_url, 'book-files');
    if (p) filesToDelete.push({ bucket: 'book-files', path: p });
    const p2 = extractStoragePath(book.book_file_url, 'book-covers');
    if (p2) filesToDelete.push({ bucket: 'book-covers', path: p2 });
  }
  if (book.author_image_url) {
    const p = extractStoragePath(book.author_image_url, 'book-covers');
    if (p) filesToDelete.push({ bucket: 'book-covers', path: p });
  }

  for (const file of filesToDelete) {
    try {
      const { error } = await supabaseClient.storage.from(file.bucket).remove([file.path]);
      if (!error) deletedFiles++;
    } catch {}
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

  const { error: deleteError } = await supabaseClient
    .from('book_submissions')
    .delete()
    .eq('id', bookId)

  if (deleteError) throw new Error('فشل حذف سجل الكتاب: ' + deleteError.message);

  return { title: book.title, deletedFiles };
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

    const { bookIds, reason, adminEmail } = await req.json()

    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) throw new Error('معرفات الكتب مطلوبة')
    if (!reason || reason.trim() === '') throw new Error('سبب الحذف مطلوب')
    if (!adminEmail) throw new Error('البريد الإلكتروني للمدير مطلوب')

    const { data: adminCheck, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('email, is_active')
      .eq('email', adminEmail)
      .eq('is_active', true)
      .single()

    if (adminError || !adminCheck) throw new Error('غير مسموح لك بحذف الكتب')

    const results = []
    const errors = []

    for (const bookId of bookIds) {
      try {
        console.log(`حذف الكتاب: ${bookId}`)
        const result = await deleteBook(supabaseClient, bookId, reason.trim())
        results.push({ bookId, title: result.title, deletedFiles: result.deletedFiles })
        console.log(`✅ تم حذف: ${result.title}`)
      } catch (err) {
        errors.push({ bookId, error: err.message })
        console.error(`❌ فشل حذف ${bookId}:`, err.message)
      }
    }

    console.log(`=== نتيجة: نجح ${results.length} / فشل ${errors.length} ===`)

    return new Response(
      JSON.stringify({
        success: true,
        results: { successful: results, failed: errors, totalRequested: bookIds.length, successfulCount: results.length, failedCount: errors.length }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('خطأ:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
