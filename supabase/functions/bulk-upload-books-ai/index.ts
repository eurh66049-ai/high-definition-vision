// Edge function: bulk-upload-books-ai
// يستقبل كتابًا واحدًا { book } أو دفعة { books }
// يستنتج البيانات عبر Mistral AI، يرفع الغلاف وملف PDF إلى Supabase Storage، ثم ينشر مباشرة ككتاب approved

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

function countPdfPagesByRegex(pdfBytes: Uint8Array): number | null {
  try {
    const decoder = new TextDecoder("latin1");
    const chunkSize = 1024 * 1024;
    let carry = "";
    let count = 0;

    for (let offset = 0; offset < pdfBytes.length; offset += chunkSize) {
      const text = carry + decoder.decode(pdfBytes.slice(offset, Math.min(offset + chunkSize, pdfBytes.length)));
      count += text.match(/\/Type\s*\/Page\b/g)?.length || 0;
      carry = text.slice(-64);
    }

    return count > 0 ? count : null;
  } catch {
    return null;
  }
}

async function countPdfPagesWithMupdf(pdfBytes: Uint8Array): Promise<number | null> {
  let doc: any = null;
  try {
    const mupdf: any = await import("https://esm.sh/mupdf@1.3.0");
    doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
    const count = typeof doc.countPages === "function" ? doc.countPages() : null;
    return typeof count === "number" && count > 0 ? count : null;
  } catch (e) {
    console.warn("[AI Bulk] فشل حساب الصفحات عبر MuPDF:", (e as Error)?.message);
    return null;
  } finally {
    try { doc?.destroy?.(); } catch { /* ignore */ }
  }
}

// حساب عدد صفحات PDF فعليًا من البايتات بعدة طرق حتى لا يفشل الكتاب بسبب اختلاف بنية PDF
async function computePdfPageCount(pdfBytes: Uint8Array): Promise<number | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
    const count = pdfDoc.getPageCount();
    return count > 0 ? count : null;
  } catch (e) {
    console.warn("[AI Bulk] فشل حساب عدد صفحات PDF:", (e as Error)?.message);
  }

  const mupdfCount = await countPdfPagesWithMupdf(pdfBytes);
  if (mupdfCount) return mupdfCount;

  const regexCount = countPdfPagesByRegex(pdfBytes);
  if (regexCount) {
    console.log(`[AI Bulk] 📄 تم حساب الصفحات بطريقة احتياطية: ${regexCount}`);
    return regexCount;
  }

  return null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InputBook {
  title: string;
  cover_image_url?: string;
  book_file_url: string;
  user_email?: string;
}

interface AIBookMeta {
  author: string;
  category: string;
  description: string;
  language: string;
  publication_year?: number | null;
  page_count?: number | null;
  publisher?: string | null;
  subtitle?: string | null;
  author_bio?: string | null;
  clean_title?: string | null;
}

interface BookResult {
  success: boolean;
  retryable?: boolean;
  error?: string;
  id?: string;
  title?: string;
  page_count?: number | null;
  cover_image_url?: string | null;
  book_file_url?: string | null;
  cover_uploaded_to_supabase?: boolean;
  book_uploaded_to_supabase?: boolean;
}

interface ArchiveDiscoveryBook extends InputBook {
  identifier: string;
  details_url: string;
}

const ALLOWED_CATEGORIES = [
  "novels", "history", "philosophy", "religion", "science", "literature",
  "poetry", "biography", "psychology", "politics", "economics", "children",
  "education", "technology", "art", "language", "medicine", "law", "other",
];

