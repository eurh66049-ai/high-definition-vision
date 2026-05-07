
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // تحديث التريغر ليرسل الإشعار فقط بدون إنشاء الكتاب
    const { error } = await supabaseClient.rpc('execute_sql', {
      query: `
        CREATE OR REPLACE FUNCTION public.notify_book_status_change()
        RETURNS TRIGGER AS $$
        BEGIN
          -- إذا تم تغيير الحالة من pending إلى approved
          IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
            INSERT INTO public.notifications (
              user_id,
              title,
              message,
              type,
              book_submission_id,
              book_title
            ) VALUES (
              NEW.user_id,
              'تمت الموافقة على كتابك! 🎉',
              'تم قبول كتاب "' || NEW.title || '" وسيتم إضافته إلى المكتبة قريباً.',
              'success',
              NEW.id,
              NEW.title
            );
          
          -- إذا تم رفض الكتاب
          ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
            INSERT INTO public.notifications (
              user_id,
              title,
              message,
              type,
              book_submission_id,
              book_title
            ) VALUES (
              NEW.user_id,
              'تم رفض كتابك ❌',
              'نأسف لإبلاغك أن كتاب "' || NEW.title || '" لم يتم قبوله. ' || COALESCE('السبب: ' || NEW.reviewer_notes, ''),
              'error',
              NEW.id,
              NEW.title
            );
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: "تم تحديث التريغر بنجاح" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("خطأ في تحديث التريغر:", error);
    
    return new Response(
      JSON.stringify({ error: "حدث خطأ في تحديث التريغر" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
