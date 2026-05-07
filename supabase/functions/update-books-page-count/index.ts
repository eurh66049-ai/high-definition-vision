import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔍 البحث عن الكتب بدون عدد صفحات...')

    // جلب الكتب التي ليس بها عدد صفحات
    const { data: books, error: fetchError } = await supabase
      .from('book_submissions')
      .select('id, title, book_file_url, book_file_type')
      .is('page_count', null)
      .eq('status', 'approved')
      .not('book_file_url', 'is', null)
      .limit(50)

    if (fetchError) {
      console.error('❌ خطأ في جلب الكتب:', fetchError)
      throw fetchError
    }

    if (!books || books.length === 0) {
      console.log('✅ لا توجد كتب بدون عدد صفحات')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'لا توجد كتب تحتاج تحديث',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📚 تم العثور على ${books.length} كتاب بدون عدد صفحات`)

    let updatedCount = 0
    const results: Array<{ id: string; title: string; pageCount: number | null; error?: string }> = []

    for (const book of books) {
      try {
        const fileUrl = book.book_file_url
        const isPdf = fileUrl?.toLowerCase().includes('.pdf') || 
                     book.book_file_type?.includes('pdf')

        if (!isPdf || !fileUrl) {
          console.log(`⏭️ تخطي ${book.title} - ليس PDF`)
          results.push({ id: book.id, title: book.title, pageCount: null, error: 'ليس PDF' })
          continue
        }

        console.log(`📄 معالجة: ${book.title}`)

        // تحميل ملف PDF
        const pdfResponse = await fetch(fileUrl)
        if (!pdfResponse.ok) {
          console.log(`⚠️ فشل تحميل PDF: ${pdfResponse.status}`)
          results.push({ id: book.id, title: book.title, pageCount: null, error: `فشل التحميل: ${pdfResponse.status}` })
          continue
        }

        const pdfBuffer = await pdfResponse.arrayBuffer()
        
        // استخدام pdf-lib لحساب عدد الصفحات
        const pdfDoc = await PDFDocument.load(pdfBuffer, { 
          ignoreEncryption: true,
          updateMetadata: false 
        })
        
        const pageCount = pdfDoc.getPageCount()

        if (pageCount > 0) {
          // تحديث عدد الصفحات في قاعدة البيانات
          const { error: updateError } = await supabase
            .from('book_submissions')
            .update({ page_count: pageCount })
            .eq('id', book.id)

          if (updateError) {
            console.error(`❌ خطأ في تحديث ${book.title}:`, updateError)
            results.push({ id: book.id, title: book.title, pageCount: null, error: updateError.message })
          } else {
            console.log(`✅ تم تحديث ${book.title}: ${pageCount} صفحة`)
            results.push({ id: book.id, title: book.title, pageCount })
            updatedCount++
          }
        } else {
          results.push({ id: book.id, title: book.title, pageCount: null, error: 'لم يتم اكتشاف صفحات' })
        }

      } catch (pdfError: any) {
        console.error(`⚠️ خطأ في معالجة ${book.title}:`, pdfError.message)
        results.push({ id: book.id, title: book.title, pageCount: null, error: pdfError.message })
      }
    }

    console.log(`✅ تم تحديث ${updatedCount} من ${books.length} كتاب`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم تحديث عدد صفحات ${updatedCount} كتاب`,
        updated: updatedCount,
        total: books.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ خطأ عام:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
