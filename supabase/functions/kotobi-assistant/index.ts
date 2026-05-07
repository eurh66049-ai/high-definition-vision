import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kydmyxsgyxeubhmqzrgo.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0';

// تطبيع النص العربي للبحث الذكي
const normalizeArabic = (str: string) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
};

// تنظيف نص البحث للاستخدام مع ilike في قاعدة البيانات
const cleanupQueryForDb = (str: string) => {
  const cleaned = (str || '')
    .normalize('NFC')
    .replace(/[^\u0600-\u06FF0-9A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopWords = new Set([
    'كتاب', 'الكتاب', 'كتب',
    'مؤلف', 'المؤلف', 'مؤلفة', 'المؤلفة', 'مؤلفه', 'المؤلفه',
    'كاتب', 'الكاتب', 'كاتبة', 'الكاتبة',
    'مؤلفات', 'اعمال', 'كتابات',
    'اريد', 'ابغى', 'ابي', 'عايز', 'اعطني', 'ارسل', 'لي',
    'هل', 'يوجد', 'عندكم', 'ابحث', 'عن', 'اين', 'اجد', 'وين',
    'ماذا', 'ما', 'ل', 'لـ',
  ]);

  const parts = cleaned
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !stopWords.has(w));

  return parts.join(' ').trim();
};

// تحديد ما إذا كانت الرسالة تتعلق بالكتب أو البحث
const isBookRelatedMessage = (message: string): boolean => {
  const normalized = normalizeArabic(message);
  
  const bookKeywords = [
    'كتاب', 'كتب', 'قراء', 'قراءة', 'كاتب', 'مؤلف', 'مؤلفه', 'روايه', 'رواية',
    'اقترح', 'رشح', 'انصحني', 'افضل', 'تحميل', 'تنزيل', 'قصة', 'قصص',
    'شعر', 'ديوان', 'مسرحية', 'سيرة', 'تاريخ', 'فلسفة', 'علم', 'تنمية',
    'اطفال', 'أطفال', 'دين', 'اسلام', 'فقه', 'عقيدة'
  ];
  
  return bookKeywords.some(keyword => normalized.includes(normalizeArabic(keyword)));
};

// استخراج عدد الكتب المطلوب من الرسالة
const extractRequestedBookCount = (message: string): { count: number; explicit: boolean } => {
  const normalized = normalizeArabic(message);

  const normalizeDigits = (s: string) =>
    (s || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  const text = normalizeDigits(normalized);

  // أنماط للأرقام (بعد تطبيع الأرقام العربية-الهندية)
  const numberPatterns = [
    /(\d+)\s*(?:كتب|كتاب)/,
    /(?:اقترح|رشح|اعطني|ارسل)\s*(?:لي)?\s*(\d+)/,
    /(?:افضل|احسن|اهم)\s*(\d+)/,
    /(\d+)\s*(?:اقتراحات|توصيات)/,
  ];

  for (const pattern of numberPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const num = parseInt(match[1], 10);
      if (Number.isFinite(num) && num > 0 && num <= 50) return { count: num, explicit: true };
    }
  }

  // الأرقام بالكلمات العربية
  const arabicNumbers: Record<string, number> = {
    'واحد': 1,
    'واحده': 1,
    'واحدة': 1,
    'كتاب واحد': 1,
    'كتاب واحده': 1,
    'كتاب واحدة': 1,

    'اثنين': 2,
    'اتنين': 2,
    'كتابين': 2,

    'ثلاث': 3,
    'ثلاثة': 3,
    'تلات': 3,

    'اربع': 4,
    'اربعة': 4,
    'أربع': 4,
    'أربعة': 4,

    'خمس': 5,
    'خمسة': 5,

    'ست': 6,
    'ستة': 6,

    'سبع': 7,
    'سبعة': 7,

    'ثمان': 8,
    'ثمانية': 8,

    'تسع': 9,
    'تسعة': 9,

    'عشر': 10,
    'عشرة': 10,

    'عشرين': 20,
    'ثلاثين': 30,
  };

  for (const [word, num] of Object.entries(arabicNumbers)) {
    if (normalized.includes(normalizeArabic(word))) {
      return { count: num, explicit: true };
    }
  }

  // القيمة الافتراضية (غير صريحة)
  return { count: 6, explicit: false };
};

// استخراج استعلام البحث عن الكتب
const extractBookQuery = (
  message: string,
): { type: 'book' | 'author' | 'suggestions' | 'none'; query: string; count: number; isCountExplicit: boolean } => {
  const raw = (message || '').trim().normalize('NFC');
  const rawLower = raw.toLowerCase();
  const normalized = normalizeArabic(raw);
  const extractedCount = extractRequestedBookCount(message);

  // كلمات تدل على طلب اقتراحات
  const suggestionKeywords = ['اقترح', 'رشح', 'انصحني', 'افضل', 'اقتراحات', 'توصيات'];

  if (suggestionKeywords.some((k) => normalized.includes(normalizeArabic(k)))) {
    const topicMatch = rawLower.match(/(?:كتب\s+(?:عن|في)\s+)(.+)/);
    return {
      type: 'suggestions',
      query: (topicMatch?.[1] || '').trim(),
      count: extractedCount.count,
      isCountExplicit: extractedCount.explicit,
    };
  }

  // طلب مؤلف/كاتب
  const authorPatterns = [
    /(?:كتب|مؤلفات|اعمال|كتابات)\s+(?:الكاتب|الكاتبة|المؤلف|المؤلفة|المؤلفه|للكاتب|للمؤلف|للمؤلفة|للمؤلفه)?\s*(.+)/,
    /(?:اريد|ابغى|ابي|عايز|اعطني|ارسل لي|هل يوجد|هل عندكم)\s+(?:كتب|مؤلفات)\s+(.+)/,
    /(?:الكاتب|الكاتبة|كاتب|كاتبة|المؤلف|المؤلفة|المؤلفه|مؤلف|مؤلفة|مؤلفه)\s+(.+)/,
  ];

  for (const pattern of authorPatterns) {
    const match = rawLower.match(pattern);
    if (match) {
      return {
        type: 'author',
        query: (match[1] || '').trim(),
        count: extractedCount.count,
        isCountExplicit: extractedCount.explicit,
      };
    }
  }

  // طلب كتاب محدد
  const bookPatterns = [
    /(?:اريد|ابغى|ابي|عايز|اعطني|ارسل لي|هل يوجد|هل عندكم|ابحث عن|اين اجد|اين|وين)\s+(?:كتاب\s+)?(.+)/,
    /كتاب\s+(.+)/,
  ];

  for (const pattern of bookPatterns) {
    const match = rawLower.match(pattern);
    if (match) {
      return {
        type: 'book',
        query: (match[1] || '').trim(),
        count: extractedCount.count,
        isCountExplicit: extractedCount.explicit,
      };
    }
  }

  // إذا ذكر "كتب" بدون "كتاب" غالباً يقصد مؤلف
  if (normalized.includes('كتب ') && !normalized.includes('كتاب')) {
    const after = raw.split(/كتب\s+/i)[1]?.trim();
    if (after && after.length > 2) {
      return {
        type: 'author',
        query: after,
        count: extractedCount.count,
        isCountExplicit: extractedCount.explicit,
      };
    }
  }

  return { type: 'none', query: '', count: extractedCount.count, isCountExplicit: extractedCount.explicit };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('User message:', message);
    console.log('Conversation history length:', conversationHistory.length);

    // تحقق من أن الرسالة تتعلق بالكتب
    const isBookRelated = isBookRelatedMessage(message);
    const bookQuery = extractBookQuery(message);

    // تحديد العدد النهائي (افتراضياً: كتاب محدد = 1، اقتراحات/غيره = 6)
    const requestedCount = Math.max(
      1,
      Math.min(
        bookQuery.isCountExplicit ? bookQuery.count : (bookQuery.type === 'book' ? 1 : 6),
        50,
      ),
    );

    console.log('Is book related:', isBookRelated, '| Book query:', bookQuery, '| requestedCount:', requestedCount);


    // جلب الكتب والتصنيفات
    const { data: categories } = await supabase.from('categories').select('name');
    const categoriesContext = categories ? categories.map(cat => cat.name).join(', ') : '';

    // متغيرات البحث
    let relevantBooks: any[] = [];
    let authorInfo: any = null;

    // جلب معلومات المؤلف
    const fetchAuthorInfo = async (authorName: string) => {
      const cleanedName = cleanupQueryForDb(authorName);
      const words = cleanedName.split(' ').filter((w) => w.length > 1);
      if (words.length === 0) return null;

      let q = supabase
        .from('authors')
        .select('id, name, bio, avatar_url, country_name, books_count, followers_count, website, slug')
        .limit(1);

      for (const w of words) {
        q = q.ilike('name', `%${w}%`);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error fetching author info:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    };

    // بحث عن كتب المؤلف
    const searchBooksByAuthor = async (authorQuery: string) => {
      const cleanedAuthor = cleanupQueryForDb(authorQuery);
      const words = cleanedAuthor.split(' ').filter((w) => w.length > 1);
      if (words.length === 0) return [];

      let q = supabase
        .from('approved_books')
        .select('id, title, author, category, cover_image_url, views, slug, description')
        .order('views', { ascending: false })
        .limit(12);

      for (const w of words) {
        q = q.ilike('author', `%${w}%`);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error searching books by author:', error);
        return [];
      }

      return data || [];
    };

    // بحث عن كتاب بالعنوان
    const searchBooksByTitle = async (titleQuery: string) => {
      const cleanedTitle = cleanupQueryForDb(titleQuery);
      const words = cleanedTitle.split(' ').filter((w) => w.length > 1);
      if (words.length === 0) return [];

      let q = supabase
        .from('approved_books')
        .select('id, title, author, category, cover_image_url, views, slug, description')
        .order('views', { ascending: false })
        .limit(10);

      for (const w of words) {
        q = q.ilike('title', `%${w}%`);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error searching books by title:', error);
        return [];
      }

      return data || [];
    };

    // استخراج التصنيف من الرسالة
    const extractCategoryFromMessage = (msg: string): string | null => {
      const normalized = msg.toLowerCase().trim();
      const categoryKeywords: Record<string, string[]> = {
        'تنمية بشرية': ['تنمية بشرية', 'تنمية ذاتية', 'تطوير الذات', 'تطوير ذاتي'],
        'روايات': ['رواية', 'روايات', 'قصة', 'قصص'],
        'دين': ['دين', 'ديني', 'دينية', 'إسلام', 'إسلامي', 'إسلامية', 'قرآن'],
        'تاريخ': ['تاريخ', 'تاريخي', 'تاريخية'],
        'علوم': ['علوم', 'علمي', 'علمية', 'فيزياء', 'كيمياء', 'رياضيات'],
        'أدب': ['أدب', 'أدبي', 'أدبية', 'شعر', 'نثر'],
        'فلسفة': ['فلسفة', 'فلسفي', 'فلسفية'],
        'اقتصاد': ['اقتصاد', 'اقتصادي', 'اقتصادية', 'مال', 'أعمال', 'تجارة'],
        'سياسة': ['سياسة', 'سياسي', 'سياسية'],
        'نفس': ['نفس', 'نفسي', 'نفسية', 'علم النفس'],
        'تربية': ['تربية', 'تربوي', 'تربوية', 'أطفال'],
        'صحة': ['صحة', 'صحي', 'صحية', 'طب', 'طبي', 'طبية'],
        'تكنولوجيا': ['تكنولوجيا', 'تقنية', 'برمجة', 'حاسوب', 'كمبيوتر'],
      };
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
          if (normalized.includes(keyword)) {
            return category;
          }
        }
      }
      return null;
    };

    // بحث عام عن كتب (للاقتراحات) مع تنويع النتائج
    const getBookSuggestions = async (topic?: string, limit: number = 6) => {
      const detectedCategory = extractCategoryFromMessage(message);
      const fetchLimit = Math.min(limit * 5, 100); // نجلب أكثر ثم نختار عشوائياً
      
      let q = supabase
        .from('approved_books')
        .select('id, title, author, category, cover_image_url, views, slug, description')
        .limit(fetchLimit);

      // إذا تم اكتشاف تصنيف من الرسالة، نبحث فيه أولاً
      if (detectedCategory) {
        console.log('Detected category:', detectedCategory);
        q = q.ilike('category', `%${detectedCategory}%`);
      } else if (topic) {
        const cleanedTopic = cleanupQueryForDb(topic);
        if (cleanedTopic) {
          q = q.or(`category.ilike.%${cleanedTopic}%,title.ilike.%${cleanedTopic}%,description.ilike.%${cleanedTopic}%`);
        }
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error getting book suggestions:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // خلط النتائج عشوائياً للتنويع
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      
      // إرجاع العدد المطلوب فقط
      return shuffled.slice(0, Math.min(limit, shuffled.length));
    };

    // تنفيذ البحث حسب نوع الطلب
    if (bookQuery.type === 'author') {
      console.log('Searching for author:', bookQuery.query);
      relevantBooks = await searchBooksByAuthor(bookQuery.query);
      if (relevantBooks.length > 0) {
        authorInfo = await fetchAuthorInfo(relevantBooks[0]?.author || bookQuery.query);
      }
    } else if (bookQuery.type === 'book') {
      console.log('Searching for book:', bookQuery.query);
      relevantBooks = await searchBooksByTitle(bookQuery.query);
      
      // إذا لم نجد بالعنوان، جرب كمؤلف
      if (relevantBooks.length === 0) {
        relevantBooks = await searchBooksByAuthor(bookQuery.query);
        if (relevantBooks.length > 0) {
          authorInfo = await fetchAuthorInfo(relevantBooks[0]?.author || bookQuery.query);
        }
      }
    } else if (bookQuery.type === 'suggestions' || (isBookRelated && bookQuery.type === 'none')) {
      console.log('Getting book suggestions for:', bookQuery.query, 'count:', requestedCount);
      relevantBooks = await getBookSuggestions(bookQuery.query, requestedCount);
    }


    console.log('Found books:', relevantBooks.length);

    // ===== بناء الرد =====
    const bookIntent = bookQuery.type !== 'none' || isBookRelated;
    const returnedBooksCount = Math.min(relevantBooks.length, requestedCount);

    let assistantReply = '';

    // في حالة أسئلة/طلبات تتعلق بالكتب: لا نسمح بذكر عناوين من خيال المساعد
    // (العناوين تُعرض فقط من نتائج Supabase في حقل books)
    if (bookIntent) {
      if (returnedBooksCount > 0) {
        if (bookQuery.type === 'author') {
          const authorName = authorInfo?.name || bookQuery.query || relevantBooks[0]?.author || 'هذا المؤلف';
          assistantReply = `تمام ✅ لقيت لك ${returnedBooksCount} ${returnedBooksCount === 1 ? 'كتاب' : 'كتب'} للمؤلف "${authorName}" على موقع كتبي، وستظهر بالأسفل.`;
        } else if (bookQuery.type === 'book') {
          assistantReply = `تمام ✅ لقيت لك ${returnedBooksCount === 1 ? 'كتاباً' : `${returnedBooksCount} كتب`} مطابقة لبحثك في مكتبة كتبي، وستظهر بالأسفل.`;
        } else {
          assistantReply = `أكيد ✅ جهزت لك ${returnedBooksCount === 1 ? 'اقتراحاً واحداً' : `${returnedBooksCount} اقتراحات`} من مكتبة كتبي، وستظهر بالأسفل.`;
        }
      } else {
        if (bookQuery.type === 'book') {
          assistantReply = 'للأسف ما لقيت هذا الكتاب في مكتبة كتبي حالياً. جرّب تكتب جزء من العنوان بشكل أوضح أو اكتب اسم المؤلف وسأبحث لك.';
        } else if (bookQuery.type === 'author') {
          assistantReply = 'ما لقيت كتباً مطابقة لهذا المؤلف في مكتبة كتبي حالياً. جرّب تكتب الاسم بطريقة أخرى (مثلاً الاسم الأول فقط) وسأبحث لك.';
        } else {
          assistantReply = 'ما لقيت نتائج واضحة الآن في كتبي. قلّي: تبغى كتاب عن أي موضوع؟ (مثلاً: تنمية ذاتية، روايات، تاريخ...) وسأقترح لك.';
        }
      }

      assistantReply += '\n\nتقدر تكمّل البحث والقراءة مجاناً على كتبي: kotobi.xyz';
    } else {
      // ===== إعداد السياق للذكاء الاصطناعي (للأسئلة العامة فقط) =====
      const systemPrompt = `أنت "مساعد كتبي" 📚 - مساعد ذكي ودود لموقع "كتبي"، أكبر مكتبة رقمية عربية مجانية.

شخصيتك:
- أنت ذكي، ودود، ومتحمس للقراءة والكتب
- تتحدث بطريقة طبيعية وإنسانية مثل ChatGPT
- تستخدم الإيموجي بشكل معتدل لإضفاء الحيوية على الردود
- ردودك متوسطة الطول - ليست قصيرة جداً ولا طويلة جداً
- تتذكر سياق المحادثة وتبني عليه

معلومات عن موقع كتبي:
- مكتبة رقمية عربية مجانية
- التصنيفات المتوفرة: ${categoriesContext}
- يمكن للمستخدمين تحميل وقراءة الكتب مجاناً
- الموقع: kotobi.xyz

تعليمات مهمة:
- اربط الإجابة بشكل طبيعي بموقع كتبي (اقترح للمستخدم أن يبحث عن كتب مرتبطة بالموضوع داخل كتبي)
- لا تخترع كتباً أو أسماء كتب غير موجودة في قاعدة بيانات كتبي
- كن صادقاً إذا لم يكن لديك معلومات عن شيء ما`;

      // بناء سجل المحادثة للإرسال إلى AI
      const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: systemPrompt }];

      // إضافة سجل المحادثة السابق (آخر 10 رسائل للحفاظ على السياق)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.is_bot ? 'assistant' : 'user',
          content: msg.message_text || msg.text || '',
        });
      }

      // إضافة الرسالة الحالية
      messages.push({ role: 'user', content: message });

      // استدعاء Mistral API
      if (MISTRAL_API_KEY) {
        try {
          console.log('Calling Mistral API with', messages.length, 'messages...');
          const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${MISTRAL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'mistral-large-latest',
              messages: messages,
              max_tokens: 1000,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Mistral API error: ${response.status}`, errorText);
            assistantReply = 'عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى. 🙏';
          } else {
            const data = await response.json();
            assistantReply = data.choices?.[0]?.message?.content || '';
            console.log('Mistral response length:', assistantReply.length);
          }
        } catch (err) {
          console.error('Mistral API call failed:', err);
          assistantReply = 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى. 🙏';
        }
      } else {
        console.error('MISTRAL_API_KEY is not configured');
        assistantReply = 'عذراً، المساعد غير مهيأ حالياً. 😔';
      }
    }

    // تأكد من وجود رد
    if (!assistantReply || assistantReply.trim() === '') {
      assistantReply = 'مرحباً! 👋 كيف يمكنني مساعدتك اليوم؟';
    }

    console.log('Returning', relevantBooks.length, 'books');


    // استخدام العدد المطلوب من المستخدم (تم تحديده سابقاً)

    return new Response(
      JSON.stringify({
        reply: assistantReply,
        books: relevantBooks.slice(0, requestedCount).map(book => ({
          id: book.id,
          slug: book.slug || '',
          title: book.title,
          author: book.author,
          cover_image_url: book.cover_image_url
        })),
        authorInfo: authorInfo ? {
          id: authorInfo.id,
          name: authorInfo.name,
          bio: authorInfo.bio,
          avatar_url: authorInfo.avatar_url,
          country_name: authorInfo.country_name,
          books_count: authorInfo.books_count,
          followers_count: authorInfo.followers_count,
          website: authorInfo.website,
          slug: authorInfo.slug
        } : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in kotobi-assistant function:', error);

    return new Response(
      JSON.stringify({
        error: 'حدث خطأ في المساعد الذكي',
        reply: 'عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى. 🙏',
        books: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
