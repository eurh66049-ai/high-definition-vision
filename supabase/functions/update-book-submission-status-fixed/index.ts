
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

    // إنشاء دالة محدثة لتحديث حالة الكتاب بدون إرسال إشعارات مكررة
    const { error } = await supabaseClient.rpc('execute_sql', {
      query: `
        CREATE OR REPLACE FUNCTION public.update_book_submission_status(
          p_submission_id UUID,
          p_new_status TEXT,
          p_reviewer_notes TEXT DEFAULT NULL
        )
        RETURNS BOOLEAN AS $$
        DECLARE
          submission_exists BOOLEAN;
        BEGIN
          -- التحقق من وجود الطلب
          SELECT EXISTS(
            SELECT 1 FROM book_submissions 
            WHERE id = p_submission_id
          ) INTO submission_exists;
          
          IF NOT submission_exists THEN
            RETURN FALSE;
          END IF;
          
          -- تحديث حالة الطلب (سيُرسل التريغر الإشعار تلقائياً)
          UPDATE book_submissions 
          SET 
            status = p_new_status,
            reviewer_notes = p_reviewer_notes,
            reviewed_at = NOW()
          WHERE id = p_submission_id;
          
          RETURN TRUE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- تحديث التريغر ليتأكد من عدم إرسال إشعارات مكررة
        DROP TRIGGER IF EXISTS book_status_notification_trigger ON book_submissions;
        
        CREATE TRIGGER book_status_notification_trigger
          AFTER UPDATE OF status ON book_submissions
          FOR EACH ROW
          WHEN (OLD.status IS DISTINCT FROM NEW.status)
          EXECUTE FUNCTION notify_book_status_change();
      `
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: "تم تحديث الدالة بنجاح لمنع الإشعارات المكررة" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("خطأ في تحديث الدالة:", error);
    
    return new Response(
      JSON.stringify({ error: "حدث خطأ في تحديث الدالة" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
