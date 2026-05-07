import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('📤 رفع شعار الموقع إلى Storage...')

    // رابط الشعار من assets
    const logoUrl = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/book-covers/kotobi-watermark-logo.png'
    
    // التحقق من وجود الشعار
    const { data: existingFiles } = await supabaseClient.storage
      .from('book-covers')
      .list('', {
        search: 'kotobi-watermark-logo.png'
      })
    
    if (existingFiles && existingFiles.length > 0) {
      console.log('✅ الشعار موجود بالفعل في Storage')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'الشعار موجود بالفعل',
          url: logoUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'يجب رفع الشعار يدوياً من src/assets/kotobi-watermark-logo.png إلى bucket: book-covers',
        expectedPath: 'kotobi-watermark-logo.png'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ خطأ:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
