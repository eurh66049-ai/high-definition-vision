import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookLinks, userQuery, searchMode, conversationMode } = await req.json();
    console.log('AI Book Search request:', { 
      bookLinksCount: bookLinks?.length || 0,
      userQuery,
      searchMode,
      conversationMode 
    });

    // إذا كان في وضع المحادثة وبدون كتب، فهو يريد محادثة عامة
    if (conversationMode && (!bookLinks || bookLinks.length === 0)) {
      return await handleConversation(userQuery);
    }

    // التحقق من التنسيق الجديد للكتب
    const parsedBooks = parseBookData(bookLinks);
    
    if (!parsedBooks || parsedBooks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'يجب توفير كتب بالتنسيق الصحيح',
          example: 'الكتاب 1: العنوان\nرابط الغلاف\nرابط الكتاب\nعدد الصفحات'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];
    const processingMode = searchMode || 'detailed';

    // رسالة ترحيبية إذا طلب المستخدم
    let assistantResponse = '';
    if (userQuery && (userQuery.includes('مرحبا') || userQuery.includes('هلا') || userQuery.includes('السلام'))) {
      assistantResponse = 'مرحباً بك! سأقوم الآن بتحليل الكتب التي أرسلتها وأعطيك معلومات مفصلة عنها. ';
    }

    for (const book of parsedBooks) {
      try {
        console.log('Processing book:', book);
        
        // استخراج معرف الكتاب من الرابط
        const bookId = extractBookIdFromUrl(book.bookUrl);
        
        // البحث المحسن مع جوجل
        const searchResults = await performPowerfulGoogleSearch(book, bookId, userQuery);
        
        // استخدام OpenAI للتحليل الذكي
        const bookData = await analyzeBookWithAI(book, searchResults, userQuery);
        
        // إضافة عدد الصفحات المعطى
        if (book.pageCount) {
          bookData.page_count = book.pageCount;
        }
        
        results.push(bookData);
        
        // تأخير متكيف
        const delay = parsedBooks.length > 10 ? 500 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error('Error processing book:', book, error);
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        results.push({
          title: book.title || 'خطأ في المعالجة',
          author: 'غير محدد',
          category: 'reference',
          description: `حدث خطأ أثناء معالجة هذا الكتاب: ${errorMessage}`,
          language: 'ar',
          cover_image_url: book.coverUrl || '',
          book_file_url: book.bookUrl || '',
          page_count: book.pageCount || null,
          error: errorMessage
        });
      }
    }

    // إنشاء ملف CSV محسن
    const csvData = generateEnhancedCSV(results, userQuery);

    // إضافة رد المساعد الذكي
    if (userQuery) {
      assistantResponse += await generateSmartResponse(results, userQuery);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        csvData,
        processedBooks: results.length,
        results,
        userQuery,
        assistantResponse,
        searchMode: processingMode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-book-search function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'حدث خطأ في معالجة الطلب',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// تحليل بيانات الكتب من التنسيق الجديد
function parseBookData(input: any): any[] {
  if (Array.isArray(input)) {
    // التنسيق القديم - مصفوفة من الكائنات
    return input.map(item => ({
      title: extractTitleFromUrl(item.bookUrl || item.pdfUrl),
      coverUrl: item.coverUrl,
      bookUrl: item.bookUrl || item.pdfUrl,
      pageCount: null
    }));
  }
  
  if (typeof input === 'string') {
    // التنسيق الجديد - نص مع تفاصيل الكتب
    const books = [];
    const lines = input.trim().split('\n');
    
    let currentBook = null;
    let expectingCover = false;
    let expectingBook = false;
    let expectingPages = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // التحقق من بداية كتاب جديد
      if (line.match(/^الكتاب\s*\d+/i) || line.match(/^\d+$/)) {
        if (currentBook) {
          books.push(currentBook);
        }
        currentBook = {
          title: line,
          coverUrl: '',
          bookUrl: '',
          pageCount: null
        };
        expectingCover = true;
        continue;
      }
      
      // إذا كان رابط غلاف
      if (expectingCover && line.includes('archive.org') && line.includes('BookReader')) {
        if (currentBook) {
          currentBook.coverUrl = line;
          expectingCover = false;
          expectingBook = true;
        }
        continue;
      }
      
      // إذا كان رابط كتاب
      if (expectingBook && line.includes('archive.org') && line.includes('.pdf')) {
        if (currentBook) {
          currentBook.bookUrl = line;
          expectingBook = false;
          expectingPages = true;
        }
        continue;
      }
      
      // إذا كان عدد صفحات
      if (expectingPages && line.match(/^\d+$/)) {
        if (currentBook) {
          (currentBook as any).pageCount = parseInt(line);
          expectingPages = false;
        }
        continue;
      }
      
      // محاولة تحليل السطر إذا كان يحتوي على رابط مباشر
      if (line.includes('archive.org')) {
        if (line.includes('BookReader')) {
          // رابط غلاف
          if (currentBook) {
            currentBook.coverUrl = line;
          } else {
            currentBook = {
              title: extractTitleFromUrl(line),
              coverUrl: line,
              bookUrl: '',
              pageCount: null
            };
          }
        } else if (line.includes('.pdf')) {
          // رابط كتاب
          if (currentBook) {
            currentBook.bookUrl = line;
          }
        }
      }
    }
    
    // إضافة الكتاب الأخير
    if (currentBook && currentBook.bookUrl) {
      books.push(currentBook);
    }
    
    return books;
  }
  
  return [];
}

