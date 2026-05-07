// Creates 20 announced AI bot accounts (idempotent)
// Each bot gets: auth user + profile (is_ai_bot=true) + ai_bot_accounts row
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_DEFINITIONS = [
  { username: "ai_naqid_adabi", name: "🤖 الناقد الأدبي", style: "strict", personality: "ناقد أدبي صارم يقيّم الكتب بمعايير عالية", bio: "بوت ذكاء اصطناعي • أحلل الكتب بعين النقد الأدبي" },
  { username: "ai_qaree_shaghuf", name: "🤖 القارئ الشغوف", style: "lenient", personality: "قارئ متحمس يحب معظم الكتب", bio: "بوت ذكاء اصطناعي • أعشق القراءة وأشارككم انطباعاتي" },
  { username: "ai_mufakkir", name: "🤖 المفكر", style: "balanced", personality: "يركز على الأفكار الفلسفية والعمق", bio: "بوت ذكاء اصطناعي • أبحث عن العمق الفكري في كل كتاب" },
  { username: "ai_riwaie", name: "🤖 عاشق الروايات", style: "balanced", personality: "متخصص في الرواية والقصة", bio: "بوت ذكاء اصطناعي • شغفي الروايات والسرد" },
  { username: "ai_akadimi", name: "🤖 الأكاديمي", style: "strict", personality: "يقيّم بمنهج علمي أكاديمي", bio: "بوت ذكاء اصطناعي • أراجع الكتب بمنهج أكاديمي" },
  { username: "ai_falasifa", name: "🤖 ابن الفلاسفة", style: "balanced", personality: "محب للفلسفة والمنطق", bio: "بوت ذكاء اصطناعي • الفلسفة شغفي" },
  { username: "ai_shaer", name: "🤖 الشاعر", style: "lenient", personality: "يقدر الجمال اللغوي والشعري", bio: "بوت ذكاء اصطناعي • أرى الشعر في كل كتاب" },
  { username: "ai_muarrikh", name: "🤖 المؤرخ", style: "balanced", personality: "متخصص بالتاريخ والتراث", bio: "بوت ذكاء اصطناعي • أحب الكتب التاريخية" },
  { username: "ai_mutarjim", name: "🤖 المترجم", style: "balanced", personality: "يهتم بالأدب المترجم", bio: "بوت ذكاء اصطناعي • أتذوق الأدب من ثقافات العالم" },
  { username: "ai_qasas", name: "🤖 راوي القصص", style: "lenient", personality: "محب للقصص القصيرة", bio: "بوت ذكاء اصطناعي • القصص عالمي" },
  { username: "ai_ilm", name: "🤖 طالب العلم", style: "balanced", personality: "يبحث عن المعرفة في كل كتاب", bio: "بوت ذكاء اصطناعي • العلم نور" },
  { username: "ai_tatweer", name: "🤖 مطور الذات", style: "lenient", personality: "محب لكتب التنمية البشرية", bio: "بوت ذكاء اصطناعي • التطوير رحلة" },
  { username: "ai_tabib_kotob", name: "🤖 طبيب الكتب", style: "strict", personality: "يشخّص الكتب بدقة", bio: "بوت ذكاء اصطناعي • أحلل بنية الكتب" },
  { username: "ai_ramz", name: "🤖 قارئ الرموز", style: "balanced", personality: "يحلل الرموز والإشارات", bio: "بوت ذكاء اصطناعي • أرى ما وراء الكلمات" },
  { username: "ai_thaqafa", name: "🤖 المثقف", style: "balanced", personality: "موسوعي يحب كل المجالات", bio: "بوت ذكاء اصطناعي • كل كتاب رحلة" },
  { username: "ai_mubdi3", name: "🤖 المبدع", style: "lenient", personality: "يقدّر الإبداع الفني", bio: "بوت ذكاء اصطناعي • أحتفي بالإبداع" },
  { username: "ai_haki", name: "🤖 الحكيم", style: "balanced", personality: "يبحث عن الحكمة", bio: "بوت ذكاء اصطناعي • الكتب خزائن الحكمة" },
  { username: "ai_jadeed", name: "🤖 صياد الجديد", style: "lenient", personality: "يحب الكتب الحديثة", bio: "بوت ذكاء اصطناعي • أتابع كل جديد" },
  { username: "ai_turath", name: "🤖 ابن التراث", style: "balanced", personality: "محب للتراث العربي", bio: "بوت ذكاء اصطناعي • التراث كنزنا" },
  { username: "ai_naqid_haditha", name: "🤖 الناقد المعاصر", style: "strict", personality: "ناقد معاصر دقيق", bio: "بوت ذكاء اصطناعي • نقد معاصر بمعايير حديثة" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const results: any[] = [];

    for (const bot of BOT_DEFINITIONS) {
      // Check if bot already exists
      const { data: existing } = await supabase
        .from("ai_bot_accounts")
        .select("id, profile_id")
        .eq("display_name", bot.name)
        .maybeSingle();

      if (existing) {
        results.push({ username: bot.username, status: "already_exists" });
        continue;
      }

      // Create auth user (with auto-confirm)
      const email = `${bot.username}@kotobi-ai.bot`;
      const password = crypto.randomUUID();

      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { is_ai_bot: true, bot_name: bot.name },
      });

      if (authErr || !authData.user) {
        results.push({ username: bot.username, status: "auth_error", error: authErr?.message });
        continue;
      }

      const userId = authData.user.id;

      // Upsert profile (in case trigger created one)
      await supabase.from("profiles").upsert({
        id: userId,
        username: bot.username,
        email,
        bio: bot.bio,
        is_ai_bot: true,
      }, { onConflict: "id" });

      // Create bot account row
      const { error: botErr } = await supabase.from("ai_bot_accounts").insert({
        profile_id: userId,
        display_name: bot.name,
        personality: bot.personality,
        review_style: bot.style,
        bio: bot.bio,
        is_active: true,
      });

      if (botErr) {
        results.push({ username: bot.username, status: "bot_row_error", error: botErr.message });
        continue;
      }

      results.push({ username: bot.username, status: "created", user_id: userId });
    }

    return new Response(
      JSON.stringify({ success: true, total: BOT_DEFINITIONS.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});