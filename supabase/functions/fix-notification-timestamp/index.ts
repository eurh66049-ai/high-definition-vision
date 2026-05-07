
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

    // تحديث دالة الإشعارات لتستخدم الوقت الصحيح للمراجعة
    const { error } = await supabaseClient.rpc('execute_sql', {
      query: `
        CREATE OR REPLACE FUNCTION public.notify_book_status_change()
        RETURNS TRIGGER AS $$
        BEGIN
          -- التحقق من عدم وجود إشعار مماثل بالفعل
          IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
            -- التحقق من عدم وجود إشعار موافقة مسبق
            IF NOT EXISTS (
              SELECT 1 FROM public.notifications 
              WHERE user_id = NEW.user_id 
                AND book_submission_id = NEW.id 
                AND type = 'success'
                AND title LIKE '%موافقة%'
            ) THEN
              INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                book_submission_id,
                book_title,
                created_at
              ) VALUES (
                NEW.user_id,
                'تمت الموافقة على كتابك! 🎉',
                'تم قبول كتاب "' || NEW.title || '" وسيتم إضافته إلى المكتبة قريباً.',
                'success',
                NEW.id,
                NEW.title,
                COALESCE(NEW.reviewed_at, NOW())
              );
            END IF;
          
          ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
            -- التحقق من عدم وجود إشعار رفض مسبق
            IF NOT EXISTS (
              SELECT 1 FROM public.notifications 
              WHERE user_id = NEW.user_id 
                AND book_submission_id = NEW.id 
                AND type = 'error'
                AND title LIKE '%رفض%'
            ) THEN
              INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                book_submission_id,
                book_title,
                created_at
              ) VALUES (
                NEW.user_id,
                'تم رفض كتابك ❌',
                'نأسف لإبلاغك أن كتاب "' || NEW.title || '" لم يتم قبوله. ' || COALESCE('السبب: ' || NEW.reviewer_notes, ''),
                'error',
                NEW.id,
                NEW.title,
                COALESCE(NEW.reviewed_at, NOW())
              );
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- تحديث دالة تحديث حالة الكتاب لتتأكد من تحديد reviewed_at
        CREATE OR REPLACE FUNCTION public.update_book_submission_status(
          p_submission_id UUID,
          p_new_status TEXT,
          p_reviewer_notes TEXT DEFAULT NULL
        )
        RETURNS BOOLEAN AS $$
        DECLARE
          submission_record RECORD;
        BEGIN
          -- جلب بيانات الكتاب
          SELECT * INTO submission_record 
          FROM public.book_submissions 
          WHERE id = p_submission_id;
          
          IF NOT FOUND THEN
            RETURN false;
          END IF;
          
          -- تحديث حالة الكتاب مع تحديد وقت المراجعة
          UPDATE public.book_submissions 
          SET 
            status = p_new_status,
            reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes),
            reviewed_at = NOW()
          WHERE id = p_submission_id;
          
          RETURN true;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: "تم تحديث دالة الإشعارات لتستخدم الوقت الصحيح للمراجعة" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("خطأ في تحديث دالة الإشعارات:", error);
    
    return new Response(
      JSON.stringify({ error: "حدث خطأ في تحديث دالة الإشعارات" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
