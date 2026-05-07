
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  bookId: string;
  userId: string;
  bookTitle: string;
  userEmail: string;
  adminEmail: string;
}

serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId, bookTitle, userEmail, adminEmail } = await req.json() as EmailPayload;

    if (!bookId || !bookTitle || !userEmail) {
      return new Response(
        JSON.stringify({ error: "بيانات غير مكتملة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the incoming book notification
    console.log(`New book added: ${bookTitle} (${bookId}) by ${userEmail}`);
    console.log(`Notification should be sent to admin: ${adminEmail}`);

    // In a real production env, you would integrate with an email service
    // like Resend, SendGrid, or Mailgun here.
    // For now, let's just simulate successful emails:
    
    // 1. Email to user
    console.log(`Email to user would be:
      Subject: تم إضافة كتابك "${bookTitle}" بنجاح
      To: ${userEmail}
      Body: 
        مرحباً،
        
        تم إضافة كتاب "${bookTitle}" إلى منصتنا بنجاح. 
        الكتاب الآن متاح للعرض على المنصة.
        
        مع تحيات فريق المنصة
    `);
    
    // 2. Email to admin
    console.log(`Email to admin would be:
      Subject: كتاب جديد تمت إضافته: "${bookTitle}"
      To: ${adminEmail}
      Body: 
        هناك كتاب جديد بعنوان "${bookTitle}" تمت إضافته للمنصة.
        يمكنك مراجعة الكتاب من لوحة التحكم.
        
        رابط لوحة التحكم: /admin/books
    `);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم إرسال الإشعارات بنجاح" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error sending book notification:", error);
    
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء إرسال الإشعارات" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
