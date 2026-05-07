import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function countPdfPagesWithMupdf(bytes: Uint8Array): Promise<number | null> {
  let doc: any = null
  try {
    const mupdf: any = await import('https://esm.sh/mupdf@1.3.0')
    doc = mupdf.Document.openDocument(bytes, 'application/pdf')
    const count = typeof doc.countPages === 'function' ? doc.countPages() : null
    return typeof count === 'number' && count > 0 ? count : null
  } catch (error) {
    console.log('⚠️ فشل حساب الصفحات عبر MuPDF:', error instanceof Error ? error.message : error)
    return null
  } finally {
    try { doc?.destroy?.() } catch { /* ignore */ }
  }
}

async function validatePdfBuffer(bytes: Uint8Array): Promise<number> {
  if (bytes.length < 1024) throw new Error('ملف PDF صغير جداً وغير صالح')

  const decoder = new TextDecoder('latin1')
  const header = decoder.decode(bytes.slice(0, 8))
  if (!header.startsWith('%PDF-')) throw new Error('ترويسة PDF غير صالحة')

  const tail = decoder.decode(bytes.slice(Math.max(0, bytes.length - 4096)))
  if (!tail.includes('%%EOF')) throw new Error('خاتمة PDF مفقودة')

  try {
    const pdfDoc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    })

    const pageCount = pdfDoc.getPageCount()
    if (pageCount && pageCount > 0) return pageCount
  } catch (error) {
    console.log('⚠️ pdf-lib لم يستطع قراءة الصفحات، سنستخدم MuPDF:', error instanceof Error ? error.message : error)
  }

  const fallbackPageCount = await countPdfPagesWithMupdf(bytes)
  if (!fallbackPageCount) throw new Error('تعذر قراءة صفحات PDF')
  return fallbackPageCount
}

