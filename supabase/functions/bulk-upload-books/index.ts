import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CSVBook {
  title: string;
  author: string;
  author_bio?: string;
  author_image_url?: string;
  author_website?: string;
  author_country_code?: string;
  author_country_name?: string;
  category: string;
  description: string;
  language: string;
  cover_image_url?: string;
  book_file_url?: string;
  publication_year?: number;
  page_count?: number;
  publisher?: string;
  translator?: string;
  display_type?: string;
  file_type?: string;
  subtitle?: string;
  file_size?: number;
  user_email?: string;
  volume?: string | number;
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

    const { book } = await req.json() as { book: CSVBook }
    
    if (!book) {
      return new Response(
        JSON.stringify({ success: false, error: 'لا يوجد كتاب للمعالجة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`معالجة كتاب: ${book.title}`)

    // التحقق من الحقول المطلوبة
    const requiredFields = ['title', 'author', 'category', 'description', 'language']
    const missingFields = requiredFields.filter(field => {
      const value = book[field as keyof CSVBook]
      return !value || value.toString().trim() === ''
    })

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `الحقول المطلوبة مفقودة: ${missingFields.join(', ')}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // دالة تحميل مع retry
    const FETCH_TIMEOUT = 60000
    const MAX_RETRIES = 3

    const fetchWithRetry = async (url: string, accept: string, retryCount = 0): Promise<Response> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KotobiUploader/1.0)',
            'Accept': accept,
            'Cache-Control': 'no-cache',
            'Referer': 'https://archive.org/',
          }
        })
        clearTimeout(timeoutId)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response
      } catch (error) {
        clearTimeout(timeoutId)
        if (retryCount < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, retryCount)
          await new Promise(resolve => setTimeout(resolve, delay))
          return fetchWithRetry(url, accept, retryCount + 1)
        }
        throw error
      }
    }

    const isValidUrl = (url: string): boolean => {
      try {
        const u = new URL(url)
        return ['http:', 'https:'].includes(u.protocol)
      } catch { return false }
    }

    // التحقق من وجود الكتاب مسبقاً
    const { data: existingBooks } = await supabaseClient
      .rpc('find_existing_book_with_normalized_author', {
        p_title: book.title.trim(),
        p_author: book.author.trim(),
        p_status: 'approved'
      })

    if (existingBooks && existingBooks.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `"${book.title}" للمؤلف "${book.author}" موجود مسبقاً`,
          duplicate: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // تحميل الملفات
    let cover_image_url: string | null = null
    let book_file_url: string | null = null
    let author_image_url: string | null = null
    let file_size: number | null = null

    // 1. صورة الغلاف
    if (book.cover_image_url?.trim() && isValidUrl(book.cover_image_url.trim())) {
      try {
        let processedUrl = book.cover_image_url.trim()
        if (processedUrl.includes('archive.org') && processedUrl.includes('BookReader')) {
          processedUrl = processedUrl.includes('scale=') 
            ? processedUrl.replace(/scale=\d+/, 'scale=4') 
            : processedUrl + '&scale=4'
        }

        const coverResponse = await fetchWithRetry(processedUrl, 'image/jpeg, image/png, image/webp, image/*')
        const coverBlob = await coverResponse.blob()
        
        if (coverBlob.size > 1000 && coverBlob.type.startsWith('image/')) {
          let ext = 'jpg'
          if (coverBlob.type.includes('png')) ext = 'png'
          else if (coverBlob.type.includes('webp')) ext = 'webp'
          
          const coverFileName = `covers/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
          const { error: coverError } = await supabaseClient.storage
            .from('book-covers')
            .upload(coverFileName, coverBlob, {
              contentType: coverBlob.type || 'image/jpeg',
              cacheControl: '31536000',
              upsert: false
            })
          
          if (!coverError) {
            cover_image_url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/book-covers/${coverFileName}`
          }
        }

        if (!cover_image_url) cover_image_url = processedUrl
      } catch (error) {
        console.error(`خطأ في صورة الغلاف: ${error}`)
        cover_image_url = book.cover_image_url.trim()
      }
    }

    // 2. صورة المؤلف
    if (book.author_image_url?.trim() && isValidUrl(book.author_image_url.trim())) {
      try {
        const authorResponse = await fetchWithRetry(book.author_image_url.trim(), 'image/*')
        const authorBlob = await authorResponse.blob()
        
        if (authorBlob.size > 500 && authorBlob.type.startsWith('image/')) {
          let ext = 'jpg'
          if (authorBlob.type.includes('png')) ext = 'png'
          else if (authorBlob.type.includes('webp')) ext = 'webp'
          
          const authorFileName = `authors/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
          const { error: authorError } = await supabaseClient.storage
            .from('book-covers')
            .upload(authorFileName, authorBlob, {
              contentType: authorBlob.type || 'image/jpeg',
              cacheControl: '31536000',
              upsert: false
            })
          
          if (!authorError) {
            author_image_url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/book-covers/${authorFileName}`
          }
        }

        if (!author_image_url) author_image_url = book.author_image_url.trim()
      } catch {
        author_image_url = book.author_image_url.trim()
      }
    }

    // 3. ملف الكتاب
    if (book.book_file_url?.trim() && isValidUrl(book.book_file_url.trim())) {
      try {
        const bookResponse = await fetchWithRetry(book.book_file_url.trim(), 'application/pdf, application/octet-stream, */*')
        const bookBlob = await bookResponse.blob()
        
        let fileExtension = 'pdf'
        const contentType = bookBlob.type || book.file_type || 'application/pdf'
        if (contentType.includes('doc')) fileExtension = 'doc'
        else if (contentType.includes('docx')) fileExtension = 'docx'
        
        const bookFileName = `books/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
        const { error: bookError } = await supabaseClient.storage
          .from('book-files')
          .upload(bookFileName, bookBlob, {
            contentType,
            cacheControl: '31536000',
            upsert: false
          })
        
        if (!bookError) {
          book_file_url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/book-files/${bookFileName}`
          file_size = bookBlob.size

          // إضافة العلامة المائية على ملف PDF
          if (fileExtension === 'pdf') {
            try {
              console.log(`🎨 إضافة شعار على PDF: ${book.title}`)
              const watermarkResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/add-pdf-watermark`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({
                    pdfUrl: book_file_url,
                    bucket: 'book-files'
                  })
                }
              )
              
              if (watermarkResponse.ok) {
                const watermarkResult = await watermarkResponse.json()
                if (watermarkResult.success && watermarkResult.watermarkedUrl) {
                  book_file_url = watermarkResult.watermarkedUrl
                  console.log(`✅ تم إضافة الشعار بنجاح: ${book.title}`)
                } else {
                  console.log(`⚠️ تم رفع PDF بدون شعار: ${watermarkResult.message || 'غير معروف'}`)
                }
              } else {
                console.error(`⚠️ فشل استدعاء دالة الشعار: ${watermarkResponse.status}`)
              }
            } catch (watermarkError) {
              console.error(`⚠️ خطأ في إضافة الشعار (تم تجاوزه):`, watermarkError)
            }
          }
        }

        if (!book_file_url) book_file_url = book.book_file_url.trim()
      } catch (error) {
        console.error(`خطأ في ملف الكتاب: ${error}`)
        book_file_url = book.book_file_url.trim()
      }
    }

    // التحقق من رفع الملفات لـ Supabase Storage
    const coverOk = typeof cover_image_url === 'string' && cover_image_url.includes('/storage/v1/object/public/book-covers/')
    const bookOk = typeof book_file_url === 'string' && book_file_url.includes('/storage/v1/object/public/book-files/')

    if (!coverOk) {
      return new Response(
        JSON.stringify({ success: false, error: `فشل رفع الغلاف إلى Supabase Storage` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!bookOk) {
      return new Response(
        JSON.stringify({ success: false, error: `فشل رفع ملف الكتاب إلى Supabase Storage` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // البحث عن المؤلف الموجود
    const { data: existingAuthor } = await supabaseClient
      .rpc('find_author_by_normalized_name', { author_name: book.author.trim() })

    let authorName = book.author.trim()
    if (existingAuthor) {
      const { data: authorData } = await supabaseClient
        .from('authors')
        .select('name')
        .eq('id', existingAuthor)
        .single()
      if (authorData) authorName = authorData.name
    }

    // معالجة عدد الصفحات
    let pageCount: number | null = null
    if (book.page_count) {
      const pc = parseInt(book.page_count.toString().trim(), 10)
      if (!isNaN(pc) && pc > 0) pageCount = pc
    }

    // إذا لم يكن عدد الصفحات موجودًا وملف الكتاب PDF، نحاول حسابه تلقائيًا
    if (pageCount === null && book_file_url) {
      try {
        const isPdf = book_file_url.toLowerCase().includes('.pdf') || 
                     (book.file_type && book.file_type.includes('pdf'))
        
        if (isPdf) {
          console.log(`📄 حساب عدد صفحات PDF تلقائيًا: ${book.title}`)
          const pdfResponse = await fetch(book_file_url)
          if (pdfResponse.ok) {
            const pdfBuffer = await pdfResponse.arrayBuffer()
            const pdfDoc = await PDFDocument.load(pdfBuffer, { 
              ignoreEncryption: true,
              updateMetadata: false 
            })
            const detectedPageCount = pdfDoc.getPageCount()
            if (detectedPageCount > 0) {
              pageCount = detectedPageCount
              console.log(`✅ عدد الصفحات: ${pageCount} للكتاب: ${book.title}`)
            }
          }
        }
      } catch (pdfError) {
        console.error(`⚠️ خطأ في حساب الصفحات:`, pdfError)
      }
    }

    // معالجة سنة النشر
    let publicationYear: number | null = null
    if (book.publication_year) {
      const py = parseInt(book.publication_year.toString().trim(), 10)
      if (!isNaN(py) && py > 0) publicationYear = py
    }

    // إدراج الكتاب
    const bookData = {
      title: book.title.trim(),
      author: authorName,
      category: book.category.trim(),
      description: book.description.trim(),
      language: book.language.trim(),
      cover_image_url,
      book_file_url,
      author_bio: book.author_bio?.trim() || null,
      author_image_url,
      author_website: book.author_website?.trim() || null,
      author_country_code: book.author_country_code?.trim() || null,
      author_country_name: book.author_country_name?.trim() || null,
      publication_year: publicationYear,
      page_count: pageCount,
      publisher: book.publisher?.trim() || null,
      translator: book.translator?.trim() || null,
      subtitle: book.subtitle?.trim() || null,
      display_type: book.display_type?.trim() || 'download_read',
      file_type: book.file_type?.trim() || 'application/pdf',
      file_size,
      status: 'approved',
      rights_confirmation: true,
      user_id: null,
      user_email: book.user_email?.trim() || 'admin@kotobi.com',
      reviewed_at: new Date().toISOString(),
      reviewer_notes: 'تم رفعه بواسطة الرفع المجمع من لوحة الإدارة'
    }

    const { data: insertedBook, error: insertError } = await supabaseClient
      .from('book_submissions')
      .insert([bookData])
      .select('id, title, author')
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: `خطأ في الإدراج: ${insertError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ تم رفع الكتاب بنجاح: ${book.title}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        id: insertedBook?.id,
        title: book.title,
        author: authorName,
        cover_image_url,
        book_file_url,
        original_cover_image_url: book.cover_image_url?.trim() || null,
        original_book_file_url: book.book_file_url?.trim() || null,
        cover_uploaded_to_supabase: coverOk,
        book_uploaded_to_supabase: bookOk,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('خطأ غير متوقع:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير متوقع'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