const ALLOWED_LANGUAGES = ["ar", "en", "fr", "es", "de", "tr", "other"];
const MISTRAL_BATCH_SIZE = 10;        // عدد الكتب المرسلة دفعة لـ Mistral (10 كتب لكل دفعة)
const PROCESS_CONCURRENCY = 10;       // عدد الكتب المعالجة بالتوازي (10 كتب بالضبط)
const FETCH_TIMEOUT = 75_000;
const MAX_FETCH_RETRIES = 3;
const MAX_MISTRAL_RETRIES = 4;
const STORAGE_BASE = () => `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function normalizeDownloadUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  // لا نعيد ترميز الروابط المرمزة مسبقًا حتى لا تتحول %20 إلى %2520 وتفشل روابط archive.org
  return /%[0-9a-f]{2}/i.test(trimmed) ? trimmed : encodeURI(trimmed);
}

function cleanBookDownloadUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/https?:\/\/.+?\.(?:pdf|docx?|txt)(?:\?[^\s]*)?/i);
  return (match?.[0] || trimmed).trim();
}

function normalizeDuplicateTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\u0600-\u06FFa-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// تنظيف عنوان الكتاب: إزالة الأرقام، الشرطات السفلية والعادية، اللاحقات الشائعة،
// واسم المؤلف إن ظهر داخل العنوان. النتيجة: اسم الكتاب وحده فقط.
function cleanBookTitle(rawTitle: string, author?: string | null): string {
  let t = String(rawTitle || "").trim();

  // إزالة لاحقات archive.org الشائعة
  t = t.replace(/\s*[-_]\s*kotobi\s*$/i, "");
  t = t.replace(/\.(pdf|docx?|txt|epub)\s*$/i, "");

  // إزالة أنماط "اسم الكتاب - اسم المؤلف" أو "اسم الكتاب | اسم المؤلف"
  if (author && author !== "غير معروف") {
    const authorEsc = author.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // إزالة المؤلف بعد فاصل
    t = t.replace(new RegExp(`\\s*[-_|،,]+\\s*(?:تأليف|للكاتب|للمؤلف|بقلم)?\\s*${authorEsc}\\s*$`, "i"), "");
    t = t.replace(new RegExp(`^\\s*(?:تأليف|للكاتب|للمؤلف|بقلم)?\\s*${authorEsc}\\s*[-_|،,]+\\s*`, "i"), "");
    // إزالة المؤلف إن ظهر داخل العنوان كنص متبقٍ
    t = t.replace(new RegExp(`\\s*${authorEsc}\\s*`, "gi"), " ");
  }

  // إزالة كلمات تأليف/بقلم وما يليها من اسم
  t = t.replace(/\s*(?:تأليف|بقلم|للكاتب|للمؤلف)\s*[:：-]?\s*[^-_|،,]+$/i, "");

  // إزالة الأرقام والشرطات السفلية والشرطات العادية
  t = t.replace(/[\d_\-]+/g, " ");

  // تطبيع المسافات
  t = t.replace(/\s+/g, " ").trim();

  // fallback إن أصبح فارغًا
  if (!t) t = String(rawTitle || "").replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

function extractArchiveIdentifierFromUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl.split("#")[0]);
    if (!url.hostname.includes("archive.org")) return null;
    const match = url.pathname.match(/\/(?:details|download|stream|embed)\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    const match = rawUrl.match(/archive\.org\/(?:details|download|stream|embed)\/([^/#?]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

async function refineArchiveQueryWithMistral(userQuery: string): Promise<string> {
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  if (!MISTRAL_API_KEY) return userQuery;

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.2,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: "حوّل طلب المستخدم إلى استعلام بحث صالح لـ archive.org Lucene للعثور على كتب PDF. أعد الاستعلام فقط بدون شرح.",
          },
          { role: "user", content: userQuery },
        ],
      }),
    });
    if (!response.ok) return userQuery;
    const data = await response.json();
    return String(data.choices?.[0]?.message?.content || userQuery).trim().replace(/^['\"]|['\"]$/g, "") || userQuery;
  } catch (error) {
    console.warn("[AI Bulk] فشل تحسين بحث archive.org عبر Mistral:", (error as Error)?.message);
    return userQuery;
  }
}

function buildArchiveFirstPageImageUrl(bookUrl: string): string | null {
  try {
    const url = new URL(normalizeDownloadUrl(bookUrl));
    if (!url.hostname.includes("archive.org")) return null;
    const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
    if (parts[0] !== "download" || parts.length < 3) return null;

    const identifier = parts[1];
    const filename = parts.slice(2).join("/");
    if (!filename.toLowerCase().endsWith(".pdf")) return null;

    let stem = filename.replace(/\.pdf$/i, "");
    stem = stem.replace(/_text$/i, "");
    const zipName = `${stem}_jp2.zip`;
    const folderName = `${stem}_jp2`;
    const firstPagePath = `${folderName}/${stem}_0000.jp2`;

    return `${url.origin}/download/${encodeURIComponent(identifier)}/${encodeURIComponent(zipName)}/${encodeURIComponent(firstPagePath)}&ext=jpg`;
  } catch {
    return null;
  }
}

function chooseBestArchivePdf(files: any[]): string | null {
  const pdfs = files
    .filter((file) => typeof file?.name === "string" && /\.pdf$/i.test(file.name))
    .map((file) => ({
      name: String(file.name),
      size: Number.parseInt(String(file.size || "0"), 10) || 0,
    }))
    .filter((file) => file.name && !/_abbyy\.gz$/i.test(file.name));

  if (!pdfs.length) return null;

  const preferred = pdfs
    .filter((file) => !/(?:_bw|_text|_djvu)\.pdf$/i.test(file.name))
    .sort((a, b) => b.size - a.size);

  return (preferred[0] || pdfs.sort((a, b) => b.size - a.size)[0]).name;
}

// تحقق من أن العنوان حقيقي وليس مجرد معرّف/أرقام/تاريخ
function isRealBookTitle(rawTitle: string | null | undefined, identifier: string): boolean {
  const title = String(rawTitle || "").trim();
  if (!title) return false;
  // طول معقول
  if (title.length < 3) return false;
  // يجب أن يحتوي على حروف (عربية أو لاتينية) — ليس مجرد أرقام/رموز
  const letterCount = (title.match(/[\u0600-\u06FF\u0750-\u077Fa-zA-Z]/g) || []).length;
  if (letterCount < 3) return false;
  // لا يساوي المعرّف (تطبيع: حذف رموز وفواصل)
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-\.]+/g, "");
  if (norm(title) === norm(identifier)) return false;
  // أنماط شائعة للعناوين الفارغة: تاريخ مثل 20220728_1119 أو scan_xxxx
  if (/^\d{6,}/.test(title.replace(/\s+/g, ""))) return false;
  if (/^(?:scan|untitled|unknown|book|file|document|pdf|test|new|temp)[\s_\-0-9]*$/i.test(title)) return false;
  if (/^[\d\s_\-\.\/]+$/.test(title)) return false;
  return true;
}

async function getArchiveBookDownload(identifier: string): Promise<{ title: string; book_file_url: string } | null> {
  const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
    headers: { "User-Agent": "KotobiAIBulkUploader/3.1", Accept: "application/json" },
  });
  if (!metaRes.ok) return null;

  const meta = await metaRes.json();
  const fileName = chooseBestArchivePdf(Array.isArray(meta?.files) ? meta.files : []);
  if (!fileName) return null;

  const rawTitle = String(meta?.metadata?.title || "").trim();
  // ❌ تجاهل الكتب التي ليس لها اسم حقيقي على صفحة archive
  if (!isRealBookTitle(rawTitle, identifier)) {
    console.log(`[AI Bulk] ⏭️  تخطي ${identifier} — لا يوجد اسم كتاب حقيقي (title="${rawTitle}")`);
    return null;
  }

  return {
    title: rawTitle,
    book_file_url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURI(fileName)}`,
  };
}