// Helper: try multiple methods to get pages from a PDF
async function getPagesSafe(pdfDoc: any): Promise<any[]> {
  // Method 1: Standard getPages
  try {
    const pages = pdfDoc.getPages()
    if (pages && pages.length > 0) {
      console.log(`✅ Method 1 (getPages): ${pages.length} pages`)
      return pages
    }
  } catch (e) {
    console.log('⚠️ Method 1 failed:', e.message)
  }

  // Method 2: Try to access pages through catalog directly
  try {
    const catalog = pdfDoc.catalog
    if (catalog) {
      const pagesRef = catalog.get(PDFName.of('Pages'))
      if (pagesRef) {
        console.log('🔧 Method 2: Rebuilding page tree...')
        // Force re-index by creating a new document and copying
        const newDoc = await PDFDocument.create()
        const copiedPages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices())
        if (copiedPages && copiedPages.length > 0) {
          console.log(`✅ Method 2 (copyPages): ${copiedPages.length} pages`)
          // Return pages from original after successful index
          return copiedPages.map((_: any, i: number) => {
            // We'll use the new doc approach instead
            return { index: i, fromCopy: true }
          })
        }
      }
    }
  } catch (e) {
    console.log('⚠️ Method 2 failed:', e.message)
  }

  // Method 3: getPageCount might work even if getPages fails
  try {
    const count = pdfDoc.getPageCount()
    if (count > 0) {
      console.log(`✅ Method 3 (getPageCount): ${count} pages, using copy approach`)
      return Array.from({ length: count }, (_, i) => ({ index: i, fromCount: true }))
    }
  } catch (e) {
    console.log('⚠️ Method 3 failed:', e.message)
  }

  return []
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

    const { pdfUrl, bucket = 'book-files' } = await req.json()
    
    console.log('🎨 بدء إضافة شعار الموقع على PDF:', pdfUrl)

    // 1. تحميل ملف PDF الأصلي
    console.log('📥 تحميل PDF الأصلي...')
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error(`فشل تحميل PDF: ${pdfResponse.statusText}`)
    }
    const pdfBytes = await pdfResponse.arrayBuffer()
    console.log('✅ تم تحميل PDF بنجاح:', pdfBytes.byteLength, 'بايت')
    await validatePdfBuffer(new Uint8Array(pdfBytes))

    // 2. تحميل شعار الموقع
    console.log('📥 تحميل شعار الموقع...')
    const logoUrls = [
      'https://kotobi.xyz/kotobi-watermark-logo.png',
      'https://kotobi.net/kotobi-watermark-logo.png',
      `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/book-covers/kotobi-watermark-logo.png`
    ]
    
    let logoImageBytes: Uint8Array | null = null
    for (const logoUrl of logoUrls) {
      try {
        console.log(`محاولة تحميل الشعار من: ${logoUrl}`)
        const logoResponse = await fetch(logoUrl)
        if (logoResponse.ok) {
          const logoArrayBuffer = await logoResponse.arrayBuffer()
          logoImageBytes = new Uint8Array(logoArrayBuffer)
          console.log('✅ تم تحميل الشعار بنجاح:', logoImageBytes.length, 'بايت')
          break
        } else {
          console.log(`⚠️ فشل التحميل من ${logoUrl}: ${logoResponse.status}`)
        }
      } catch (error) {
        console.error(`❌ خطأ في تحميل الشعار من ${logoUrl}:`, error)
      }
    }
    
    if (!logoImageBytes) {
      console.error('❌ فشل تحميل الشعار من جميع المصادر')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم رفع PDF بدون شعار (فشل تحميل الشعار)',
          originalUrl: pdfUrl,
          watermarked: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. فتح PDF وإضافة الشعار
    console.log('🔧 معالجة PDF...')
    
    let pdfDoc: any
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, { 
        ignoreEncryption: true,
        updateMetadata: false 
      })
    } catch (parseError) {
      console.error('❌ فشل تحليل PDF (محاولة 1):', parseError)
      try {
        pdfDoc = await PDFDocument.load(pdfBytes, { 
          ignoreEncryption: true,
          updateMetadata: false,
          throwOnInvalidObject: false
        })
      } catch (retryError) {
        console.error('❌ فشلت المحاولة الثانية:', retryError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'ملف PDF غير صالح أو تالف',
            details: parseError instanceof Error ? parseError.message : 'خطأ غير معروف'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }
    
    // محاولة الحصول على الصفحات بطرق متعددة
    let pages = await getPagesSafe(pdfDoc)
    
    // إذا فشلت كل الطرق، نستخدم طريقة النسخ الكامل
    let usesCopyApproach = false
    let newPdfDoc: any = null
    
    if (pages.length === 0) {
      console.log('⚠️ فشلت جميع طرق قراءة الصفحات، نحاول طريقة إعادة البناء...')
      try {
        // إنشاء مستند جديد ونسخ كل الصفحات إليه
        newPdfDoc = await PDFDocument.create()
        const pageIndices = Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i)
        const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices)
        for (const page of copiedPages) {
          newPdfDoc.addPage(page)
        }
        pages = newPdfDoc.getPages()
        usesCopyApproach = true
        console.log(`✅ طريقة إعادة البناء نجحت: ${pages.length} صفحة`)
      } catch (rebuildError) {
        console.error('❌ فشلت طريقة إعادة البناء:', rebuildError)
        
        // آخر محاولة: إرجاع PDF الأصلي بدون شعار بدلاً من الفشل
        console.log('⚠️ إرجاع PDF الأصلي بدون شعار...')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم رفع PDF بدون شعار (بنية PDF غير متوافقة)',
            originalUrl: pdfUrl,
            watermarked: false,
            pageCount: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (pages[0]?.fromCopy || pages[0]?.fromCount) {
      // Pages came from copy approach, need to rebuild
      try {
        newPdfDoc = await PDFDocument.create()
        const pageCount = pages.length
        const pageIndices = Array.from({ length: pageCount }, (_, i) => i)
        const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices)
        for (const page of copiedPages) {
          newPdfDoc.addPage(page)
        }
        pages = newPdfDoc.getPages()
        usesCopyApproach = true
        console.log(`✅ تم إعادة بناء PDF: ${pages.length} صفحة`)
      } catch (e) {
        console.error('❌ فشل إعادة البناء:', e)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم رفع PDF بدون شعار (بنية PDF غير متوافقة)',
            originalUrl: pdfUrl,
            watermarked: false,
            pageCount: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const workingDoc = usesCopyApproach ? newPdfDoc : pdfDoc
    
    // إضافة الشعار كصورة مضمنة
    let logoImage
    try {
      logoImage = await workingDoc.embedPng(logoImageBytes)
    } catch (embedError) {
      console.error('❌ فشل دمج الشعار كـ PNG، نحاول كـ JPG:', embedError)
      try {
        logoImage = await workingDoc.embedJpg(logoImageBytes)
      } catch (jpgError) {
        console.error('❌ فشل دمج الشعار:', jpgError)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم رفع PDF بدون شعار (فشل دمج الشعار)',
            originalUrl: pdfUrl,
            watermarked: false,
            pageCount: pages.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()
    
    const logoWidth = 120
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth
    
    const margin = 20
    firstPage.drawImage(logoImage, {
      x: width - logoWidth - margin,
      y: height - logoHeight - margin,
      width: logoWidth,
      height: logoHeight,
      opacity: 0.85,
    })
    
    console.log('✅ تم إضافة الشعار على الصفحة الأولى')

    // 4. حفظ PDF المعدل
    console.log('💾 حفظ PDF المعدل...')
    const modifiedPdfBytes = await workingDoc.save()
    const validatedPageCount = await validatePdfBuffer(modifiedPdfBytes)
    
    // 5. رفع PDF المعدل إلى Storage
    console.log('📤 رفع PDF المعدل إلى Storage...')
    const originalFileName = pdfUrl.split('/').pop() || `modified_${Date.now()}.pdf`
    const newFileName = `books/watermarked_${Date.now()}_${originalFileName}`
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(bucket)
      .upload(newFileName, modifiedPdfBytes, {
        contentType: 'application/pdf',
        cacheControl: '31536000',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ خطأ في رفع PDF المعدل:', uploadError)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم رفع PDF الأصلي (فشلت إضافة الشعار)',
          originalUrl: pdfUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const newPdfUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${newFileName}`
    console.log('✅ تم رفع PDF المعدل بنجاح:', newPdfUrl)

    const { data: uploadedFile, error: uploadedFileError } = await supabaseClient.storage
      .from(bucket)
      .download(newFileName)

    if (uploadedFileError || !uploadedFile) {
      await supabaseClient.storage.from(bucket).remove([newFileName]).catch(() => null)
      throw new Error(`تعذر التحقق من PDF بعد رفعه: ${uploadedFileError?.message || 'ملف مفقود'}`)
    }

    const uploadedBytes = new Uint8Array(await uploadedFile.arrayBuffer())
    const finalPageCount = await validatePdfBuffer(uploadedBytes)
    
    // 6. حذف الملف الأصلي
    try {
      const originalFilePath = pdfUrl.split(`/public/${bucket}/`)[1]
      if (originalFilePath && originalFilePath !== newFileName) {
        await supabaseClient.storage.from(bucket).remove([originalFilePath])
        console.log('🗑️ تم حذف الملف الأصلي')
      }
    } catch (error) {
      console.log('⚠️ لم يتم حذف الملف الأصلي:', error)
    }

    const pageCount = finalPageCount || validatedPageCount || pages.length
    console.log('📄 عدد صفحات PDF:', pageCount)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إضافة الشعار على PDF بنجاح',
        originalUrl: pdfUrl,
        watermarkedUrl: newPdfUrl,
        fileSize: modifiedPdfBytes.length,
        watermarked: true,
        pageCount: pageCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ خطأ في معالجة PDF:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ في إضافة الشعار على PDF' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
