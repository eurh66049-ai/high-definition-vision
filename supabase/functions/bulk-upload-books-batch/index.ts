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

interface BookResult {
  success: boolean;
  error?: string;
  duplicate?: boolean;
  id?: string;
  title?: string;
  author?: string;
  cover_image_url?: string | null;
  book_file_url?: string | null;
  original_cover_image_url?: string | null;
  original_book_file_url?: string | null;
  cover_uploaded_to_supabase?: boolean;
  book_uploaded_to_supabase?: boolean;
}

const FETCH_TIMEOUT = 60000
const MAX_RETRIES = 3
const CONCURRENCY_LIMIT = 8 // زيادة التزامن لتسريع الرفع

const fetchWithRetry = async (url: string, accept: string, retryCount = 0): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KotobiUploader/2.0)',
        'Accept': accept,
        'Cache-Control': 'no-cache',
        'Referer': 'https://archive.org/',
        'Connection': 'keep-alive',
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

// دالة مساعدة لتحميل ورفع صورة بشكل سريع
async function downloadAndUploadImage(
  url: string, 
  folder: string, 
  bucket: string, 
  supabaseClient: any,
  accept = 'image/jpeg, image/png, image/webp, image/*'
): Promise<string | null> {
  if (!url?.trim() || !isValidUrl(url.trim())) return null

  try {
    let processedUrl = url.trim()
    if (processedUrl.includes('archive.org') && processedUrl.includes('BookReader')) {
      processedUrl = processedUrl.includes('scale=') 
        ? processedUrl.replace(/scale=\d+/, 'scale=4') 
        : processedUrl + '&scale=4'
    }

    const response = await fetchWithRetry(processedUrl, accept)
    const blob = await response.blob()
    
    const minSize = folder === 'authors' ? 500 : 1000
    if (blob.size <= minSize || !blob.type.startsWith('image/')) return null

    let ext = 'jpg'
    if (blob.type.includes('png')) ext = 'png'
    else if (blob.type.includes('webp')) ext = 'webp'
    
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: false
      })
    
    if (error) return null
    return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${fileName}`
  } catch {
    return null
  }
}

// دالة تحميل ورفع ملف الكتاب — تعيد الـ blob أيضاً لحساب الصفحات بدون إعادة تحميل
async function downloadAndUploadBook(
  url: string, 
  fileType: string | undefined,
  supabaseClient: any
): Promise<{ url: string | null; blob: Blob | null; fileSize: number | null; extension: string }> {
  if (!url?.trim() || !isValidUrl(url.trim())) {
    return { url: null, blob: null, fileSize: null, extension: 'pdf' }
  }

  try {
    const response = await fetchWithRetry(url.trim(), 'application/pdf, application/octet-stream, */*')
    const blob = await response.blob()
    
    let ext = 'pdf'
    const contentType = blob.type || fileType || 'application/pdf'
    if (contentType.includes('doc') && !contentType.includes('docx')) ext = 'doc'
    else if (contentType.includes('docx')) ext = 'docx'
    
    const fileName = `books/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
    const { error } = await supabaseClient.storage
      .from('book-files')
      .upload(fileName, blob, {
        contentType,
        cacheControl: '31536000',
        upsert: false
      })
    
    if (error) return { url: null, blob: null, fileSize: null, extension: ext }
    
    const resultUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/book-files/${fileName}`
    return { url: resultUrl, blob, fileSize: blob.size, extension: ext }
  } catch {
    return { url: null, blob: null, fileSize: null, extension: 'pdf' }
  }
}

async function processSingleBook(book: CSVBook, supabaseClient: any): Promise<BookResult> {
  const requiredFields = ['title', 'author', 'category', 'description', 'language']
  const missingFields = requiredFields.filter(field => {
    const value = book[field as keyof CSVBook]
    return !value || value.toString().trim() === ''
  })

  if (missingFields.length > 0) {
    return { success: false, error: `الحقول المطلوبة مفقودة: ${missingFields.join(', ')}` }
  }

  // التحقق من وجود الكتاب مسبقاً
  try {
    const { data: existingBooks } = await supabaseClient
      .rpc('find_existing_book_with_normalized_author', {
        p_title: book.title.trim(),
        p_author: book.author.trim(),
        p_status: 'approved'
      })

    if (existingBooks && existingBooks.length > 0) {
      return { success: false, error: `"${book.title}" للمؤلف "${book.author}" موجود مسبقاً`, duplicate: true }
    }
  } catch (e) {
    console.error(`⚠️ خطأ في التحقق من التكرار: ${e}`)
  }

  // ⚡ تحميل الغلاف + صورة المؤلف + ملف الكتاب بالتوازي (CDN-style)
  const [coverResult, authorImageResult, bookResult] = await Promise.all([
    downloadAndUploadImage(book.cover_image_url || '', 'covers', 'book-covers', supabaseClient),
    downloadAndUploadImage(book.author_image_url || '', 'authors', 'book-covers', supabaseClient),
    downloadAndUploadBook(book.book_file_url || '', book.file_type, supabaseClient),
  ])

  let cover_image_url = coverResult || book.cover_image_url?.trim() || null
  let author_image_url = authorImageResult || book.author_image_url?.trim() || null
  let book_file_url = bookResult.url || book.book_file_url?.trim() || null
  let file_size = bookResult.fileSize

  // إضافة العلامة المائية على ملف PDF
  if (book_file_url && bookResult.url && bookResult.extension === 'pdf') {
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

  // التحقق من رفع الملفات لـ Supabase Storage
  const coverOk = typeof cover_image_url === 'string' && cover_image_url.includes('/storage/v1/object/public/book-covers/')
  const bookOk = typeof book_file_url === 'string' && book_file_url.includes('/storage/v1/object/public/book-files/')

  if (!coverOk) {
    return { success: false, error: `فشل رفع الغلاف إلى Supabase Storage` }
  }

  if (!bookOk) {
    return { success: false, error: `فشل رفع ملف الكتاب إلى Supabase Storage` }
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

  // معالجة عدد الصفحات — استخدام الـ blob المحمّل مسبقاً بدلاً من إعادة التحميل
  let pageCount: number | null = null
  if (book.page_count) {
    const pc = parseInt(book.page_count.toString().trim(), 10)
    if (!isNaN(pc) && pc > 0) pageCount = pc
  }

  // حساب عدد الصفحات من الـ blob المخزن (بدون إعادة تحميل!)
  if (pageCount === null && bookResult.blob && bookResult.extension === 'pdf') {
    try {
      console.log(`📄 حساب عدد صفحات PDF من الذاكرة: ${book.title}`)
      const pdfBuffer = await bookResult.blob.arrayBuffer()
      const pdfDoc = await PDFDocument.load(pdfBuffer, { 
        ignoreEncryption: true,
        updateMetadata: false 
      })
      const detectedPageCount = pdfDoc.getPageCount()
      if (detectedPageCount > 0) {
        pageCount = detectedPageCount
        console.log(`✅ عدد الصفحات: ${pageCount} للكتاب: ${book.title}`)
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
  const countryCode = book.author_country_code?.trim()?.substring(0, 2) || null

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
    author_country_code: countryCode,
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
    return { success: false, error: `خطأ في الإدراج: ${insertError.message}` }
  }

  console.log(`✅ تم رفع الكتاب بنجاح: ${book.title}`)

  return {
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
  }
}

// معالجة دفعة من الكتب بتحكم في التزامن
async function processWithConcurrency(books: CSVBook[], supabaseClient: any, limit: number): Promise<BookResult[]> {
  const results: BookResult[] = new Array(books.length)
  let currentIndex = 0

  const workers = Array.from({ length: Math.min(limit, books.length) }, async () => {
    while (currentIndex < books.length) {
      const index = currentIndex++
      const book = books[index]
      console.log(`📚 [${index + 1}/${books.length}] معالجة: ${book.title}`)
      try {
        results[index] = await processSingleBook(book, supabaseClient)
      } catch (err) {
        results[index] = { 
          success: false, 
          error: err instanceof Error ? err.message : 'خطأ غير متوقع',
          title: book.title
        }
      }
    }
  })

  await Promise.all(workers)
  return results
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

    const body = await req.json()
    
    const books: CSVBook[] = body.books
    
    if (!books || !Array.isArray(books) || books.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'لا توجد كتب للمعالجة. أرسل { books: [...] }' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`📦 بدء معالجة دفعة من ${books.length} كتاب بالتوازي (حد التزامن: ${CONCURRENCY_LIMIT})`)

    const results = await processWithConcurrency(books, supabaseClient, CONCURRENCY_LIMIT)

    const summary = {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success && !r.duplicate).length,
      duplicates: results.filter(r => r.duplicate).length,
    }

    console.log(`📊 نتائج الدفعة: نجح ${summary.success} | فشل ${summary.failed} | مكرر ${summary.duplicates}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        summary,
        results
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