async function discoverArchiveBooks(query: string, limit: number, supabaseClient: any): Promise<ArchiveDiscoveryBook[]> {
  // غير محدود فعليًا — نحصر فقط بـ 5000 لتفادي إغلاق الـ edge function
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const hardCap = Math.min(safeLimit, 5000);
  const rawQuery = query.trim();
  const hasArchiveSyntax = /\b(?:collection|mediatype|format|language|title|creator|subject)\s*:/i.test(rawQuery);
  let archiveQuery = hasArchiveSyntax ? rawQuery : await refineArchiveQueryWithMistral(rawQuery);
  if (!/mediatype\s*:/i.test(archiveQuery)) archiveQuery = `(${archiveQuery}) AND mediatype:texts`;
  if (!/format\s*:/i.test(archiveQuery)) archiveQuery = `(${archiveQuery}) AND format:PDF`;
  // فرض اللغة العربية فقط — جلب جميع الكتب العربية بدون أي فلتر زمني
  if (!/language\s*:/i.test(archiveQuery)) archiveQuery = `(${archiveQuery}) AND language:(Arabic OR ara OR ar OR العربية)`;
  const rawArchiveQuery = /mediatype\s*:/i.test(rawQuery)
    ? rawQuery
    : `(${rawQuery}) AND mediatype:texts AND format:PDF AND language:(Arabic OR ara OR ar OR العربية)`;
  const queryCandidates = [archiveQuery];
  if (rawArchiveQuery !== archiveQuery) queryCandidates.push(rawArchiveQuery);

  const existingIdentifiers = new Set<string>();
  const existingTitles = new Set<string>();
  const { data: existingRows } = await supabaseClient
    .from("book_submissions")
    .select("title, source_book_file_url, book_file_url")
    .eq("status", "approved")
    .limit(1000);

  for (const row of existingRows || []) {
    const sourceIdentifier = extractArchiveIdentifierFromUrl(row.source_book_file_url) || extractArchiveIdentifierFromUrl(row.book_file_url);
    if (sourceIdentifier) existingIdentifiers.add(sourceIdentifier);
    const normalizedTitle = normalizeDuplicateTitle(String(row.title || ""));
    if (normalizedTitle) existingTitles.add(normalizedTitle);
  }

  const discovered: ArchiveDiscoveryBook[] = [];

  // عدد صفحات أكبر بكثير لدعم الجلب غير المحدود
  const MAX_PAGES = Math.max(5, Math.ceil(hardCap / 100) + 5);

  for (const currentArchiveQuery of queryCandidates) for (let page = 1; page <= MAX_PAGES && discovered.length < hardCap; page++) {
    const searchUrl = new URL("https://archive.org/advancedsearch.php");
    searchUrl.searchParams.set("q", currentArchiveQuery);
    searchUrl.searchParams.append("fl[]", "identifier");
    searchUrl.searchParams.append("fl[]", "title");
    searchUrl.searchParams.append("fl[]", "creator");
    searchUrl.searchParams.set("rows", "100");
    searchUrl.searchParams.set("page", String(page));
    searchUrl.searchParams.set("output", "json");

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { "User-Agent": "KotobiAIBulkUploader/3.1", Accept: "application/json" },
    });
    if (!searchRes.ok) throw new Error(`archive.org HTTP ${searchRes.status}`);

    const searchData = await searchRes.json();
    const items = Array.isArray(searchData?.response?.docs) ? searchData.response.docs : [];
    if (!items.length) break;

    for (const item of items) {
      if (discovered.length >= hardCap) break;
      const identifier = String(item?.identifier || "").trim();
      if (!identifier || existingIdentifiers.has(identifier)) continue;

      // ❌ تخطي مبكر إذا لم يوجد عنوان حقيقي في نتيجة البحث
      const searchTitle = String(Array.isArray(item.title) ? item.title[0] : item.title || "").trim();
      if (!isRealBookTitle(searchTitle, identifier)) {
        existingIdentifiers.add(identifier);
        continue;
      }

      const direct = await getArchiveBookDownload(identifier);
      if (!direct?.book_file_url) {
        existingIdentifiers.add(identifier);
        continue;
      }

      // ✅ الاسم النهائي يأتي من صفحة الكتاب نفسها (metadata.title) — وقد تحققنا منه أعلاه
      const cleanedTitle = cleanBookTitle(direct.title);
      // تحقق ثانٍ بعد التنظيف — قد يصبح فارغًا
      if (!isRealBookTitle(cleanedTitle, identifier)) {
        existingIdentifiers.add(identifier);
        continue;
      }
      const normalizedTitle = normalizeDuplicateTitle(cleanedTitle);
      if (normalizedTitle && existingTitles.has(normalizedTitle)) continue;

      discovered.push({
        identifier,
        details_url: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        title: cleanedTitle,
        book_file_url: direct.book_file_url,
      });
      existingIdentifiers.add(identifier);
      if (normalizedTitle) existingTitles.add(normalizedTitle);
    }
  }

  return discovered;
}

