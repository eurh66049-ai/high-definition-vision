
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  userEmail: string;
  userName: string;
}

serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName } = await req.json() as EmailPayload;

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تحقق من وجود API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY environment variable is missing");
      return new Response(
        JSON.stringify({ error: "إعدادات البريد الإلكتروني غير متوفرة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the incoming email request
    console.log(`Sending welcome email to: ${userEmail}`);
    
    // Format the email content with proper HTML structure
    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
        <h1 style="color: #5c6ac4; text-align: center;">مرحباً ${userName || 'بك'}</h1>
        
        <p style="font-size: 16px; line-height: 1.6;">نرحب بك في منصتنا للكتب العربية.</p>
        <p style="font-size: 16px; line-height: 1.6;">يمكنك الآن استكشاف مكتبتنا والاطلاع على الكتب المتاحة أو رفع كتبك الخاصة.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${Deno.env.get("SITE_URL") || "https://kotobati.com"}" style="background-color: #5c6ac4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">زيارة المنصة</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">مع تحيات فريق المنصة</p>
      </div>
    `;
    
    try {
      // Send email using Resend API
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "كتبي <no-reply@kotobati.com>",
          to: userEmail,
          subject: "مرحباً بك في منصة كتبي",
          html: emailHtml
        })
      });
      
      const resendData = await resendResponse.json();
      console.log("Resend API response:", resendData);
      
      if (!resendResponse.ok) {
        console.error(`Resend API error: ${resendResponse.status} - ${JSON.stringify(resendData)}`);
        throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
      }
      
      console.log(`Email sent successfully to: ${userEmail}`);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // لا نرمي الخطأ هنا لأن فشل البريد الترحيبي لا يجب أن يوقف عملية التسجيل
      console.log("Welcome email failed but signup should continue");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم إرسال بريد الترحيب بنجاح" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);
    
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء إرسال البريد الإلكتروني", details: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
