import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Convert a PEM-encoded key to base64url (raw key bytes).
 * Handles both EC PRIVATE KEY (extracts 32-byte private key at offset 7)
 * and PUBLIC KEY (extracts 65-byte raw key at offset 26) PEM formats.
 * If the input is not PEM, returns it as-is (assumes already base64url).
 */
function pemToBase64url(pem: string, keyType: 'public' | 'private'): string {
  const trimmed = pem.trim();
  
  // If not PEM format, return as-is (already base64url)
  if (!trimmed.startsWith('-----BEGIN')) {
    return trimmed;
  }

  // Strip PEM headers and decode
  const base64Content = trimmed
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '');

  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  let rawBytes: Uint8Array;

  if (keyType === 'private') {
    // EC PRIVATE KEY DER: private key value (32 bytes) starts at offset 7
    // Structure: 30 77 02 01 01 04 20 [32 bytes private key] ...
    rawBytes = bytes.slice(7, 7 + 32);
  } else {
    // SubjectPublicKeyInfo DER: raw public key (65 bytes) starts at offset 26
    // Structure: 30 59 30 13 ... 03 42 00 [65 bytes raw EC point]
    rawBytes = bytes.slice(26, 26 + 65);
  }

  // Convert to base64url (no padding)
  const base64 = base64Encode(rawBytes);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKeyRaw = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKeyRaw = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKeyRaw || !vapidPrivateKeyRaw) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert PEM to base64url if needed
    const vapidPublicKey = pemToBase64url(vapidPublicKeyRaw, 'public');
    const vapidPrivateKey = pemToBase64url(vapidPrivateKeyRaw, 'private');

    console.log(`VAPID public key length: ${vapidPublicKey.length}, private key length: ${vapidPrivateKey.length}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, title, body, url, tag } = await req.json() as PushPayload;

    console.log(`Sending push notification to user ${userId}: ${title}`);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active subscriptions found for user");
      return new Response(
        JSON.stringify({ message: "No active subscriptions", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/lovable-uploads/5882b036-f2e2-4fec-bc07-9ee97960056a.png",
      badge: "/favicon.png",
      tag: tag || `kotobi-${Date.now()}`,
      data: { url: url || "/" }
    });

    let successCount = 0;
    let failedEndpoints: string[] = [];

    // Import web-push library
    const webpush = await import("web-push");
    
    webpush.setVapidDetails(
      "mailto:adileboura@gmail.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
        console.log(`Push sent successfully to endpoint: ${sub.endpoint.slice(0, 50)}...`);
      } catch (error: any) {
        console.error(`Failed to send to endpoint: ${error.message}`);
        
        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedEndpoints.push(sub.endpoint);
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("endpoint", sub.endpoint);
        }
      }
    }

    console.log(`Push notifications sent: ${successCount}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: subscriptions.length,
        failed: failedEndpoints.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
