import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, punishment, reason, durationHours } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('🚨 تطبيق حظر على المستخدم', { userId, punishment, reason, durationHours });

    // Determine ban details
    const isTemp = punishment === 'temp_ban';
    const ban_type = isTemp ? 'temporary' : 'permanent';
    const expires_at = isTemp
      ? new Date(Date.now() + ((durationHours ?? 24) * 60 * 60 * 1000)).toISOString()
      : null;

    // Insert ban record
    const { data, error } = await supabase
      .from('banned_users')
      .insert({
        user_id: userId,
        reason: reason || 'مخالفة سياسات الاستخدام',
        ban_type,
        expires_at,
        banned_at: new Date().toISOString(),
        is_active: true
      })
      .select('*')
      .single();

    if (error) {
      console.error('❌ خطأ في تطبيق الحظر:', error);
      return new Response(
        JSON.stringify({ error: 'فشل في تطبيق الحظر: ' + error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ تم تطبيق الحظر بنجاح', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ خطأ غير متوقع في ban-user:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
