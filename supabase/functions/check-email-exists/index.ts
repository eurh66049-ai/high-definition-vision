import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    const normalizedEmail = normalizeGmailAddress(email);
    
    // استخدام Admin API للتحقق من المستخدمين
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ exists: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // البحث عن المستخدم بالإيميل والتحقق من أنه أكد إيميله
    const confirmedUser = users.find(user => {
      const userEmail = user.email?.toLowerCase() || '';
      const normalizedUserEmail = normalizeGmailAddress(userEmail);
      
      return (userEmail === normalizedEmail || normalizedUserEmail === normalizedEmail) 
        && user.email_confirmed_at !== null;
    });
    
    // إذا وجد مستخدم غير مؤكد، يمكنه إعادة التسجيل
    const unconfirmedUser = users.find(user => {
      const userEmail = user.email?.toLowerCase() || '';
      const normalizedUserEmail = normalizeGmailAddress(userEmail);
      
      return (userEmail === normalizedEmail || normalizedUserEmail === normalizedEmail) 
        && user.email_confirmed_at === null;
    });
    
    // إذا وجد مستخدم غير مؤكد، نحذفه ليتمكن من إعادة التسجيل
    if (unconfirmedUser && !confirmedUser) {
      try {
        await supabase.auth.admin.deleteUser(unconfirmedUser.id);
        console.log(`Deleted unconfirmed user: ${unconfirmedUser.email}`);
      } catch (deleteError) {
        console.error("Error deleting unconfirmed user:", deleteError);
      }
      
      return new Response(
        JSON.stringify({ exists: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    return new Response(
      JSON.stringify({ exists: confirmedUser !== undefined }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", exists: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Gmail normalization helper function
function normalizeGmailAddress(email: string): string {
  if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
    return email.toLowerCase();
  }
  
  const [username, domain] = email.toLowerCase().split('@');
  const normalizedUsername = username.replace(/\./g, '').split('+')[0];
  return `${normalizedUsername}@${domain}`;
}
