import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      p_book_id,
      p_title,
      p_subtitle,
      p_author,
      p_category,
      p_language,
      p_type,
      p_description,
      p_publisher,
      p_translator,
      p_publication_year,
      p_page_count,
      p_cover_image_url,
      p_book_file_url,
      p_author_image_url,
      p_user_id,
      p_user_email,
      p_rights_confirmation,
      p_file_metadata
    } = await req.json()

    console.log('طلب تعديل كتاب معتمد:', p_book_id, 'من المستخدم:', p_user_id)

    // التحقق من وجود الكتاب المعتمد
    const { data: originalBook, error: fetchError } = await supabaseClient
      .from('book_submissions')
      .select('*')
      .eq('id', p_book_id)
      .eq('status', 'approved')
      .single()

    if (fetchError || !originalBook) {
      console.error('خطأ في جلب الكتاب المعتمد:', fetchError)
      return new Response(
        JSON.stringify({ error: 'لم يتم العثور على الكتاب المعتمد' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // التحقق من أن المستخدم هو مالك الكتاب
    if (originalBook.user_id !== p_user_id) {
      return new Response(
        JSON.stringify({ error: 'غير مسموح لك بتعديل هذا الكتاب' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // إنشاء طلب تعديل جديد في book_submissions
    const { data: editSubmission, error: insertError } = await supabaseClient
      .from('book_submissions')
      .insert({
        user_id: p_user_id,
        user_email: p_user_email,
        title: p_title,
        subtitle: p_subtitle,
        author: p_author,
        category: p_category,
        language: p_language,
        display_type: p_type,
        description: p_description,
        publisher: p_publisher,
        translator: p_translator,
        publication_year: p_publication_year,
        page_count: p_page_count,
        cover_image_url: p_cover_image_url,
        book_file_url: p_book_file_url,
        author_image_url: p_author_image_url,
        rights_confirmation: p_rights_confirmation,
        file_metadata: p_file_metadata,
        status: 'pending_edit', // حالة خاصة بطلبات التعديل
        is_edit_request: true, // علامة أن هذا طلب تعديل
        original_book_id: p_book_id, // رابط للكتاب الأصلي
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('خطأ في إنشاء طلب التعديل:', insertError)
      throw insertError
    }

    console.log('تم إنشاء طلب التعديل بنجاح:', editSubmission.id)

    // إرسال إشعار للإدارة عن طلب التعديل الجديد
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: null, // إشعار للإدارة
        title: 'طلب تعديل كتاب جديد 📝',
        message: `طلب تعديل جديد للكتاب "${p_title}" من المؤلف ${p_author}. يرجى المراجعة والموافقة.`,
        type: 'info',
        book_submission_id: editSubmission.id,
        book_title: p_title,
        book_author: p_author,
        book_category: p_category,
        created_at: new Date().toISOString()
      })

    // إرسال إشعار للمستخدم تأكيد استلام الطلب
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: p_user_id,
        title: 'تم استلام طلب التعديل ✅',
        message: `تم استلام طلب تعديل كتاب "${p_title}" بنجاح. سيتم مراجعته من قبل فريقنا خلال 72 ساعة.`,
        type: 'success',
        book_submission_id: editSubmission.id,
        book_title: p_title,
        book_author: p_author,
        book_category: p_category,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إرسال طلب التعديل بنجاح',
        editSubmissionId: editSubmission.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('خطأ غير متوقع:', error)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة طلب التعديل: ' + error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})