
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY')
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY not configured')
    if (!MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY not configured')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if we should clear old data
    const body = await req.json().catch(() => ({}))
    if (body?.action === 'clear') {
      await supabase.from('book_news').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      return new Response(JSON.stringify({ success: true, message: 'تم حذف جميع الأخبار' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calculate date range - fetch news from the past month
    const fromDate = new Date()
    fromDate.setMonth(fromDate.getMonth() - 1)
    const fromDateStr = fromDate.toISOString().split('T')[0]

    // Arabic-focused book news queries - diverse sources
    const queries = [
      { q: 'كتاب جديد OR رواية عربية OR معرض الكتاب', lang: 'ar' },
      { q: 'جائزة أدبية OR كاتب عربي OR إصدارات أدبية', lang: 'ar' },
      { q: 'معرض القاهرة للكتاب OR معرض الرياض OR معرض الشارقة', lang: 'ar' },
      { q: 'رواية OR ديوان شعر OR مؤلف OR دار نشر', lang: 'ar' },
      { q: 'Arabic literature OR Arab book fair OR Arabic novel award', lang: 'en' },
    ]

    let allArticles: any[] = []

    for (const query of queries) {
      try {
        const newsRes = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(query.q)}&language=${query.lang}&from=${fromDateStr}&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
        )
        const newsData = await newsRes.json()
        console.log(`Query "${query.q}" (${query.lang}): ${newsData.totalResults || 0} results, status: ${newsData.status}`)
        if (newsData.status === 'error') {
          console.error('NewsAPI error:', newsData.message)
        }
        if (newsData.articles) {
          allArticles.push(...newsData.articles)
        }
      } catch (e) {
        console.error(`Error fetching query "${query.q}":`, e)
      }
      await new Promise(r => setTimeout(r, 500))
    }

    // Deduplicate by URL
    const seen = new Set<string>()
    allArticles = allArticles.filter(a => {
      if (!a.url || seen.has(a.url)) return false
      seen.add(a.url)
      return true
    })

    if (allArticles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'لم يتم العثور على مقالات', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let savedCount = 0

    for (const article of allArticles.slice(0, 20)) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('book_news')
        .select('id')
        .eq('source_url', article.url)
        .maybeSingle()

      if (existing) continue

      const articleText = `العنوان: ${article.title || ''}\nالوصف: ${article.description || ''}\nالمحتوى: ${article.content || ''}`

      // Analyze with Mistral
      const groqRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: `أنت محلل أخبار كتب عربية متخصص. مهمتك تحليل المقالات وتحديد إذا كانت تتعلق بالكتب العربية والأدب العربي.

القواعد الصارمة:
1. إذا لم يكن المقال عن كتب أو أدب أو معارض كتب أو جوائز أدبية أو كُتّاب، أرجع: {"is_book_related": false}
2. إذا كان المقال عن موسيقى أو أفلام أو رياضة أو سياسة بدون علاقة بالكتب، أرجع: {"is_book_related": false}
3. إذا كان المقال بالإنجليزية وليس عن أدب عربي، أرجع: {"is_book_related": false}

إذا كان المقال متعلقاً بالكتب العربية فعلاً، أرجع JSON فقط:
{
  "is_book_related": true,
  "title": "عنوان جذاب وواضح بالعربية يصف الخبر",
  "book_name": "اسم الكتاب إن ذُكر أو null",
  "author_name": "اسم الكاتب/المؤلف إن ذُكر أو null",
  "news_type": "إصدار جديد" أو "جائزة" أو "معرض كتاب" أو "مراجعة" أو "خبر عن كاتب",
  "summary": "ملخص دقيق بالعربية لا يتجاوز 40 كلمة يوضح جوهر الخبر"
}

أرجع JSON فقط بدون أي نص إضافي.`
            },
            { role: 'user', content: articleText }
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
      })

      if (!groqRes.ok) {
        console.error('Mistral error:', await groqRes.text())
        continue
      }

      const groqData = await groqRes.json()
      const content = groqData.choices?.[0]?.message?.content || ''

      let analysis
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) continue
        analysis = JSON.parse(jsonMatch[0])
      } catch {
        console.error('Failed to parse Mistral response:', content)
        continue
      }

      // Skip non-book-related articles
      if (!analysis.is_book_related) {
        console.log('Skipped non-book article:', article.title)
        continue
      }

      // Save to database
      const { error } = await supabase.from('book_news').insert({
        title: analysis.title,
        book_name: analysis.book_name,
        author_name: analysis.author_name,
        summary: analysis.summary,
        news_type: analysis.news_type || 'عام',
        image_url: article.urlToImage,
        source_url: article.url,
        source_name: article.source?.name,
        published_at: article.publishedAt || new Date().toISOString(),
        is_published: true,
      })

      if (error) {
        console.error('Insert error:', error)
      } else {
        savedCount++
        console.log('Saved:', analysis.title)
      }

      // Rate limit for Mistral
      await new Promise(r => setTimeout(r, 1500))
    }

    return new Response(
      JSON.stringify({ success: true, count: savedCount, total_fetched: allArticles.length, message: `تم حفظ ${savedCount} أخبار جديدة` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
