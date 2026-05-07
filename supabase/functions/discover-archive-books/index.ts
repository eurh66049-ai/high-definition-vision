import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// تحسين استعلام البحث عبر Mistral AI (اختياري)
async function refineQueryWithMistral(userQuery: string): Promise<string> {
  const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!mistralApiKey) return userQuery;
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'حوّل طلب المستخدم إلى استعلام بحث archive.org Lucene لكتب PDF عربية. استخدم language:Arabic و mediatype:texts و format:PDF. أعد الاستعلام فقط بدون شرح.',
          },
          { role: 'user', content: userQuery },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });
    if (!response.ok) return userQuery;
    const data = await response.json();
    const refined = (data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
    return refined || userQuery;
  } catch {
    return userQuery;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const userQuery: string = (body.query || '').toString().trim();
    const limit: number = Math.min(parseInt(body.limit, 10) || 50, 200);
    const useMistral: boolean = body.useMistral !== false;

    if (!userQuery) {
      return new Response(
        JSON.stringify({ success: false, error: 'query مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // بناء استعلام archive.org
    let archiveQuery = useMistral ? await refineQueryWithMistral(userQuery) : userQuery;
    // ضمان وجود فلاتر أساسية
    if (!/mediatype/i.test(archiveQuery)) archiveQuery += ' AND mediatype:(texts)';
    if (!/format/i.test(archiveQuery)) archiveQuery += ' AND format:(PDF)';

    // استخدام Scrape API الجديدة من archive.org
    const scrapeUrl = new URL('https://archive.org/services/search/v1/scrape');
    scrapeUrl.searchParams.set('q', archiveQuery);
    scrapeUrl.searchParams.set('fields', 'identifier,title,creator,downloads');
    scrapeUrl.searchParams.set('count', String(Math.min(limit, 100)));

    const res = await fetch(scrapeUrl.toString(), {
      headers: { 'User-Agent': 'KotobiBookDiscovery/1.0' },
    });
    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ success: false, error: `archive.org HTTP ${res.status}: ${text.slice(0, 200)}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];

    const results = items.slice(0, limit).map((it: any) => ({
      identifier: it.identifier,
      title: Array.isArray(it.title) ? it.title[0] : (it.title || it.identifier),
      creator: Array.isArray(it.creator) ? it.creator.join(', ') : (it.creator || ''),
      details_url: `https://archive.org/details/${encodeURIComponent(it.identifier)}`,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        query: archiveQuery,
        total_found: items.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