function generateSlug(title: string, author?: string): string {
  const clean = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^\u0600-\u06FF\u0750-\u077Fa-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  const titlePart = clean(title);
  const authorPart = author ? clean(author) : "";
  const combined = authorPart ? `${titlePart}-${authorPart}` : titlePart;
  return combined.substring(0, 150).replace(/-+$/g, "");
}

function cleanJsonContent(content: string): string {
  return content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeMeta(meta: Partial<AIBookMeta> | undefined, title: string): AIBookMeta {
  const category = ALLOWED_CATEGORIES.includes(String(meta?.category || ""))
    ? String(meta?.category)
    : "other";
  const language = ALLOWED_LANGUAGES.includes(String(meta?.language || ""))
    ? String(meta?.language)
    : "ar";

  // تنظيف اسم المؤلف ورفض القيم العامة الفارغة
  let author = meta?.author?.toString().trim() || "";
  const invalidAuthors = ["", "غير معروف", "مجهول", "unknown", "n/a", "null", "غير محدد", "-"];
  if (invalidAuthors.includes(author.toLowerCase()) || author.length < 2) {
    author = "غير معروف";
  }

  return {
    author,
    category,
    description:
      meta?.description?.toString().trim() ||
      `كتاب ${title} متاح للقراءة والتحميل عبر منصة كتبي.`,
    language,
    publication_year: typeof meta?.publication_year === "number" ? meta.publication_year : null,
    page_count: typeof meta?.page_count === "number" ? meta.page_count : null,
    publisher: meta?.publisher?.toString().trim() || null,
    subtitle: meta?.subtitle?.toString().trim() || null,
    author_bio: meta?.author_bio?.toString().trim() || null,
    clean_title: meta?.clean_title?.toString().trim() || null,
  };
}

async function fetchWithRetry(url: string, accept: string, retryCount = 0): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const requestUrl = normalizeDownloadUrl(url);

  try {
    const response = await fetch(requestUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KotobiAIBulkUploader/3.0)",
        Accept: accept,
        "Cache-Control": "no-cache",
        Referer: "https://archive.org/",
      },
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (retryCount < MAX_FETCH_RETRIES) {
      await wait(1_500 * Math.pow(2, retryCount));
      return fetchWithRetry(url, accept, retryCount + 1);
    }
    throw error;
  }
}

