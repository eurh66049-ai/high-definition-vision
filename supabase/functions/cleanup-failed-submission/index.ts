import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupRequest {
  fileUrls: string[];
  reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { fileUrls, reason }: CleanupRequest = await req.json();

    if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'لا توجد ملفات للحذف'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`🧹 بدء عملية حذف ${fileUrls.length} ملف - السبب: ${reason || 'غير محدد'}`);

    const deletionResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const fileUrl of fileUrls) {
      try {
        // استخراج bucket واسم الملف من الرابط
        const urlParts = fileUrl.split('/');
        const publicIndex = urlParts.findIndex(part => part === 'public');
        
        if (publicIndex === -1 || publicIndex >= urlParts.length - 2) {
          console.error('❌ رابط غير صحيح:', fileUrl);
          deletionResults.push({
            url: fileUrl,
            success: false,
            error: 'رابط غير صحيح'
          });
          errorCount++;
          continue;
        }

        const bucket = urlParts[publicIndex + 1];
        const filePath = urlParts.slice(publicIndex + 2).join('/');

        console.log(`🔄 محاولة حذف: ${bucket}/${filePath}`);

        // حذف الملف من Storage
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([filePath]);

        if (deleteError) {
          console.error(`❌ فشل حذف ${filePath}:`, deleteError);
          deletionResults.push({
            url: fileUrl,
            bucket,
            filePath,
            success: false,
            error: deleteError.message
          });
          errorCount++;
        } else {
          console.log(`✅ تم حذف: ${bucket}/${filePath}`);
          deletionResults.push({
            url: fileUrl,
            bucket,
            filePath,
            success: true
          });
          successCount++;
        }

      } catch (error) {
        console.error(`❌ خطأ في معالجة ${fileUrl}:`, error);
        deletionResults.push({
          url: fileUrl,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    const summary = {
      success: errorCount === 0,
      message: `تم حذف ${successCount} من أصل ${fileUrls.length} ملف`,
      statistics: {
        total: fileUrls.length,
        success: successCount,
        errors: errorCount
      },
      details: deletionResults,
      reason: reason || 'غير محدد'
    };

    console.log('📊 نتائج عملية التنظيف:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ خطأ في عملية التنظيف:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'فشل في عملية تنظيف الملفات'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});