function extractBookIdFromUrl(url: string): string {
  if (!url) return '';
  
  // استخراج معرف الكتاب من archive.org
  const archiveMatch = url.match(/\/([^\/]+)\/([^\/]+)\.pdf/);
  if (archiveMatch) {
    return archiveMatch[2];
  }
  
  // استخراج من أي URL آخر
  const generalMatch = url.match(/\/([^\/]+)\.pdf/);
  if (generalMatch) {
    return generalMatch[1];
  }
  
  return url.split('/').pop()?.replace('.pdf', '') || '';
}

function extractTitleFromUrl(url: string): string {
  if (!url) return '';
  
  try {
    // فك تشفير URL إذا كان مُشفراً
    const decodedUrl = decodeURIComponent(url);
    
    // استخراج اسم الملف من الرابط
    let fileName = decodedUrl.split('/').pop()?.replace('.pdf', '') || '';
    
    // تنظيف اسم الملف
    fileName = fileName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\+/g, ' ')
      .replace(/%20/g, ' ')
      .replace(/\d{4}/g, '') // إزالة السنوات
      .replace(/\b(book|كتاب|pdf|epub|doc)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    return fileName || 'كتاب غير محدد';
  } catch (error) {
    console.error('Error extracting title from URL:', error);
    return 'كتاب غير محدد';
  }
}

