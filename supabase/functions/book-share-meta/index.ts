import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const bookSlug = url.searchParams.get('slug') || url.searchParams.get('id') || ''
    
    // Support passing book data directly as query params (for books not in DB)
    const paramTitle = url.searchParams.get('title') || ''
    const paramAuthor = url.searchParams.get('author') || ''
    const paramCover = url.searchParams.get('cover') || ''
    const paramDesc = url.searchParams.get('desc') || ''

    if (!bookSlug && !paramTitle) {
      return new Response('Book not found', { status: 404, headers: corsHeaders })
    }

    let book: {
      title: string;
      author: string;
      description: string;
      cover_image_url: string;
      category: string;
      slug: string;
    } | null = null

    // Try to find book in database first
    if (bookSlug) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kydmyxsgyxeubhmqzrgo.supabase.co'
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0'
      
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { data: bySlug } = await supabase
        .from('book_submissions')
        .select('id, title, author, description, cover_image_url, category, slug')
        .eq('status', 'approved')
        .eq('slug', bookSlug)
        .maybeSingle()

      if (bySlug) {
        book = { ...bySlug, slug: bySlug.slug || bookSlug }
      } else {
        const { data: byId } = await supabase
          .from('book_submissions')
          .select('id, title, author, description, cover_image_url, category, slug')
          .eq('status', 'approved')
          .eq('id', bookSlug)
          .maybeSingle()
        
        if (byId) book = { ...byId, slug: byId.slug || bookSlug }
      }
    }

    // If not found in DB, use query params
    if (!book && paramTitle) {
      book = {
        title: paramTitle,
        author: paramAuthor,
        description: paramDesc,
        cover_image_url: paramCover,
        category: '',
        slug: bookSlug || paramTitle.replace(/\s+/g, '-'),
      }
    }

    // If still no book data, redirect
    if (!book) {
      console.log('Book not found for:', bookSlug)
      const redirectSlug = (() => {
        try {
          return decodeURIComponent(bookSlug)
        } catch {
          return bookSlug
        }
      })()

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': `https://kotobi.xyz/book/${redirectSlug}` }
      })
    }

    const baseUrl = 'https://kotobi.xyz'
    const readableSlug = (() => {
      try {
        return decodeURIComponent(book.slug)
      } catch {
        return book.slug
      }
    })()
    const bookUrl = `${baseUrl}/book/${readableSlug}`
    const imageUrl = book.cover_image_url || `${baseUrl}/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png`
    
    const description = book.description && book.description.length > 0
      ? book.description.substring(0, 200)
      : `كتاب ${book.title} للمؤلف ${book.author} - اقرأ وحمّل مجاناً من منصة كتبي`

    const safeTitle = escapeHtml(book.title)
    const safeAuthor = escapeHtml(book.author)
    const safeDescription = escapeHtml(description)
    const safeImageUrl = escapeHtml(imageUrl)
    const safeBookUrl = escapeHtml(bookUrl)

    console.log('Serving OG tags for:', { title: book.title, author: book.author, image: imageUrl })

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${safeTitle} - ${safeAuthor} | منصة كتبي</title>
  <meta name="description" content="${safeDescription}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="📚 ${safeTitle} - ${safeAuthor}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImageUrl}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="800">
  <meta property="og:image:alt" content="غلاف كتاب ${safeTitle}">
  <meta property="og:url" content="${safeBookUrl}">
  <meta property="og:type" content="book">
  <meta property="og:site_name" content="منصة كتبي">
  <meta property="og:locale" content="ar_AR">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="📚 ${safeTitle} - ${safeAuthor}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImageUrl}">
  
  <link rel="canonical" href="${safeBookUrl}">
  
  <!-- Redirect real users to the app -->
  <meta http-equiv="refresh" content="0;url=${safeBookUrl}">
  <script>window.location.href="${bookUrl.replace(/"/g, '\\"')}";</script>
</head>
<body style="font-family:Arial,sans-serif;text-align:center;padding:40px;background:#f5f5f5;">
  <div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
    <img src="${safeImageUrl}" alt="غلاف كتاب ${safeTitle}" style="max-width:180px;height:auto;margin-bottom:16px;border-radius:8px;">
    <h1 style="color:#333;font-size:22px;margin-bottom:8px;">${safeTitle}</h1>
    <h2 style="color:#666;font-size:16px;font-weight:normal;margin-bottom:16px;">تأليف: ${safeAuthor}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;">${safeDescription}</p>
    <p style="color:#888;font-size:13px;margin-top:20px;">جاري توجيهك إلى صفحة الكتاب...</p>
    <a href="${safeBookUrl}" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">اقرأ الكتاب الآن</a>
  </div>
</body>
</html>`

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders 
    })
  }
})
