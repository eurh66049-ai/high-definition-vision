import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BATCH_SIZE = 2;          // كم كتاب لكل جولة
const MAX_ROUNDS = 4;          // كم جولة في الاستدعاء الواحد (≈ 8 كتب)
const PER_ITEM_TIMEOUT_MS = 240_000; // 4 دقائق لكل كتاب

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function processOne(supabase: any, queueId: string, bookId: string) {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('extract-book-text', {
        body: { bookId, bookTable: 'approved_books' },
      }) as Promise<any>,
      PER_ITEM_TIMEOUT_MS,
    );

    if (error) throw error;

    if (data?.success && (data?.textLength ?? 0) > 0) {
      await supabase
        .from('text_extraction_queue')
        .update({ status: 'completed', finished_at: new Date().toISOString(), last_error: null })
        .eq('id', queueId);
      return { ok: true };
    }

    const errMsg = data?.error || data?.errors?.join('; ') || 'no text extracted';
    await supabase
      .from('text_extraction_queue')
      .update({ status: 'pending', last_error: errMsg })
      .eq('id', queueId);
    return { ok: false, error: errMsg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // mark failed permanently if attempts exhausted (handled by claim function ≥5)
    await supabase
      .from('text_extraction_queue')
      .update({ status: 'pending', last_error: msg })
      .eq('id', queueId);
    return { ok: false, error: msg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: items, error } = await supabase.rpc('claim_text_extraction_items', { p_limit: BATCH_SIZE });
    if (error) {
      console.error('claim error:', error);
      break;
    }
    if (!items || items.length === 0) break;

    const results = await Promise.all(
      items.map((it: any) => processOne(supabase, it.id, it.book_id))
    );

    totalProcessed += items.length;
    totalSucceeded += results.filter(r => r.ok).length;
    totalFailed += results.filter(r => !r.ok).length;

    // mark items that have hit max attempts as failed (so they stop being claimed)
    await supabase
      .from('text_extraction_queue')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .gte('attempts', 5)
      .eq('status', 'pending');
  }

  return new Response(
    JSON.stringify({ success: true, processed: totalProcessed, succeeded: totalSucceeded, failed: totalFailed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});