async function downloadAndUploadImage(
  url: string,
  supabaseClient: any,
): Promise<string | null> {
  if (!url?.trim() || !isValidUrl(url.trim())) return null;

  try {
    let processedUrl = url.trim();
    if (processedUrl.includes("archive.org") && processedUrl.includes("BookReader")) {
      processedUrl = processedUrl.includes("scale=")
        ? processedUrl.replace(/scale=\d+/, "scale=4")
        : processedUrl + "&scale=4";
    }

    const response = await fetchWithRetry(processedUrl, "image/jpeg, image/png, image/webp, image/*");
    const blob = await response.blob();
    if (blob.size <= 1000 || !blob.type.startsWith("image/")) return null;

    let ext = "jpg";
    if (blob.type.includes("png")) ext = "png";
    else if (blob.type.includes("webp")) ext = "webp";

    const fileName = `covers/${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
    const { error } = await supabaseClient.storage
      .from("book-covers")
      .upload(fileName, blob, {
        contentType: blob.type || "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) throw error;
    return `${STORAGE_BASE()}/book-covers/${fileName}`;
  } catch (error) {
    console.error("[AI Bulk] فشل رفع الغلاف:", error);
    return null;
  }
}

async function downloadAndUploadBook(
  url: string,
  supabaseClient: any,
): Promise<{ url: string | null; fileSize: number | null; extension: string; contentType: string; pageCount: number | null; pdfBytes: Uint8Array | null; error?: string }> {
  const cleanedUrl = cleanBookDownloadUrl(url || "");
  if (!cleanedUrl || !isValidUrl(cleanedUrl)) {
    return { url: null, fileSize: null, extension: "pdf", contentType: "application/pdf", pageCount: null, pdfBytes: null, error: "رابط ملف الكتاب غير صالح" };
  }

  try {
    const response = await fetchWithRetry(cleanedUrl, "application/pdf, application/octet-stream, */*");
    const blob = await response.blob();
    if (blob.size <= 1000) throw new Error("ملف الكتاب فارغ أو صغير جدًا");

    const contentType = blob.type?.includes("pdf") ? "application/pdf" : blob.type || "application/pdf";
    let ext = "pdf";
    if (contentType.includes("docx")) ext = "docx";
    else if (contentType.includes("msword")) ext = "doc";

    let pageCount: number | null = null;
    let pdfBytes: Uint8Array | null = null;
    if (ext === "pdf") {
      const buf = await blob.arrayBuffer();
      pdfBytes = new Uint8Array(buf);
      pageCount = await computePdfPageCount(pdfBytes);
    }

    const fileName = `books/${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
    const { error } = await supabaseClient.storage
      .from("book-files")
      .upload(fileName, blob, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) throw error;
    return {
      url: `${STORAGE_BASE()}/book-files/${fileName}`,
      fileSize: blob.size,
      extension: ext,
      contentType,
      pageCount,
      pdfBytes,
    };
  } catch (error) {
    console.error("[AI Bulk] فشل رفع ملف الكتاب:", error);
    return { url: null, fileSize: null, extension: "pdf", contentType: "application/pdf", pageCount: null, pdfBytes: null, error: error instanceof Error ? error.message : "فشل رفع ملف الكتاب" };
  }
}

// توليد صورة غلاف من الصفحة الأولى لـ PDF باستخدام mupdf
async function generateCoverFromPdf(
  pdfBytes: Uint8Array,
  supabaseClient: any,
): Promise<string | null> {
  try {
    const mupdf: any = await import("https://esm.sh/mupdf@1.3.0");
    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
    const page = doc.loadPage(0);
    // عرض الصفحة كـ PNG بدقة عالية (scale 1.5)
    const pixmap = page.toPixmap(
      [1.5, 0, 0, 1.5, 0, 0],
      mupdf.ColorSpace.DeviceRGB,
      false,
      true,
    );
    const pngBytes: Uint8Array = pixmap.asPNG();
    pixmap.destroy?.();
    page.destroy?.();
    doc.destroy?.();

    if (!pngBytes || pngBytes.byteLength < 1000) {
      console.warn("[AI Bulk] صورة الغلاف المولدة صغيرة جدًا");
      return null;
    }

    const blob = new Blob([pngBytes], { type: "image/png" });
    const fileName = `covers/${Date.now()}_${Math.random().toString(36).slice(2, 11)}_p1.png`;
    const { error } = await supabaseClient.storage
      .from("book-covers")
      .upload(fileName, blob, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw error;
    console.log("[AI Bulk] ✅ تم توليد الغلاف من الصفحة الأولى للـ PDF");
    return `${STORAGE_BASE()}/book-covers/${fileName}`;
  } catch (error) {
    console.error("[AI Bulk] فشل توليد الغلاف من PDF:", error);
    return null;
  }
}

async function inferBooksMetadata(books: InputBook[]): Promise<AIBookMeta[]> {
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY غير مهيأ");

  const systemPrompt = `أنت خبير ببليوغرافي عالمي من الطراز الأول، متخصص في الكتب العربية والمترجمة والتراث الإسلامي والأدب العالمي. لديك معرفة موسوعية بالمؤلفين الكلاسيكيين والمعاصرين.

مهمتك الحاسمة: لكل كتاب أرسله لك، حدّد المؤلف الحقيقي بدقة قصوى، واكتب وصفًا فريدًا حقيقيًا غير مكرر يخص هذا الكتاب تحديدًا — ليس قالبًا عامًا.

أرجع JSON فقط بالشكل: {"books":[...]}. لكل كتاب أعد نفس index الذي أرسلته.

الحقول المطلوبة لكل عنصر:
- index: رقم الكتاب كما أرسلته
- clean_title: **اسم الكتاب الصحيح فقط بالعربية الفصحى**، بدون اسم المؤلف، بدون أرقام، بدون شرطات سفلية (_)، بدون شرطات (-)، بدون لاحقات مثل "kotobi" أو ".pdf". إذا كان العنوان المُرسل يحتوي اسم المؤلف داخله (مثل "البخلاء - الجاحظ" أو "مقدمة ابن خلدون") فاستخرج اسم الكتاب فقط ("البخلاء"، "المقدمة"). إذا احتوى أرقامًا أو رموزًا غريبة أو كلمات إنجليزية دخيلة فاحذفها وأعد الاسم العربي الصحيح المعروف لهذا الكتاب.
- author: اسم المؤلف الحقيقي بالعربية الفصحى الكاملة (مثل: "نجيب محفوظ"، "ويليام شكسبير"، "غسان كنفاني"، "أبو حامد الغزالي").
    * إن كان العنوان مشهورًا (روايات، تراث، فلسفة، تاريخ، دين، أدب عالمي) فالمؤلف معروف قطعًا — أعد اسمه.
    * إن تضمن العنوان اسم المؤلف صراحة (مثل "ديوان المتنبي"، "مقدمة ابن خلدون") فاستخرجه.
    * إن تطابق العنوان مع كتاب مترجم عالمي، أعد اسم المؤلف الأصلي معرّبًا بأشهر صياغة عربية له.
    * "غير معروف" مسموح فقط للكتب المجهولة المؤلف فعلًا في التراث (نسبة < 3%).
- author_bio: نبذة عربية ثرية ومحددة عن هذا المؤلف بالذات (4-6 جمل): تواريخ الميلاد والوفاة، الجنسية، أبرز أعماله بالاسم، تياره الفكري أو الأدبي، مكانته. لا تعتمد قوالب عامة.
- category: واحد فقط من: ${ALLOWED_CATEGORIES.join(", ")}
- description: **وصف فريد وحقيقي وحصري لهذا الكتاب بالذات** بالعربية الفصحى (5-7 جمل). يجب أن يتضمن:
    1) موضوع الكتاب الفعلي ومضمونه الرئيسي (لا عبارات إنشائية).
    2) الأفكار أو الأحداث المحورية فيه.
    3) أسلوب الكاتب وما يميّز هذا العمل عن غيره.
    4) أهميته العلمية أو الأدبية ولماذا يستحق القراءة.
    ممنوع منعًا باتًا: "كتاب قيّم"، "متاح للقراءة"، "من أهم الكتب"، أو أي صياغة عامة قابلة للتطبيق على أي كتاب آخر. كل وصف يجب أن يكون مختلفًا تمامًا عن الباقي.
- language: واحد فقط من: ${ALLOWED_LANGUAGES.join(", ")}
- publication_year: سنة النشر الأصلية رقم أو null
- page_count: null دائمًا (سنحسبه من الملف الفعلي)
- publisher: دار النشر إن عُرفت أو null
- subtitle: العنوان الفرعي إن وُجد أو null

قواعد صارمة:
1. ابذل أقصى جهد للتعرف على المؤلف — لا تستسلم وتكتب "غير معروف" بسهولة.
2. كل وصف يجب أن يكون فريدًا 100% — لا تتكرر بين الكتب.
3. لا تخترع معلومات غير موجودة في معرفتك. إن لم تكن متأكدًا من تفصيلة، تجنبها.
4. لا تضف أي نص خارج JSON.
5. الأسماء والأوصاف بالعربية الفصحى دائمًا.`;

  const userPrompt = books
    .map((book, index) => `${index}. ${book.title}`)
    .join("\n");

  let lastError = "فشل Mistral AI";
  for (let attempt = 0; attempt <= MAX_MISTRAL_RETRIES; attempt++) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          temperature: 0.4,
          top_p: 0.95,
          max_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        lastError = response.status === 429
          ? "تم تجاوز حد الطلبات على Mistral، سيتم إعادة المحاولة تلقائيًا"
          : `فشل Mistral AI [${response.status}]: ${text}`;

        if ([408, 429, 500, 502, 503, 504].includes(response.status) && attempt < MAX_MISTRAL_RETRIES) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 6_000 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(lastError);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("لم يُرجع Mistral بيانات صالحة");

      const parsed = JSON.parse(cleanJsonContent(content));
      const items = Array.isArray(parsed?.books) ? parsed.books : [];
      const results = books.map((book, index) => {
        const found = items.find((item: any) => Number(item.index) === index) || items[index];
        return normalizeMeta(found, book.title);
      });

      // إعادة محاولة ثانية للكتب التي بقي مؤلفها "غير معروف" — قد ينجح Mistral مع طلب فردي مركز
      const unknownIndices = results
        .map((r, i) => (r.author === "غير معروف" ? i : -1))
        .filter((i) => i >= 0);

      if (unknownIndices.length > 0 && unknownIndices.length < books.length) {
        try {
          const retryBooks = unknownIndices.map((i) => books[i]);
          const retryResults = await retryAuthorLookup(retryBooks, MISTRAL_API_KEY);
          unknownIndices.forEach((origIdx, retryIdx) => {
            const retry = retryResults[retryIdx];
            if (retry && retry.author && retry.author !== "غير معروف") {
              results[origIdx] = {
                ...results[origIdx],
                author: retry.author,
                author_bio: retry.author_bio || results[origIdx].author_bio,
              };
            }
          });
        } catch (e) {
          console.warn("[AI Bulk] فشل البحث الثاني عن المؤلفين:", e);
        }
      }

      return results;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      if (attempt < MAX_MISTRAL_RETRIES) {
        await wait(5_000 * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw new Error(lastError);
}

// محاولة ثانية مركّزة للبحث عن أسماء المؤلفين فقط
async function retryAuthorLookup(
  books: InputBook[],
  apiKey: string,
): Promise<Array<{ author: string; author_bio: string | null }>> {
  const focusedPrompt = `أنت خبير ببليوغرافي. لكل عنوان كتاب أرسله لك، حدد اسم مؤلفه بدقة.
معظم الكتب لها مؤلفون معروفون. ابذل جهدًا حقيقيًا للتعرف عليه — فكّر في الأدب العربي الكلاسيكي والحديث، الأدب العالمي المترجم، التراث الإسلامي، الفلسفة، التاريخ.
استخدم "غير معروف" فقط للكتب المجهولة المؤلف فعلًا.

أرجع JSON: {"books":[{"index": 0, "author": "اسم المؤلف بالعربية", "author_bio": "نبذة 3-5 جمل"}]}`;

  const userPrompt = books.map((b, i) => `${i}. ${b.title}`).join("\n");

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      temperature: 0.05,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: focusedPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Mistral retry failed: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("لا توجد بيانات في إعادة المحاولة");

  const parsed = JSON.parse(cleanJsonContent(content));
  const items = Array.isArray(parsed?.books) ? parsed.books : [];
  return books.map((_, index) => {
    const found = items.find((item: any) => Number(item.index) === index) || items[index] || {};
    const author = (found.author || "").toString().trim();
    const bio = (found.author_bio || "").toString().trim();
    return {
      author: author && author.length >= 2 ? author : "غير معروف",
      author_bio: bio || null,
    };
  });
}

async function addWatermarkIfPossible(
  bookFileUrl: string,
  extension: string,
): Promise<{ url: string; pageCount: number | null }> {
  if (!bookFileUrl || extension !== "pdf") return { url: bookFileUrl, pageCount: null };

  let watermarkPageCount: number | null = null;

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/add-pdf-watermark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ pdfUrl: bookFileUrl, bucket: "book-files" }),
    });

    if (!response.ok) {
      console.warn(`[AI Bulk] add-pdf-watermark لم يرجع نتيجة ناجحة (${response.status})، سيتم استخدام PDF الأصلي`);
      return { url: bookFileUrl, pageCount: null };
    }
    const result = await response.json();
    if (typeof result?.pageCount === "number" && result.pageCount > 0) {
      watermarkPageCount = result.pageCount;
    }
    const candidateUrl = result?.success && result?.watermarkedUrl ? result.watermarkedUrl : bookFileUrl;
    return { url: candidateUrl, pageCount: watermarkPageCount };
  } catch (error) {
    console.error("[AI Bulk] فشل الشعار، سيتم استخدام PDF الأصلي:", error);
    return { url: bookFileUrl, pageCount: watermarkPageCount };
  }
}

