import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting sitemap update process...')

    // حذف جميع URLs القديمة
    const { error: deleteError } = await supabase
      .from('dynamic_sitemap')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (deleteError) {
      console.error('Error deleting old sitemap entries:', deleteError)
      throw deleteError
    }

    // إضافة الصفحات الثابتة
    const staticPages = [
      { url: 'https://kotobi.xyz/', page_type: 'static', priority: 1.0, changefreq: 'daily' },
      { url: 'https://kotobi.xyz/categories', page_type: 'static', priority: 0.9, changefreq: 'weekly' },
      { url: 'https://kotobi.xyz/authors', page_type: 'static', priority: 0.9, changefreq: 'weekly' },
      { url: 'https://kotobi.xyz/upload-book', page_type: 'static', priority: 0.6, changefreq: 'monthly' },
      { url: 'https://kotobi.xyz/about', page_type: 'static', priority: 0.5, changefreq: 'monthly' },
      { url: 'https://kotobi.xyz/contact', page_type: 'static', priority: 0.5, changefreq: 'monthly' },
      { url: 'https://kotobi.xyz/privacy', page_type: 'static', priority: 0.3, changefreq: 'yearly' },
      { url: 'https://kotobi.xyz/terms', page_type: 'static', priority: 0.3, changefreq: 'yearly' }
    ]

    const { error: staticError } = await supabase
      .from('dynamic_sitemap')
      .insert(staticPages)

    if (staticError) {
      console.error('Error inserting static pages:', staticError)
      throw staticError
    }

    // إضافة الكتب المعتمدة من جميع المصادر
    const { data: books, error: booksError } = await supabase
      .from('book_submissions')
      .select('id, slug, title, created_at')
      .eq('status', 'approved')

    if (booksError) {
      console.error('Error fetching books:', booksError)
      throw booksError
    }

    if (books && books.length > 0) {
      const bookUrls = books.map(book => ({
        // استخدام encodeURIComponent لضمان ترميز الروابط العربية بشكل صحيح
        url: `https://kotobi.xyz/book/${encodeURIComponent(book.slug || book.id)}`,
        page_type: 'book',
        entity_id: book.id,
        priority: 0.8,
        changefreq: 'monthly',
        lastmod: book.created_at || new Date().toISOString()
      }))

      const { error: bookUrlsError } = await supabase
        .from('dynamic_sitemap')
        .insert(bookUrls)

      if (bookUrlsError) {
        console.error('Error inserting book URLs:', bookUrlsError)
        throw bookUrlsError
      }
    }

    // إضافة المؤلفين
    const { data: authors, error: authorsError } = await supabase
      .from('authors')
      .select('id, slug, name, created_at')

    if (authorsError) {
      console.error('Error fetching authors:', authorsError)
      throw authorsError
    }

    if (authors && authors.length > 0) {
      const authorUrls = authors.map(author => {
        // استخدام slug إذا كان متاحاً، وإلا استخدام encodeURIComponent للاسم
        const identifier = author.slug || encodeURIComponent(author.name);
        return {
          url: `https://kotobi.xyz/author/${identifier}`,
          page_type: 'author',
          entity_id: author.id,
          priority: 0.7,
          changefreq: 'weekly',
          lastmod: author.created_at || new Date().toISOString()
        };
      })

      const { error: authorUrlsError } = await supabase
        .from('dynamic_sitemap')
        .insert(authorUrls)

      if (authorUrlsError) {
        console.error('Error inserting author URLs:', authorUrlsError)
        throw authorUrlsError
      }
    }

    // إضافة صفحات التصنيفات
    const { data: categories, error: categoriesError } = await supabase
      .rpc('get_categories_with_counts')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
    } else if (categories && categories.length > 0) {
      const categoryUrls = categories.map((category: any) => ({
        url: `https://kotobi.xyz/category/${encodeURIComponent(category.category)}`,
        page_type: 'category',
        priority: 0.6,
        changefreq: 'weekly',
        lastmod: new Date().toISOString()
      }))

      const { error: categoryUrlsError } = await supabase
        .from('dynamic_sitemap')
        .insert(categoryUrls)

      if (categoryUrlsError) {
        console.error('Error inserting category URLs:', categoryUrlsError)
      }
    }

    const message = `Sitemap updated successfully! Added ${staticPages.length} static pages, ${books?.length || 0} books, ${authors?.length || 0} authors, and ${categories?.length || 0} categories.`
    
    console.log(message)

    return new Response(JSON.stringify({ success: true, message }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Error updating sitemap:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
})