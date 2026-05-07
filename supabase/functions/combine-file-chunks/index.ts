
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const isPdfUpload = (fileName: string, contentType?: string) => {
  const normalizedType = String(contentType || '').toLowerCase()
  return normalizedType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')
}

const validatePdfBytes = async (bytes: Uint8Array) => {
  if (bytes.length < 1024) {
    throw new Error('ملف PDF الناتج صغير جداً وغير صالح')
  }

  const header = new TextDecoder('latin1').decode(bytes.slice(0, 8))
  if (!header.startsWith('%PDF-')) {
    throw new Error('الملف الناتج لا يحتوي على ترويسة PDF صحيحة')
  }

  const tailStart = Math.max(0, bytes.length - 4096)
  const tail = new TextDecoder('latin1').decode(bytes.slice(tailStart))
  if (!tail.includes('%%EOF')) {
    throw new Error('الملف الناتج لا يحتوي على خاتمة PDF صحيحة')
  }

  const pdfDoc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
  })

  const pageCount = pdfDoc.getPageCount()
  if (!pageCount || pageCount < 1) {
    throw new Error('تعذر التحقق من صفحات PDF بعد دمج الأجزاء')
  }

  return pageCount
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bucketName, fileName, totalChunks, contentType = 'application/pdf' } = await req.json()

    if (!bucketName || !fileName || !totalChunks) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`بدء دمج ${totalChunks} جزء للملف ${fileName}`)

    // Download all chunks
    const chunks: Uint8Array[] = []
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkFileName = `${fileName}.part${i.toString().padStart(4, '0')}`
      
      try {
        const { data: chunkData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(chunkFileName)
          
        if (downloadError) {
          console.error(`خطأ في تحميل الجزء ${i}:`, downloadError)
          throw new Error(`Failed to download chunk ${i}: ${downloadError.message}`)
        }
        
        if (!chunkData) {
          throw new Error(`Chunk ${i} data is null`)
        }
        
        const chunkBuffer = new Uint8Array(await chunkData.arrayBuffer())
        chunks.push(chunkBuffer)
        
        console.log(`تم تحميل الجزء ${i + 1}/${totalChunks}`)
        
      } catch (error) {
        console.error(`فشل في تحميل الجزء ${i}:`, error)
        throw error
      }
    }

    // Combine chunks
    console.log('دمج الأجزاء...')
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combinedFile = new Uint8Array(totalSize)
    
    let offset = 0
    for (const chunk of chunks) {
      combinedFile.set(chunk, offset)
      offset += chunk.length
    }

    console.log(`تم دمج ${chunks.length} جزء بحجم إجمالي ${totalSize} بايت`)

    let pageCount: number | null = null
    if (isPdfUpload(fileName, contentType)) {
      pageCount = await validatePdfBytes(combinedFile)
      console.log(`✅ تم التحقق من سلامة PDF قبل الرفع: ${pageCount} صفحة`)
    }

    // Upload the combined file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, combinedFile, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      })

    if (uploadError) {
      console.error('خطأ في رفع الملف المدمج:', uploadError)
      throw new Error(`Failed to upload combined file: ${uploadError.message}`)
    }

    // Clean up chunks
    console.log('تنظيف الأجزاء المؤقتة...')
    const deletePromises = []
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkFileName = `${fileName}.part${i.toString().padStart(4, '0')}`
      deletePromises.push(
        supabase.storage
          .from(bucketName)
          .remove([chunkFileName])
      )
    }
    
    // Wait for all deletions (but don't fail if some chunks can't be deleted)
    await Promise.allSettled(deletePromises)
    console.log('تم تنظيف الأجزاء المؤقتة')

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    const fileUrl = urlData.publicUrl

    if (isPdfUpload(fileName, contentType)) {
      const { data: storedFile, error: storedFileError } = await supabase.storage
        .from(bucketName)
        .download(fileName)

      if (storedFileError || !storedFile) {
        throw new Error(`تم رفع الملف لكن تعذر التحقق النهائي منه: ${storedFileError?.message || 'ملف مفقود'}`)
      }

      const storedBytes = new Uint8Array(await storedFile.arrayBuffer())
      pageCount = await validatePdfBytes(storedBytes)
      console.log(`✅ تم التحقق النهائي من PDF بعد الرفع: ${pageCount} صفحة`)
    }
    
    console.log(`تم دمج الملف بنجاح: ${fileUrl}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileUrl,
        fileName,
        totalSize,
        chunksProcessed: totalChunks,
        pageCount,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('خطأ في دمج الأجزاء:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to combine file chunks', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
