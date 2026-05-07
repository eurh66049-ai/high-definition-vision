import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  user_id?: string;
  title: string;
  message: string;
  target_url?: string;
  type?: string;
  // Allow sending to all subscribers
  send_to_all?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error("OneSignal keys not configured");
      return new Response(
        JSON.stringify({ error: "OneSignal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: NotificationPayload = await req.json();
    const { user_id, title, message, target_url, type, send_to_all } = payload;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OneSignal] Sending push: ${title} | to_all=${!!send_to_all} | user=${user_id || 'N/A'}`);

    // Build OneSignal notification payload
    const onesignalPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { ar: title, en: title },
      contents: { ar: message, en: message },
      target_channel: "push",
      chrome_web_icon: "https://kotobi.xyz/lovable-uploads/5882b036-f2e2-4fec-bc07-9ee97960056a.png",
      chrome_web_badge: "https://kotobi.xyz/favicon.png",
    };

    if (send_to_all) {
      // Send to ALL subscribed users
      onesignalPayload.included_segments = ["Subscribed Users"];
    } else if (user_id) {
      // Target specific user by external_id
      onesignalPayload.include_aliases = { external_id: [user_id] };
      onesignalPayload.target_channel = "push";
    } else {
      return new Response(
        JSON.stringify({ error: "Must provide user_id or send_to_all=true" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add URL if provided
    if (target_url) {
      const fullUrl = target_url.startsWith("http")
        ? target_url
        : `https://kotobi.xyz${target_url}`;
      onesignalPayload.url = fullUrl;
      onesignalPayload.web_url = fullUrl;
    }

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(onesignalPayload),
    });

    const result = await response.json();

    // Check for errors in the response
    const hasErrors = result.errors && 
      (Array.isArray(result.errors) ? result.errors.length > 0 : Object.keys(result.errors).length > 0);

    if (!response.ok || hasErrors) {
      console.error("[OneSignal] API error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "OneSignal delivery issue", 
          details: result,
          recipients: result.recipients || 0,
        }),
        { status: response.ok ? 200 : response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OneSignal] Push sent successfully: recipients=${result.recipients}, id=${result.id}`);

    return new Response(
      JSON.stringify({ success: true, onesignal_id: result.id, recipients: result.recipients }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OneSignal] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
