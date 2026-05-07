import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

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

    const { submissionId, action, reviewerNotes } = await req.json()
    
    console.log(`معالجة طلب ${action} لتعديل الكتاب:`, submissionId)
    
    // جلب بيانات طلب التعديل
    const { data: submission, error: fetchError } = await supabaseClient
      .from('book_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('is_edit_request', true)
      .eq('status', 'pending_edit')
      .single()

    if (fetchError || !submission) {
      console.error('خطأ في جلب بيانات طلب التعديل:', fetchError)
      return new Response(
        JSON.stringify({ error: 'لم يتم العثور على طلب التعديل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (action === 'approve') {
      console.log('بدء عملية الموافقة على التعديل...')
      
      // استخدام دالة الموافقة على التعديل
      const { data: approveResult, error: approveError } = await supabaseClient
        .rpc('approve_book_edit', {
          p_edit_submission_id: submissionId,
          p_reviewer_notes: reviewerNotes
        })

      if (approveError) {
        console.error('خطأ في الموافقة على التعديل:', approveError)
        throw approveError
      }

      console.log('تم قبول تعديلات الكتاب بنجاح')

      // اكتشاف عدد صفحات الكتاب تلقائياً بعد الموافقة على التعديل
      try {
        const originalBookId = submission.original_book_id
        if (originalBookId) {
          console.log('بدء اكتشاف عدد صفحات الكتاب الأصلي:', originalBookId)
          
          // جلب بيانات الكتاب الأصلي المحدث
          const { data: originalBook, error: bookFetchError } = await supabaseClient
            .from('book_submissions')
            .select('id, title, book_file_url, book_file_type, page_count')
            .eq('id', originalBookId)
            .single()

          if (!bookFetchError && originalBook && originalBook.book_file_url) {
            const fileUrl = originalBook.book_file_url
            const isPdf = fileUrl?.toLowerCase().includes('.pdf') || 
                         originalBook.book_file_type?.includes('pdf')

            if (isPdf) {
              console.log('تحميل ملف PDF لاكتشاف عدد الصفحات...')
              const pdfResponse = await fetch(fileUrl)
              
              if (pdfResponse.ok) {
                const pdfBuffer = await pdfResponse.arrayBuffer()
                const pdfDoc = await PDFDocument.load(pdfBuffer, { 
                  ignoreEncryption: true,
                  updateMetadata: false 
                })
                const pageCount = pdfDoc.getPageCount()

                if (pageCount > 0) {
                  const { error: updatePageError } = await supabaseClient
                    .from('book_submissions')
                    .update({ page_count: pageCount })
                    .eq('id', originalBookId)

                  if (!updatePageError) {
                    console.log(`✅ تم تحديث عدد صفحات الكتاب: ${pageCount} صفحة`)
                  } else {
                    console.error('خطأ في تحديث عدد الصفحات:', updatePageError)
                  }
                }
              } else {
                console.error('فشل تحميل ملف PDF:', pdfResponse.status)
              }
            }
          }
        }
      } catch (pageCountError) {
        console.error('خطأ في اكتشاف عدد الصفحات (غير حرج):', pageCountError)
      }

      // إرسال بريد إلكتروني بالموافقة على التعديلات
      try {
        console.log('إرسال بريد الموافقة على التعديلات...')
        const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-book-edit-approval-email', {
          body: {
            bookId: submission.original_book_id,
            userId: submission.user_id,
            bookTitle: submission.title,
            bookAuthor: submission.author,
            bookCategory: submission.category,
            userEmail: submission.user_email,
            editRequests: submission.description || 'تعديلات عامة على الكتاب',
            editorNotes: reviewerNotes,
            coverImageUrl: submission.cover_image_url
          }
        })
        
        if (emailError) {
          console.error('خطأ في إرسال بريد الموافقة:', emailError)
        } else {
          console.log('تم إرسال بريد الموافقة بنجاح')
        }
      } catch (emailError) {
        console.error('فشل في إرسال بريد الموافقة:', emailError)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم قبول تعديلات الكتاب وتطبيقها بنجاح',
          action: 'approved'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'reject') {
      console.log('بدء عملية رفض التعديل...')
      
      // رفض طلب التعديل وحذفه
      const { error: deleteError } = await supabaseClient
        .from('book_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('is_edit_request', true)
        .eq('status', 'pending_edit')

      if (deleteError) {
        console.error('خطأ في حذف طلب التعديل:', deleteError)
        throw deleteError
      }

      // إرسال إشعار رفض التعديل
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: submission.user_id,
          title: 'تم رفض تعديلات الكتاب ❌',
          message: 'نأسف لإبلاغك أن تعديلات كتاب "' + submission.title + '" لم يتم قبولها. ' + (reviewerNotes ? 'السبب: ' + reviewerNotes : ''),
          type: 'error',
          book_submission_id: submission.original_book_id,
          book_title: submission.title,
          book_author: submission.author,
          book_category: submission.category,
          created_at: new Date().toISOString()
        })

      console.log('تم رفض طلب التعديل بنجاح')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم رفض طلب التعديل',
          action: 'rejected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'إجراء غير صحيح' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('خطأ غير متوقع:', error)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة الطلب: ' + error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})