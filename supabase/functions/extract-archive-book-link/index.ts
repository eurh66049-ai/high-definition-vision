import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// استخراج معرّف العنصر من رابط archive.org
function extractIdentifier(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    if (!u.hostname.includes('archive.org')) return null;
    // /details/{id} أو /download/{id}/...
    const m = u.pathname.match(/\/(?:details|download|stream|embed)\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

async function pickBestPdfWithMistral(
  files: { name: string; size?: number }[],
  itemTitle: string,
): Promise<string | null> {
  const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!mistralApiKey || files.length === 0) return null;

  const fileList = files.map((f, i) => `${i + 1}. ${f.name}${f.size ? ` (${f.size} bytes)` : ''}`).join('\n');

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
            content: 'أنت مساعد يختار أفضل ملف PDF من قائمة لتنزيل كتاب. أعد فقط رقم الملف الأنسب (أكبر نسخة كاملة، تجنب النسخ المضغوطة _bw أو _text).',
          },
          {
            role: 'user',
            content: `عنوان الكتاب: ${itemTitle}\n\nالملفات المتاحة:\n${fileList}\n\nأعد فقط رقم الملف الأنسب (رقم واحد فقط، بدون شرح).`,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();
    const num = parseInt(text.match(/\d+/)?.[0] || '', 10);
    if (!isNaN(num) && num >= 1 && num <= files.length) {
      return files[num - 1].name;
    }
  } catch (e) {
    console.error('Mistral selection error:', e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { pageUrl } = await req.json();
    if (!pageUrl || typeof pageUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'pageUrl مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const identifier = extractIdentifier(pageUrl);
    if (!identifier) {
      return new Response(
        JSON.stringify({ success: false, error: 'الرابط ليس صفحة archive.org صالحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // جلب الميتاداتا
    const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
    if (!metaRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `archive.org metadata HTTP ${metaRes.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const meta = await metaRes.json();
    const itemTitle = meta?.metadata?.title || identifier;

    // فلترة ملفات PDF
    const allFiles = Array.isArray(meta?.files) ? meta.files : [];
    const pdfFiles = allFiles
      .filter((f: any) => typeof f.name === 'string' && /\.pdf$/i.test(f.name))
      .map((f: any) => ({ name: f.name, size: f.size ? parseInt(f.size, 10) : undefined }));

    if (pdfFiles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'لا يوجد ملف PDF في هذا العنصر' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let chosen: string | null = null;
    if (pdfFiles.length === 1) {
      chosen = pdfFiles[0].name;
    } else {
      // اختيار ذكي عبر Mistral، مع fallback إلى أكبر ملف غير مضغوط
      chosen = await pickBestPdfWithMistral(pdfFiles, itemTitle);
      if (!chosen) {
        const preferred = pdfFiles
          .filter((f) => !/_bw\.pdf$|_text\.pdf$/i.test(f.name))
          .sort((a, b) => (b.size || 0) - (a.size || 0));
        chosen = (preferred[0] || pdfFiles[0]).name;
      }
    }

    const downloadUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURI(chosen)}`;

    return new Response(
      JSON.stringify({
        success: true,
        identifier,
        title: itemTitle,
        book_file_url: downloadUrl,
        total_pdfs: pdfFiles.length,
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
