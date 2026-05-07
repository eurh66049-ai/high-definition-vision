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
    console.log('🚨 طلب إلغاء حظر مستخدم');

    const { bannedUserId } = await req.json();

    if (!bannedUserId) {
      console.error('❌ معرف المستخدم المحظور مفقود');
      return new Response(
        JSON.stringify({ error: 'معرف المستخدم المحظور مطلوب' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // إنشاء عميل Supabase مع صلاحيات الـ service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🔄 إلغاء حظر المستخدم: ${bannedUserId}`);

    // تحديث حالة الحظر إلى غير نشط
    const { error: updateError } = await supabase
      .from('banned_users')
      .update({ is_active: false })
      .eq('id', bannedUserId);

    if (updateError) {
      console.error('❌ خطأ في تحديث قاعدة البيانات:', updateError);
      return new Response(
        JSON.stringify({ error: 'فشل في إلغاء الحظر: ' + updateError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }

    console.log('✅ تم إلغاء الحظر بنجاح');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إلغاء الحظر بنجاح',
        bannedUserId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع: ' + error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});