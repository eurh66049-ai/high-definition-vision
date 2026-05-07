
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

    const { submissionId, action, reviewerNotes } = await req.json()
    
    console.log(`معالجة طلب ${action} للكتاب:`, submissionId)
    
    // جلب بيانات الطلب
    const { data: submission, error: fetchError } = await supabaseClient
      .from('book_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      console.error('خطأ في جلب بيانات الطلب:', fetchError)
      return new Response(
        JSON.stringify({ error: 'لم يتم العثور على الطلب' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (action === 'approve') {
      console.log('بدء عملية الموافقة...')
      
      // التحقق من عدم وجود إشعار موافقة مسبق فقط إذا كان user_id موجود
      let existingNotification = null
      if (submission.user_id) {
        const { data: notification } = await supabaseClient
          .from('notifications')
          .select('id')
          .eq('user_id', submission.user_id)
          .eq('book_submission_id', submissionId)
          .eq('type', 'success')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // آخر ساعتين
          .maybeSingle()
        existingNotification = notification
      }

      // تحديث حالة الطلب إلى approved
      const { error: updateError } = await supabaseClient
        .from('book_submissions')
        .update({ 
          status: 'approved',
          reviewer_notes: reviewerNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (updateError) {
        console.error('خطأ في تحديث حالة الطلب:', updateError)
        throw updateError
      }

      console.log('تم تحديث حالة الكتاب إلى approved بنجاح')

      // استخراج وتخزين النص من PDF للمساعد
      try {
        console.log('🔄 بدء استخراج النص من PDF...')
        const { data: extractResult, error: extractError } = await supabaseClient.functions.invoke('extract-and-store-pdf-text', {
          body: { bookId: submissionId }
        })
        
        if (extractError) {
          console.error('⚠️ خطأ في استخراج النص:', extractError)
        } else {
          console.log('✅ تم استخراج النص:', extractResult)
        }
      } catch (extractError) {
        console.error('⚠️ فشل استدعاء دالة استخراج النص:', extractError)
      }

      // لا نُرسل إشعار هنا - التريجر في قاعدة البيانات سيرسل الإشعار تلقائياً
      console.log('تم تخطي إرسال الإشعار من Edge Function - سيتم الإرسال عبر التريجر')

      // إرسال بريد إلكتروني للموافقة - فقط إذا لم يوجد إشعار مسبق
      if (!existingNotification) {
        try {
          console.log('بدء إرسال بريد إلكتروني للموافقة...')
          
          const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke('send-book-approval-email', {
            body: {
              bookId: submissionId,
              userId: submission.user_id,
              bookTitle: submission.title,
              bookAuthor: submission.author,
              bookCategory: submission.category,
              userEmail: submission.user_email,
              coverImageUrl: submission.cover_image_url
            }
          })

          if (emailError) {
            console.error('خطأ في إرسال البريد الإلكتروني:', emailError)
          } else {
            console.log('تم إرسال بريد الموافقة بنجاح:', emailResult)
          }
        } catch (emailError) {
          console.error('خطأ في استدعاء دالة إرسال البريد:', emailError)
        }
      } else {
        console.log('تم تخطي إرسال البريد الإلكتروني - موجود إشعار مسبق')
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تمت الموافقة على الكتاب بنجاح وإعداده كـ Flipbook',
          action: 'approved'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'reject') {
      console.log('بدء عملية الرفض...')
      
      // التحقق من عدم وجود إشعار رفض مسبق فقط إذا كان user_id موجود
      let existingNotification = null
      if (submission.user_id) {
        const { data: notification } = await supabaseClient
          .from('notifications')
          .select('id')
          .eq('user_id', submission.user_id)
          .eq('book_submission_id', submissionId)
          .eq('type', 'error')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // آخر ساعتين
          .maybeSingle()
        existingNotification = notification
      }
      
      // تحديث حالة الطلب إلى rejected
      const { error: updateError } = await supabaseClient
        .from('book_submissions')
        .update({ 
          status: 'rejected',
          reviewer_notes: reviewerNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (updateError) {
        console.error('خطأ في تحديث حالة الطلب:', updateError)
        throw updateError
      }

      // إرسال بريد إلكتروني للرفض مباشرة بعد تغيير الحالة
      let emailSent = false;
      let emailErrorMsg: string | null = null;
      try {
        console.log('بدء إرسال بريد إلكتروني للرفض...')
        
        const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke('send-book-rejection-email', {
          body: {
            bookId: submissionId,
            userId: submission.user_id,
            bookTitle: submission.title,
            bookAuthor: submission.author,
            bookCategory: submission.category,
            userEmail: submission.user_email,
            rejectionReason: reviewerNotes || 'لم يتم تحديد سبب محدد'
          }
        })

        if (emailError) {
          console.error('خطأ في إرسال البريد الإلكتروني للرفض:', emailError)
          emailErrorMsg = emailError.message || 'EmailJS invoke failed'
        } else {
          console.log('تم إرسال بريد الرفض بنجاح:', emailResult)
          emailSent = true;
        }
      } catch (emailError: any) {
        console.error('خطأ في استدعاء دالة إرسال بريد الرفض:', emailError)
        emailErrorMsg = emailError?.message || 'Unhandled email send error'
      }

      // حذف جميع الملفات المرتبطة بالكتاب من جميع buckets
      console.log('بدء حذف الملفات من جميع مجلدات التخزين...')
      
      const bucketsToCheck = ['book-uploads', 'book-files', 'books-pdf', 'book-covers']
      
      // حذف صورة الغلاف من جميع المجلدات المحتملة
      if (submission.cover_image_url) {
        const coverPath = submission.cover_image_url.split('/').pop()
        if (coverPath && coverPath !== 'placeholder.txt') {
          console.log(`محاولة حذف صورة الغلاف: ${coverPath}`)
          
          for (const bucket of bucketsToCheck) {
            try {
              // جرب حذف من مجلد covers
              const { error: coverError1 } = await supabaseClient.storage.from(bucket).remove([`covers/${coverPath}`])
              if (!coverError1) {
                console.log(`تم حذف صورة الغلاف من ${bucket}/covers/${coverPath}`)
              }
            } catch (error) {
              console.log(`فشل حذف من ${bucket}/covers/: ${error.message}`)
            }
            
            try {
              // جرب حذف من الجذر
              const { error: coverError2 } = await supabaseClient.storage.from(bucket).remove([coverPath])
              if (!coverError2) {
                console.log(`تم حذف صورة الغلاف من ${bucket}/${coverPath}`)
              }
            } catch (error) {
              console.log(`فشل حذف من ${bucket}/: ${error.message}`)
            }
            
            try {
              // جرب البحث عن الملف أولاً ثم حذفه
              const { data: files } = await supabaseClient.storage.from(bucket).list('covers')
              if (files) {
                const targetFile = files.find(file => file.name === coverPath)
                if (targetFile) {
                  const { error: deleteError } = await supabaseClient.storage.from(bucket).remove([`covers/${coverPath}`])
                  if (!deleteError) {
                    console.log(`تم حذف صورة الغلاف بنجاح من ${bucket}/covers/${coverPath}`)
                  } else {
                    console.error(`خطأ في حذف ${bucket}/covers/${coverPath}:`, deleteError)
                  }
                }
              }
            } catch (error) {
              console.log(`فشل في البحث والحذف من ${bucket}:`, error.message)
            }
          }
        }
      }
      
      // حذف ملف PDF من جميع المجلدات المحتملة
      if (submission.book_file_url) {
        const filePath = submission.book_file_url.split('/').pop()
        if (filePath && filePath !== 'dummy.txt') {
          for (const bucket of bucketsToCheck) {
            try {
              // جرب حذف من مجلد books
              await supabaseClient.storage.from(bucket).remove([`books/${filePath}`])
              console.log(`تم حذف ملف الكتاب من ${bucket}/books/`)
            } catch (error) {
              // جرب حذف من مجلد pdfs
              try {
                await supabaseClient.storage.from(bucket).remove([`pdfs/${filePath}`])
                console.log(`تم حذف ملف الكتاب من ${bucket}/pdfs/`)
              } catch (error2) {
                // جرب حذف من الجذر
                try {
                  await supabaseClient.storage.from(bucket).remove([filePath])
                  console.log(`تم حذف ملف الكتاب من ${bucket}/`)
                } catch (error3) {
                  console.log(`لم يوجد ملف الكتاب في ${bucket}`)
                }
              }
            }
          }
        }
      }

      // حذف صورة المؤلف من جميع المجلدات المحتملة
      if (submission.author_image_url) {
        const authorImagePath = submission.author_image_url.split('/').pop()
        if (authorImagePath && authorImagePath !== 'default-author-avatar.png') {
          for (const bucket of bucketsToCheck) {
            try {
              // جرب حذف من مجلد authors
              await supabaseClient.storage.from(bucket).remove([`authors/${authorImagePath}`])
              console.log(`تم حذف صورة المؤلف من ${bucket}/authors/`)
            } catch (error) {
              // جرب حذف من الجذر
              try {
                await supabaseClient.storage.from(bucket).remove([authorImagePath])
                console.log(`تم حذف صورة المؤلف من ${bucket}/`)
              } catch (error2) {
                console.log(`لم توجد صورة المؤلف في ${bucket}`)
              }
            }
          }
        }
      }

      // حذف أي ملفات إضافية بناءً على submission ID
      for (const bucket of bucketsToCheck) {
        try {
          // البحث عن ملفات تحتوي على submission ID
          const { data: files } = await supabaseClient.storage.from(bucket).list()
          if (files) {
            for (const file of files) {
              if (file.name.includes(submissionId)) {
                await supabaseClient.storage.from(bucket).remove([file.name])
                console.log(`تم حذف ملف إضافي: ${bucket}/${file.name}`)
              }
            }
          }
        } catch (error) {
          console.log(`لا يمكن البحث في ${bucket}:`, error.message)
        }
      }

      // حذف الملفات المرتبطة من جدول media_files إذا كانت موجودة
      try {
        const { data: mediaFiles, error: mediaFetchError } = await supabaseClient
          .from('book_media')
          .select('media_file_id, media_files(file_url)')
          .eq('book_id', submissionId)
          .eq('book_table', 'book_submissions')

        if (!mediaFetchError && mediaFiles && mediaFiles.length > 0) {
          console.log('العثور على ملفات وسائط مرتبطة:', mediaFiles.length)
          
          // حذف الملفات من Storage في جميع buckets
          for (const mediaFile of mediaFiles) {
            if (mediaFile.media_files && mediaFile.media_files.file_url) {
              const fileName = mediaFile.media_files.file_url.split('/').pop()
              for (const bucket of bucketsToCheck) {
                try {
                  await supabaseClient.storage.from(bucket).remove([fileName])
                  console.log(`تم حذف ملف وسائط من ${bucket}: ${fileName}`)
                } catch (error) {
                  // تجاهل الأخطاء إذا لم يوجد الملف
                }
              }
            }
          }

          // حذف السجلات من book_media
          await supabaseClient
            .from('book_media')
            .delete()
            .eq('book_id', submissionId)
            .eq('book_table', 'book_submissions')

          // حذف السجلات من media_files
          const mediaFileIds = mediaFiles.map(mf => mf.media_file_id)
          if (mediaFileIds.length > 0) {
            await supabaseClient
              .from('media_files')
              .delete()
              .in('id', mediaFileIds)
          }
        }
      } catch (error) {
        console.error('خطأ في معالجة ملفات الوسائط:', error)
      }

      console.log('انتهاء عملية حذف الملفات من جميع مجلدات التخزين')

      // تم إرسال بريد الرفض مسبقاً بعد تحديث الحالة

      // حذف السجل من قاعدة البيانات
      const { error: deleteError } = await supabaseClient
        .from('book_submissions')
        .delete()
        .eq('id', submissionId)
        
      if (deleteError) {
        console.error('خطأ في حذف السجل:', deleteError)
      } else {
        console.log('تم حذف سجل الكتاب من قاعدة البيانات')
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم رفض الكتاب بنجاح',
          action: 'rejected',
          emailSent,
          emailError: emailErrorMsg
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
