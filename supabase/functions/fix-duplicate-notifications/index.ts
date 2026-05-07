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

    // حذف الإشعارات المكررة أولاً
    const { error: cleanupError } = await supabaseClient.rpc('execute_sql', {
      query: `
        -- حذف الإشعارات المكررة
        DELETE FROM public.notifications 
        WHERE id IN (
          SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                     PARTITION BY user_id, book_submission_id, type, 
                                  CASE WHEN title LIKE '%موافقة%' OR title LIKE '%قبول%' THEN 'approval'
                                       WHEN title LIKE '%رفض%' THEN 'rejection'
                                       ELSE title END
                     ORDER BY created_at DESC
                   ) as rn
            FROM public.notifications
            WHERE book_submission_id IS NOT NULL
          ) t
          WHERE t.rn > 1
        );
      `
    });

    if (cleanupError) {
      console.error("خطأ في تنظيف الإشعارات المكررة:", cleanupError);
    }

    // تحديث دالة الإشعارات لمنع التكرار
    const { error } = await supabaseClient.rpc('execute_sql', {
      query: `
        CREATE OR REPLACE FUNCTION public.notify_book_status_change()
        RETURNS TRIGGER AS $$
        DECLARE
          existing_notification_count INTEGER;
        BEGIN
          -- إذا تم تغيير الحالة من pending إلى approved
          IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
            -- التحقق من عدم وجود إشعار موافقة مسبق لنفس الكتاب
            SELECT COUNT(*) INTO existing_notification_count
            FROM public.notifications 
            WHERE user_id = NEW.user_id 
              AND book_submission_id = NEW.id 
              AND (title LIKE '%موافقة%' OR title LIKE '%قبول%' OR type = 'success');
            
            -- إنشاء الإشعار فقط إذا لم يكن موجود مسبقاً
            IF existing_notification_count = 0 THEN
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
          
          -- إذا تم رفض الكتاب
          ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
            -- التحقق من عدم وجود إشعار رفض مسبق لنفس الكتاب
            SELECT COUNT(*) INTO existing_notification_count
            FROM public.notifications 
            WHERE user_id = NEW.user_id 
              AND book_submission_id = NEW.id 
              AND (title LIKE '%رفض%' OR type = 'error');
            
            -- إنشاء الإشعار فقط إذا لم يكن موجود مسبقاً
            IF existing_notification_count = 0 THEN
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

        -- إنشاء فهرس لتحسين الأداء
        CREATE INDEX IF NOT EXISTS idx_notifications_dedup 
        ON public.notifications (user_id, book_submission_id, type, title);
      `
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم إصلاح مشكلة تكرار الإشعارات بنجاح وحذف الإشعارات المكررة" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("خطأ في إصلاح الإشعارات المكررة:", error);
    
    return new Response(
      JSON.stringify({ error: "حدث خطأ في إصلاح مشكلة تكرار الإشعارات" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});