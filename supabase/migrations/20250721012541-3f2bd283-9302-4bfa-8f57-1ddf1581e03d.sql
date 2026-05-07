-- إزالة إشعار إنشاء صفحة HTML المزعج من دالة trigger_html_generation
CREATE OR REPLACE FUNCTION public.trigger_html_generation(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url text;
BEGIN
  -- رابط Edge Function
  v_function_url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/generate-book-html-page';
  
  -- استدعاء Edge Function بشكل غير متزامن
  PERFORM
    net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('bookId', p_book_id::text)
    );
    
  -- تم إزالة إنشاء الإشعار المزعج عن HTML
  
EXCEPTION WHEN OTHERS THEN
  -- في حالة الخطأ، نسجل الخطأ ولا نوقف العملية
  RAISE LOG 'Error generating HTML for book %: %', p_book_id, SQLERRM;
END;
$$;