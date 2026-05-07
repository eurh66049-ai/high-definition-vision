import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * تحويل الصوت إلى نص باستخدام Mistral Voxtral.
 * يستقبل ملف صوتي (multipart/form-data أو base64 JSON) ويعيد النص العربي.
 *
 * Docs: https://docs.mistral.ai/studio-api/audio/speech_to_text/offline_transcription
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      console.error("MISTRAL_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "MISTRAL_API_KEY غير مُهيأ في الخادم" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let audioBlob: Blob | null = null;
    let fileName = "audio.webm";
    let language = "ar"; // افتراضياً العربية

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // JSON body: { audio: "base64...", mimeType: "audio/webm", language?: "ar" }
      const body = await req.json();
      if (!body.audio) {
        return new Response(
          JSON.stringify({ error: "الحقل audio (base64) مفقود" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const base64 = String(body.audio).replace(/^data:[^;]+;base64,/, "");
      const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const mimeType = body.mimeType || "audio/webm";

      // استنتاج الامتداد من mimeType
      const extMap: Record<string, string> = {
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/mp4": "m4a",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
      };
      const ext = extMap[mimeType.split(";")[0]] || "webm";
      fileName = `audio.${ext}`;

      audioBlob = new Blob([binary], { type: mimeType });
      if (body.language) language = String(body.language);
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return new Response(
          JSON.stringify({ error: "الحقل file مفقود في multipart" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      audioBlob = file;
      fileName = file.name || "audio.webm";
      const formLang = form.get("language");
      if (formLang) language = String(formLang);
    } else {
      return new Response(
        JSON.stringify({ error: "نوع المحتوى غير مدعوم. استخدم application/json أو multipart/form-data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!audioBlob || audioBlob.size === 0) {
      return new Response(
        JSON.stringify({ error: "الملف الصوتي فارغ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[voice-transcribe] received audio: ${audioBlob.size} bytes, type=${audioBlob.type}, language=${language}`,
    );

    // بناء FormData لإرسالها إلى Mistral
    const mistralForm = new FormData();
    mistralForm.append("model", "voxtral-mini-latest");
    mistralForm.append("file", audioBlob, fileName);
    if (language) mistralForm.append("language", language);

    const mistralRes = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: mistralForm,
    });

    if (!mistralRes.ok) {
      const errText = await mistralRes.text();
      console.error("[voice-transcribe] Mistral API error", mistralRes.status, errText);

      if (mistralRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات. حاول بعد قليل." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (mistralRes.status === 401) {
        return new Response(
          JSON.stringify({ error: "مفتاح Mistral API غير صالح" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `خطأ من Mistral: ${mistralRes.status}`, details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await mistralRes.json();
    const text = result.text || result.transcription || "";

    console.log(`[voice-transcribe] success, text length=${text.length}`);

    return new Response(
      JSON.stringify({ text, language: result.language || language }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[voice-transcribe] unexpected error", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