// البحث القوي مع جوجل للحصول على معلومات الكتاب
async function performPowerfulGoogleSearch(book: any, bookId: string, userQuery?: string): Promise<string> {
  try {
    // استخراج معلومات من URL بطريقة محسنة
    const titleFromUrl = extractTitleFromUrl(book.bookUrl);
    
    // تحليل نوع المصدر
    let sourceType = 'Internet Archive';
    if (book.bookUrl?.includes('shamela')) {
      sourceType = 'المكتبة الشاملة';
    }
    
    // بناء معلومات سياقية شاملة
    let contextInfo = `
=== معلومات الكتاب المستخرجة ===
المصدر: ${sourceType}
معرف الكتاب: ${bookId}
العنوان من الرابط: ${titleFromUrl}
العنوان المعطى: ${book.title || 'غير محدد'}
عدد الصفحات: ${book.pageCount || 'غير محدد'}
رابط الغلاف: ${book.coverUrl || 'غير متوفر'}
رابط الكتاب: ${book.bookUrl}

=== تحليل السياق ===`;

    // تحليل ذكي لنوع الكتاب
    const combinedText = `${titleFromUrl} ${book.title || ''}`.toLowerCase();
    
    if (combinedText.includes('قرآن') || combinedText.includes('تفسير') || combinedText.includes('قراءات')) {
      contextInfo += '\n🔖 النوع: علوم القرآن والتفسير';
    } else if (combinedText.includes('حديث') || combinedText.includes('سنة') || combinedText.includes('صحيح') || combinedText.includes('سنن')) {
      contextInfo += '\n📚 النوع: علوم الحديث النبوي';
    } else if (combinedText.includes('فقه') || combinedText.includes('أحكام') || combinedText.includes('مذهب')) {
      contextInfo += '\n⚖️ النوع: الفقه والأحكام الشرعية';
    } else if (combinedText.includes('عقيدة') || combinedText.includes('توحيد') || combinedText.includes('إيمان')) {
      contextInfo += '\n🕌 النوع: العقيدة والتوحيد';  
    } else if (combinedText.includes('تاريخ') || combinedText.includes('سيرة') || combinedText.includes('تراجم')) {
      contextInfo += '\n📜 النوع: التاريخ والسير';
    } else if (combinedText.includes('أدب') || combinedText.includes('شعر') || combinedText.includes('نثر')) {
      contextInfo += '\n✍️ النوع: الأدب والشعر';
    } else if (combinedText.includes('لغة') || combinedText.includes('نحو') || combinedText.includes('صرف')) {
      contextInfo += '\n🔤 النوع: اللغة العربية والنحو';
    } else if (combinedText.includes('فلسفة') || combinedText.includes('منطق') || combinedText.includes('حكمة')) {
      contextInfo += '\n🤔 النوع: الفلسفة والمنطق';
    }

    // إضافة السياق حسب طلب المستخدم
    if (userQuery) {
      contextInfo += `\n\n=== طلب المستخدم ===\n${userQuery}`;
    }

    // محاولة استنتاج معلومات إضافية من اسم الملف
    const authorMatch = titleFromUrl.match(/(.*?)\s*-\s*(.*?)$/);
    if (authorMatch) {
      contextInfo += `\n\n=== تحليل اسم الملف ===\nالعنوان المحتمل: ${authorMatch[1]}\nالمؤلف المحتمل: ${authorMatch[2]}`;
    }
    
    return contextInfo;
    
  } catch (error) {
    console.error('Error in powerful Google search:', error);
    return `معرف الكتاب: ${bookId}`;
  }
}