async function upsertApprovedBook(book: InputBook, meta: AIBookMeta, supabaseClient: any): Promise<BookResult> {
  if (!book?.title || !book?.book_file_url) {
    return { success: false, title: book?.title, error: "الحقول المطلوبة: title, book_file_url" };
  }

  // تنظيف العنوان نهائيًا: نفضّل clean_title من Mistral، ثم تنظيف محلي يزيل الأرقام والشرطات واسم المؤلف
  const mistralCleanTitle = meta.clean_title?.trim();
  const localCleaned = cleanBookTitle(book.title, meta.author);
  const title = (mistralCleanTitle && mistralCleanTitle.length >= 2)
    ? cleanBookTitle(mistralCleanTitle, meta.author)
    : localCleaned;
  const sourceBookUrl = cleanBookDownloadUrl(book.book_file_url);
  const sourceCoverUrl = book.cover_image_url?.trim() || "";
  console.log(`[AI Bulk] معالجة: ${title} (الأصلي: ${book.title})`);

  // التحقق من تكرار الكتاب بناءً على المصدر أو العنوان المنظَّم
  const sourceIdentifier = extractArchiveIdentifierFromUrl(sourceBookUrl);
  const normalizedTitle = normalizeDuplicateTitle(title);
  try {
    // 1) فحص التكرار حسب معرّف archive.org داخل source_book_file_url
    if (sourceIdentifier) {
      const { data: bySource } = await supabaseClient
        .from("book_submissions")
        .select("id")
        .ilike("source_book_file_url", `%${sourceIdentifier}%`)
        .limit(1);
      if (Array.isArray(bySource) && bySource.length > 0) {
        return { success: false, title, error: "كتاب مكرر (نفس مصدر archive.org)" };
      }
    }
    // 2) فحص التكرار حسب العنوان المطابق
    if (title) {
      const { data: byTitle } = await supabaseClient
        .from("book_submissions")
        .select("id, title")
        .ilike("title", title)
        .limit(5);
      if (Array.isArray(byTitle)) {
        for (const row of byTitle) {
          if (normalizeDuplicateTitle(String(row.title || "")) === normalizedTitle) {
            return { success: false, title, error: "كتاب مكرر (نفس العنوان)" };
          }
        }
      }
    }
  } catch (_) { /* ignore */ }

  // إذا تم تمرير رابط غلاف، نحاول استخدامه. وإلا نولّده من الصفحة الأولى للـ PDF.
  const [providedCoverUrl, uploadedBook] = await Promise.all([
    sourceCoverUrl ? downloadAndUploadImage(sourceCoverUrl, supabaseClient) : Promise.resolve(null),
    downloadAndUploadBook(book.book_file_url, supabaseClient),
  ]);

  if (!uploadedBook.url) {
    return { success: false, title, error: uploadedBook.error || "فشل رفع ملف الكتاب إلى Supabase Storage" };
  }

  let coverUrl = providedCoverUrl;
  if (!coverUrl) {
    const archiveFirstPageUrl = buildArchiveFirstPageImageUrl(sourceBookUrl);
    if (archiveFirstPageUrl) {
      coverUrl = await downloadAndUploadImage(archiveFirstPageUrl, supabaseClient);
    }
  }
  if (!coverUrl && uploadedBook.pdfBytes) {
    coverUrl = await generateCoverFromPdf(uploadedBook.pdfBytes, supabaseClient);
  }
  if (!coverUrl) {
    return { success: false, title, error: "فشل توليد/رفع الغلاف (لا يوجد رابط ولا يمكن استخراجه من PDF)" };
  }

  const watermarkResult = await addWatermarkIfPossible(uploadedBook.url, uploadedBook.extension);
  const bookFileUrl = watermarkResult.url;
  const baseSlug = generateSlug(title, meta.author);
  const slug = baseSlug ? `${baseSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` : undefined;

  // عدد صفحات الكتاب: نفس ميزة "انشر كتابك" فقط — القيمة الراجعة من add-pdf-watermark.
  // عدد الصفحات: نفضّل ما يرجعه add-pdf-watermark، ثم نسقط على ما حسبناه محليًا من PDF.
  const finalPageCount = (watermarkResult.pageCount && watermarkResult.pageCount > 0)
    ? watermarkResult.pageCount
    : (uploadedBook.pageCount && uploadedBook.pageCount > 0 ? uploadedBook.pageCount : null);
  // لا نرفض الكتاب إذا لم تُحسب الصفحات — نتركها null ليتم تحديثها لاحقًا عبر update-books-page-count
  if (finalPageCount) {
    console.log(`[AI Bulk] 📄 العدد النهائي لصفحات "${title}": ${finalPageCount}`);
  } else {
    console.warn(`[AI Bulk] ⚠️ تعذر تحديد عدد صفحات "${title}"`);
  }

  const payload = {
    title,
    cover_image_url: coverUrl,
    book_file_url: bookFileUrl,
    source_cover_image_url: sourceCoverUrl,
    source_book_file_url: sourceBookUrl ? `${sourceBookUrl}#bulk-${crypto.randomUUID()}` : null,
    author: meta.author,
    category: meta.category,
    description: meta.description,
    language: meta.language,
    publication_year: meta.publication_year ?? null,
    page_count: finalPageCount,
    publisher: meta.publisher ?? null,
    subtitle: meta.subtitle ?? null,
    author_bio: meta.author_bio ?? null,
    display_type: "download_read",
    file_type: uploadedBook.contentType || "application/pdf",
    file_size: uploadedBook.fileSize,
    book_file_type: uploadedBook.extension || "pdf",
    status: "approved",
    user_email: book.user_email ?? "ai-bulk@kotobi.local",
    processing_status: "completed",
    rights_confirmation: true,
    reviewed_at: new Date().toISOString(),
    reviewer_notes: "تم نشره مباشرة بواسطة الرفع المجمع 2 عبر Mistral AI",
    ...(slug ? { slug } : {}),
  };

  const { data: inserted, error } = await supabaseClient
    .from("book_submissions")
    .insert(payload)
    .select("id, title")
    .single();

  if (error) {
    return { success: false, title, error: `فشل الإدراج: ${error.message}` };
  }

  return {
    success: true,
    id: inserted?.id,
    title,
    page_count: finalPageCount,
    cover_image_url: coverUrl,
    book_file_url: bookFileUrl,
    cover_uploaded_to_supabase: true,
    book_uploaded_to_supabase: true,
  };
}

