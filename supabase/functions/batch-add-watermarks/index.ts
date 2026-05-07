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

    const requestBody = await req.json().catch(() => ({}))
    const { batchSize = 10, getStatsOnly = false } = requestBody
    
    console.log('🚀 بدء معالجة الكتب لإضافة الشعار...')

    // جلب إحصائيات الكتب
    const { count: totalBooks } = await supabaseClient
      .from('approved_books')
      .select('*', { count: 'exact', head: true })
      .not('book_file_url', 'is', null)
      .or('file_type.eq.application/pdf,file_type.eq.pdf')

    const { count: booksWithWatermark } = await supabaseClient
      .from('approved_books')
      .select('*', { count: 'exact', head: true })
      .not('book_file_url', 'is', null)
      .like('book_file_url', '%watermarked_%')
      .or('file_type.eq.application/pdf,file_type.eq.pdf')

    const { count: booksWithoutWatermark } = await supabaseClient
      .from('approved_books')
      .select('*', { count: 'exact', head: true })
      .not('book_file_url', 'is', null)
      .not('book_file_url', 'like', '%watermarked_%')
      .or('file_type.eq.application/pdf,file_type.eq.pdf')

    console.log(`📊 الإحصائيات: إجمالي ${totalBooks}, بها شعار ${booksWithWatermark}, بدون شعار ${booksWithoutWatermark}`)

    // إذا كان المستخدم يريد الإحصائيات فقط
    if (getStatsOnly) {
      return new Response(
        JSON.stringify({ 
          success: true,
          stats: {
            total: totalBooks || 0,
            withWatermark: booksWithWatermark || 0,
            withoutWatermark: booksWithoutWatermark || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // جلب الكتب التي تحتاج معالجة
    const { data: books, error: booksError } = await supabaseClient
      .from('approved_books')
      .select('id, title, book_file_url, file_type')
      .not('book_file_url', 'is', null)
      .not('book_file_url', 'like', '%watermarked_%')
      .or('file_type.eq.application/pdf,file_type.eq.pdf')
      .limit(batchSize)

    if (booksError) {
      throw new Error(`فشل جلب الكتب: ${booksError.message}`)
    }

    if (!books || books.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'لا توجد كتب تحتاج معالجة',
          processed: 0,
          stats: {
            total: totalBooks || 0,
            withWatermark: booksWithWatermark || 0,
            withoutWatermark: booksWithoutWatermark || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📚 تم جلب ${books.length} كتاب للمعالجة`)

    const results = []
    let successCount = 0
    let failCount = 0

    // معالجة كل كتاب
    for (const book of books) {
      try {
        console.log(`🔄 معالجة الكتاب: ${book.title} (${book.id})`)
        console.log(`📎 رابط PDF الحالي: ${book.book_file_url}`)

        // التحقق من صحة رابط PDF قبل المعالجة
        if (!book.book_file_url || !book.book_file_url.startsWith('http')) {
          throw new Error('رابط PDF غير صالح أو مفقود')
        }

        // استدعاء دالة إضافة الشعار مباشرة
        const watermarkUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/add-pdf-watermark`
        
        console.log(`🌐 استدعاء دالة الشعار...`)
        
        const watermarkResponse = await fetch(watermarkUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            pdfUrl: book.book_file_url,
            bucket: 'book-files'
          })
        })

        const watermarkData = await watermarkResponse.json().catch(() => null)

        if (!watermarkResponse.ok) {
          console.error(`❌ فشل استدعاء دالة الشعار: ${watermarkResponse.status}`)
          
          // تحديد نوع الخطأ لرسالة أوضح
          let errorMessage = 'فشل في معالجة PDF'
          if (watermarkData?.error) {
            if (watermarkData.error.includes('تالف') || watermarkData.error.includes('غير صالح')) {
              errorMessage = 'ملف PDF تالف أو غير صالح'
            } else if (watermarkData.error.includes('Bad Request') || watermarkData.error.includes('فشل تحميل')) {
              errorMessage = 'ملف PDF غير موجود أو لا يمكن الوصول إليه'
            } else {
              errorMessage = watermarkData.error
            }
          }
          
          throw new Error(errorMessage)
        }

        console.log(`📦 استجابة الشعار:`, watermarkData)

        if (watermarkData?.success && watermarkData?.watermarkedUrl) {
          // تحديث رابط PDF في قاعدة البيانات
          console.log(`💾 تحديث قاعدة البيانات بالرابط الجديد...`)
          
          const { error: updateError } = await supabaseClient
            .from('approved_books')
            .update({ book_file_url: watermarkData.watermarkedUrl })
            .eq('id', book.id)

          if (updateError) {
            console.error(`❌ فشل تحديث قاعدة البيانات:`, updateError)
            throw new Error(`فشل تحديث قاعدة البيانات: ${updateError.message}`)
          }

          console.log(`✅ تمت معالجة الكتاب بنجاح: ${book.title}`)
          console.log(`🔗 الرابط الجديد: ${watermarkData.watermarkedUrl}`)
          
          successCount++
          results.push({
            bookId: book.id,
            title: book.title,
            status: 'success',
            newUrl: watermarkData.watermarkedUrl
          })
        } else if (watermarkData?.success && !watermarkData?.watermarked) {
          // حالة عدم إضافة شعار لكن لا يعتبر خطأ
          console.log(`⚠️ لم يتم إضافة شعار للكتاب: ${book.title}`)
          failCount++
          results.push({
            bookId: book.id,
            title: book.title,
            status: 'skipped',
            error: watermarkData.message || 'لم يتم إضافة الشعار'
          })
        } else {
          throw new Error('استجابة غير متوقعة من دالة الشعار')
        }
      } catch (error) {
        console.error(`❌ خطأ في معالجة الكتاب ${book.title}:`, error)
        failCount++
        results.push({
          bookId: book.id,
          title: book.title,
          status: 'failed',
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        })
      }
      
      // إضافة تأخير بسيط بين الكتب لتجنب الضغط على النظام
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // جلب الإحصائيات المحدثة
    const { count: updatedBooksWithWatermark } = await supabaseClient
      .from('approved_books')
      .select('*', { count: 'exact', head: true })
      .not('book_file_url', 'is', null)
      .like('book_file_url', '%watermarked_%')
      .or('file_type.eq.application/pdf,file_type.eq.pdf')

    const { count: updatedBooksWithoutWatermark } = await supabaseClient
      .from('approved_books')
      .select('*', { count: 'exact', head: true })
      .not('book_file_url', 'is', null)
      .not('book_file_url', 'like', '%watermarked_%')
      .or('file_type.eq.application/pdf,file_type.eq.pdf')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `تمت معالجة ${successCount} كتاب بنجاح، ${failCount} كتاب فشل`,
        totalProcessed: books.length,
        successCount,
        failCount,
        results,
        stats: {
          total: totalBooks || 0,
          withWatermark: updatedBooksWithWatermark || 0,
          withoutWatermark: updatedBooksWithoutWatermark || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ خطأ في معالجة الكتب:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ في معالجة الكتب' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