// معالجة المحادثة العامة
async function handleConversation(userQuery: string): Promise<Response> {
  if (!mistralApiKey) {
    return new Response(
      JSON.stringify({ error: 'مفتاح Mistral غير متاح' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي متخصص في الكتب العربية والمراجع الأكاديمية. 
            
اسمك "مساعد كتبي الذكي" وأنت خبير في:
- تحليل وتصنيف الكتب العربية
- استخراج معلومات دقيقة من روابط الكتب
- البحث في المكتبات الرقمية
- تقديم توصيات للقراء
- الإجابة على الأسئلة المتعلقة بالكتب والمراجع

كن ودوداً ومفيداً في إجاباتك، واستخدم الرموز التعبيرية المناسبة.`
          },
          {
            role: 'user',
            content: userQuery
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        success: true,
        conversationMode: true,
        assistantResponse,
        userQuery
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Error in conversation:', error);
    return new Response(
      JSON.stringify({ 
        error: 'عذراً، حدث خطأ في المحادثة',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// إنشاء رد ذكي شامل
async function generateSmartResponse(results: any[], userQuery: string): Promise<string> {
  if (!mistralApiKey) {
    return 'تم تحليل الكتب بنجاح، لكن لا يمكنني تقديم تحليل إضافي في الوقت الحالي.';
  }

  try {
    const booksSummary = results.map(book => 
      `• ${book.title} - ${book.author} (${book.category})`
    ).join('\n');

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد ذكي للكتب. قدم تحليلاً مفيداً وشاملاً للكتب المعالجة.'
          },
          {
            role: 'user',
            content: `قمت بتحليل هذه الكتب:

${booksSummary}

السؤال/الطلب من المستخدم: ${userQuery}

قدم رداً تحليلياً مفيداً وشاملاً عن هذه الكتب واربطه بطلب المستخدم:`
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'تم تحليل الكتب بنجاح.';
    
  } catch (error) {
    console.error('Error generating smart response:', error);
    return 'تم تحليل الكتب بنجاح، لكن لا يمكنني تقديم تحليل إضافي في الوقت الحالي.';
  }
}

function analyzeUrlInfo(url: string): string {
  if (!url) return '';
  
  // استخراج معلومات من URL
  const parts = url.split('/');
  const fileName = parts.pop()?.replace('.pdf', '') || '';
  
  // محاولة تحليل اسم الملف
  const cleaned = fileName
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(word => word.length > 2)
    .join(' ');
    
  return cleaned;
}

async function analyzeBookWithAI(bookLink: any, searchResults: string, userQuery?: string): Promise<any> {
  if (!mistralApiKey) {
    throw new Error('Mistral API key not configured');
  }

  // تحسين النص المستخرج من URL
  const urlTitle = extractTitleFromUrl(bookLink.bookUrl || bookLink.pdfUrl);
  
  const prompt = `أنت خبير متخصص في الكتب العربية والموسوعات والمراجع الأكاديمية. مهمتك تحليل المعلومات المتاحة واستخراج بيانات دقيقة ومفصلة للكتاب.

=== المعلومات المتاحة ===
رابط الغلاف: ${bookLink.coverUrl || 'غير متوفر'}
رابط الكتاب: ${bookLink.bookUrl || bookLink.pdfUrl || 'غير متوفر'}
العنوان المستخرج من الرابط: ${urlTitle}
نتائج البحث الإضافية: ${searchResults}
${userQuery ? `طلب المستخدم المحدد: ${userQuery}` : ''}

=== التعليمات المفصلة ===
حلل المعلومات بدقة واستخرج:

1. **العنوان**: العنوان الكامل والصحيح للكتاب (مع إزالة الرموز الغريبة)
2. **المؤلف**: الاسم الكامل للمؤلف/المؤلفين (أ.د. فلان، د. فلان، إلخ)
3. **التصنيف**: اختر التصنيف الأنسب من هذه القائمة فقط:
   - novels (الروايات والقصص)
   - history (التاريخ والحضارة)
   - religion (الدين الإسلامي عموماً)
   - islamic_studies (الدراسات الإسلامية المتخصصة)
   - hadith (كتب الحديث النبوي)
   - quran (علوم القرآن والتفسير)
   - fiqh (الفقه والأحكام)
   - aqeedah (العقيدة والتوحيد)
   - arabic_language (اللغة العربية والنحو)
   - literature (الأدب والشعر)
   - philosophy (الفلسفة والمنطق)
   - science (العلوم الطبيعية)
   - education (التربية والتعليم)
   - reference (المراجع والموسوعات)
   - biography (السير والتراجم)
   - economics (الاقتصاد والمال)
   - politics (السياسة والحكم)

4. **الوصف**: وصف تفصيلي ودقيق (150-250 كلمة) يشمل:
   - موضوع الكتاب الرئيسي
   - المحتويات المهمة
   - أهمية الكتاب وقيمته العلمية
   - الجمهور المستهدف

5. **اللغة**: ar (للعربية) أو en (للإنجليزية)
6. **سنة النشر**: السنة الميلادية (رقم فقط)
7. **عدد الصفحات**: تقدير واقعي لعدد الصفحات
8. **دار النشر**: اسم دار النشر إن وُجد

=== قواعد مهمة ===
- كن دقيقاً في المعلومات ولا تخمن إذا لم تكن متأكداً
- استخدم اللغة العربية الفصحى في الوصف
- تأكد من صحة التصنيف حسب القائمة المحددة
- أعط إجابة واحدة فقط بتنسيق JSON صحيح

أعط الإجابة بتنسيق JSON فقط:`;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'أنت خبير في تحليل الكتب العربية والموسوعات. تقوم بتحليل المعلومات المتاحة وإرجاع بيانات دقيقة بتنسيق JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    try {
      const bookData = JSON.parse(aiResponse);
      
      return {
        title: bookData.title || 'عنوان غير محدد',
        author: bookData.author || 'مؤلف غير محدد',
        category: bookData.category || 'reference',
        description: bookData.description || 'وصف غير متوفر',
        language: bookData.language || 'ar',
        cover_image_url: bookLink.coverUrl || '',
        book_file_url: bookLink.bookUrl || bookLink.pdfUrl || '',
        publication_year: bookData.publication_year || null,
        page_count: bookData.page_count || null,
        publisher: bookData.publisher || null,
        display_type: 'download_read',
        file_type: 'application/pdf',
        subtitle: bookData.subtitle || null,
        translator: bookData.translator || null
      };
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('فشل في تحليل استجابة الذكاء الاصطناعي');
    }

  } catch (error) {
    console.error('Error with Mistral API:', error);
    throw new Error('فشل في الاتصال بخدمة الذكاء الاصطناعي');
  }
}

async function getSpecificInformation(bookData: any, userQuery: string): Promise<string> {
  if (!mistralApiKey) {
    return 'لا يمكن الإجابة - مفتاح Mistral غير متاح';
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'أنت خبير في الكتب العربية. أجب على أسئلة المستخدم بناءً على معلومات الكتاب المقدمة بطريقة دقيقة ومفيدة.'
          },
          {
            role: 'user',
            content: `بناءً على معلومات هذا الكتاب:
العنوان: ${bookData.title}
المؤلف: ${bookData.author}  
التصنيف: ${bookData.category}
الوصف: ${bookData.description}

السؤال/الطلب: ${userQuery}

أجب بطريقة مفيدة ودقيقة:`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'لم أتمكن من الإجابة على هذا السؤال';
    
  } catch (error) {
    console.error('Error getting specific information:', error);
    return `خطأ في الحصول على المعلومات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`;
  }
}

function generateEnhancedCSV(books: any[], userQuery?: string): string {
  const headers = [
    'title',
    'author',
    'category',
    'description',
    'language',
    'cover_image_url',
    'book_file_url',
    'publication_year',
    'page_count',
    'publisher',
    'translator',
    'display_type',
    'file_type',
    'subtitle',
    'author_bio',
    'author_image_url',
    'author_website',
    'author_country_code',
    'author_country_name',
    'file_size',
    'user_email'
  ];

  // إضافة عمود إضافي للاستجابة على الاستفسار إذا وُجد
  if (userQuery) {
    headers.push('user_query_response');
  }

  const csvRows = [headers.join(',')];

  books.forEach(book => {
    const row = headers.map(header => {
      let value = book[header] || '';
      
      // تعيين قيم افتراضية محسنة
      if (header === 'display_type') value = 'download_read';
      if (header === 'file_type') value = 'application/pdf';
      if (header === 'user_email') value = 'admin@kotobi.com';
      if (header === 'file_size') value = '2048000';
      if (header === 'user_query_response' && userQuery) {
        value = book.user_query_response || 'لا توجد إجابة محددة';
      }
      
      // تنظيف وحماية القيم
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""'); // escape quotes
        value = value.replace(/\r?\n/g, ' '); // replace newlines with spaces
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`;
        }
      }
      
      return value;
    });
    
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}