async function processBooks(books: InputBook[], supabaseClient: any): Promise<BookResult[]> {
  const results: BookResult[] = new Array(books.length);

  for (let start = 0; start < books.length; start += MISTRAL_BATCH_SIZE) {
    const batch = books.slice(start, start + MISTRAL_BATCH_SIZE);

    let metas: AIBookMeta[];
    try {
      metas = await inferBooksMetadata(batch);
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل Mistral AI";
      batch.forEach((book, i) => {
        results[start + i] = { success: false, retryable: true, title: book.title, error: message };
      });
      continue;
    }

    // معالجة متوازية للكتب داخل الدفعة (تنزيل/رفع/إدراج)
    let cursor = 0;
    const workers: Promise<void>[] = [];
    const next = async () => {
      while (true) {
        const i = cursor++;
        if (i >= batch.length) return;
        try {
          results[start + i] = await upsertApprovedBook(batch[i], metas[i], supabaseClient);
        } catch (error) {
          results[start + i] = {
            success: false,
            title: batch[i].title,
            error: error instanceof Error ? error.message : "خطأ غير معروف",
          };
        }
      }
    };
    const concurrency = Math.min(PROCESS_CONCURRENCY, batch.length);
    for (let w = 0; w < concurrency; w++) workers.push(next());
    await Promise.all(workers);

    if (start + MISTRAL_BATCH_SIZE < books.length) await wait(800);
  }

  return results;
}

