function encodePathSegment(value: string) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

export default async function handler(request: Request, context: any) {
  const SUPABASE_URL = "https://kydmyxsgyxeubhmqzrgo.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0";

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: "count=exact",
  };

  try {
    const urls: any[] = [];
    const existing = new Set<string>();

    // دالة مساعدة لإضافة URL بدون تكرار
    const addUrl = (item: any) => {
      if (!existing.has(item.url)) {
        existing.add(item.url);
        urls.push(item);
      }
    };

    // إضافة الصفحات الثابتة أولاً
    const staticPages = [
      { url: "https://kotobi.xyz/", changefreq: "daily", priority: 1.0 },
      { url: "https://kotobi.xyz/categories", changefreq: "weekly", priority: 0.9 },
      { url: "https://kotobi.xyz/authors", changefreq: "weekly", priority: 0.9 },
      { url: "https://kotobi.xyz/quotes", changefreq: "daily", priority: 0.8 },
      { url: "https://kotobi.xyz/upload-book", changefreq: "monthly", priority: 0.7 },
      { url: "https://kotobi.xyz/about-us", changefreq: "monthly", priority: 0.5 },
      { url: "https://kotobi.xyz/contact-us", changefreq: "monthly", priority: 0.5 },
      { url: "https://kotobi.xyz/donation", changefreq: "monthly", priority: 0.5 },
      { url: "https://kotobi.xyz/site-updates", changefreq: "weekly", priority: 0.5 },
      { url: "https://kotobi.xyz/privacy-policy", changefreq: "yearly", priority: 0.3 },
      { url: "https://kotobi.xyz/terms-of-service", changefreq: "yearly", priority: 0.3 },
    ];

    staticPages.forEach((page) => {
      addUrl({ ...page, lastmod: new Date().toISOString() });
    });

    // جلب جميع الكتب المعتمدة مع pagination لتجاوز حد 1000 صف
    let offset = 0;
    const limit = 1000;
    let hasMoreBooks = true;

    while (hasMoreBooks) {
      try {
        const booksRes = await fetch(
          `${SUPABASE_URL}/rest/v1/book_submissions?select=id,slug,reviewed_at,created_at&status=eq.approved&order=created_at.desc&offset=${offset}&limit=${limit}`,
          { headers },
        );

        if (booksRes.ok) {
          const books = await booksRes.json();
          console.log(`Fetched ${books.length} books at offset ${offset}`);

          for (const book of books) {
            const slug = book.slug || book.id;
            const bookUrl = `https://kotobi.xyz/book/${encodePathSegment(slug)}`;
            addUrl({
              url: bookUrl,
              lastmod: book.reviewed_at || book.created_at || new Date().toISOString(),
              changefreq: "monthly",
              priority: 0.8,
            });
          }

          hasMoreBooks = books.length === limit;
          offset += limit;
        } else {
          console.error("Error fetching books:", await booksRes.text());
          hasMoreBooks = false;
        }
      } catch (e) {
        console.error("Error fetching books for sitemap:", e);
        hasMoreBooks = false;
      }
    }

    // جلب جميع المؤلفين مع pagination
    offset = 0;
    let hasMoreAuthors = true;

    while (hasMoreAuthors) {
      try {
        const authorsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/authors?select=id,slug,name,created_at&order=created_at.desc&offset=${offset}&limit=${limit}`,
          { headers },
        );

        if (authorsRes.ok) {
          const authors = await authorsRes.json();
          console.log(`Fetched ${authors.length} authors at offset ${offset}`);

          for (const author of authors) {
            const authorPath = author.slug && author.slug.trim() !== "" ? author.slug : author.name;
            const authorUrl = `https://kotobi.xyz/author/${encodePathSegment(authorPath)}`;
            addUrl({
              url: authorUrl,
              lastmod: author.created_at || new Date().toISOString(),
              changefreq: "weekly",
              priority: 0.7,
            });
          }

          hasMoreAuthors = authors.length === limit;
          offset += limit;
        } else {
          console.error("Error fetching authors:", await authorsRes.text());
          hasMoreAuthors = false;
        }
      } catch (e) {
        console.error("Error fetching authors for sitemap:", e);
        hasMoreAuthors = false;
      }
    }

    // جلب التصنيفات
    try {
      let catOffset = 0;
      const catLimit = 1000;
      let hasMoreCategories = true;

      while (hasMoreCategories) {
        const categoriesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/categories?select=name,created_at&order=created_at.desc&offset=${catOffset}&limit=${catLimit}`,
          { headers },
        );

        if (!categoriesRes.ok) {
          console.error("Error fetching categories:", await categoriesRes.text());
          break;
        }

        const categories = await categoriesRes.json();
        for (const cat of categories) {
          const categoryUrl = `https://kotobi.xyz/category/${encodePathSegment(cat.name)}`;
          addUrl({
            url: categoryUrl,
            lastmod: cat.created_at || new Date().toISOString(),
            changefreq: "weekly",
            priority: 0.7,
          });
        }

        hasMoreCategories = categories.length === catLimit;
        catOffset += catLimit;
      }
    } catch (e) {
      console.error("Error fetching categories:", e);
    }

    console.log(`Total URLs in sitemap: ${urls.length}`);

    // تنظيف قيم XML
    const sanitizeXmlValue = (value: string) => {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    // إنشاء XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (url: any) => `  <url>
    <loc>${sanitizeXmlValue(url.url)}</loc>
    <lastmod>${new Date(url.lastmod || new Date()).toISOString()}</lastmod>
    <changefreq>${url.changefreq || "weekly"}</changefreq>
    <priority>${url.priority || 0.5}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);

    // Fallback sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kotobi.xyz/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://kotobi.xyz/categories</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kotobi.xyz/authors</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
}
