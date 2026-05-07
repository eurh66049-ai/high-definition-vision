import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
]);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sanitizeFileName = (name: string) => {
  const withoutPath = name.split(/[\\/]/).pop() || "cover.jpg";
  const cleaned = withoutPath
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  return cleaned || "cover.jpg";
};

const extensionFromContentType = (contentType: string, fileName: string) => {
  const currentExt = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
  if (currentExt && ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(currentExt)) {
    return currentExt;
  }

  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/bmp") return "bmp";
  if (contentType === "image/svg+xml") return "svg";
  return "jpg";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return json({ error: "يجب تسجيل الدخول قبل رفع صورة الغلاف" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "إعدادات Supabase غير مكتملة" }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ error: "جلسة المستخدم غير صالحة، يرجى تسجيل الدخول من جديد" }, 401);
    }

    const { fileName, contentType, base64Data, folder = "covers" } = await req.json();

    if (typeof fileName !== "string" || typeof contentType !== "string" || typeof base64Data !== "string") {
      return json({ error: "بيانات صورة الغلاف غير مكتملة" }, 400);
    }

    const normalizedContentType = contentType.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(normalizedContentType)) {
      return json({ error: "نوع صورة الغلاف غير مدعوم" }, 415);
    }

    const base64 = base64Data.includes(",") ? base64Data.split(",").pop() || "" : base64Data;
    const binary = atob(base64);

    if (binary.length === 0) {
      return json({ error: "صورة الغلاف فارغة" }, 400);
    }

    if (binary.length > MAX_COVER_BYTES) {
      return json({ error: "حجم صورة الغلاف كبير جداً. الحد الأقصى 5MB" }, 413);
    }

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const safeName = sanitizeFileName(fileName);
    const ext = extensionFromContentType(normalizedContentType, safeName);
    const baseName = safeName.replace(/\.[^.]+$/, "") || "cover";
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") || "covers";
    const path = `${safeFolder}/${userData.user.id}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${ext}`;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("book-covers")
      .upload(path, bytes, {
        cacheControl: "31536000",
        contentType: normalizedContentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Book cover upload failed:", uploadError);
      return json({ error: uploadError.message || "فشل رفع صورة الغلاف" }, 500);
    }

    const { data: publicData } = adminClient.storage
      .from("book-covers")
      .getPublicUrl(uploadData.path);

    return json({ path: uploadData.path, publicUrl: publicData.publicUrl });
  } catch (error) {
    console.error("upload-book-cover error:", error);
    return json({ error: error instanceof Error ? error.message : "فشل رفع صورة الغلاف" }, 500);
  }
});