async function repairRecentAiBooks(supabaseClient: any): Promise<BookResult[]> {
  const { data: rows, error } = await supabaseClient
    .from("book_submissions")
    .select("title, cover_image_url, book_file_url, user_email")
    .eq("status", "approved")
    .eq("user_email", "ai-bulk@kotobi.local")
    .or("book_file_url.not.like.%/storage/v1/object/public/book-files/%,cover_image_url.not.like.%/storage/v1/object/public/book-covers/%")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];
  return processBooks(rows as InputBook[], supabaseClient);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();

    if (body?.repairRecentAiBooks) {
      const results = await repairRecentAiBooks(supabaseClient);
      return jsonResponse({
        success: true,
        summary: {
          total: results.length,
          success: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
        results,
      });
    }

    if (body?.discoverArchiveBooks) {
      const query = String(body.query || "").trim();
      if (!query) return jsonResponse({ success: false, error: "أدخل موضوع البحث" }, 400);

      const discoveredBooks = await discoverArchiveBooks(query, Number(body.limit) || 20, supabaseClient);
      if (body.upload === false) {
        return jsonResponse({ success: true, discovered: discoveredBooks.length, books: discoveredBooks });
      }

      const results = discoveredBooks.length ? await processBooks(discoveredBooks, supabaseClient) : [];
      const summary = {
        discovered: discoveredBooks.length,
        total: results.length,
        success: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        retryable: results.filter((r) => r.retryable).length,
      };

      return jsonResponse({ success: true, summary, results, retry_after_ms: summary.retryable ? 30_000 : 0 });
    }

    const books: InputBook[] = Array.isArray(body?.books)
      ? body.books
      : body?.book
        ? [body.book]
        : [];

    if (!books.length) {
      return jsonResponse({ success: false, error: "أرسل { book } أو { books: [...] }" }, 400);
    }

    const sanitized = books
      .map((book) => ({
        title: String(book.title || "").trim(),
        cover_image_url: String(book.cover_image_url || "").trim(),
        book_file_url: String(book.book_file_url || "").trim(),
        user_email: book.user_email,
      }))
      .filter((book) => book.title && book.book_file_url);

    if (!sanitized.length) {
      return jsonResponse({ success: false, error: "لا توجد كتب صالحة للمعالجة" }, 400);
    }

    const results = await processBooks(sanitized, supabaseClient);
    const summary = {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      retryable: results.filter((r) => r.retryable).length,
    };

    return jsonResponse({ success: true, summary, results, retry_after_ms: summary.retryable ? 30_000 : 0 });
  } catch (err) {
    console.error("[AI Bulk] خطأ:", err);
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : "خطأ غير معروف",
    }, 500);
  }
});
