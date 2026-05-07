import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  X, 
  Sparkles,
  Loader2,
  BookOpen,
  Lightbulb,
  FileText,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
}

interface BookReaderAssistantProps {
  bookId?: string;
  bookTitle: string;
  bookAuthor: string;
  pdfTextContent?: string;
  totalPages?: number;
  currentPage?: number;
  getPagesText?: (pages: number[]) => Promise<string>;
}

const BookReaderAssistant: React.FC<BookReaderAssistantProps> = ({
  bookId,
  bookTitle,
  bookAuthor,
  pdfTextContent,
  totalPages,
  currentPage,
  getPagesText,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const makeWelcome = useCallback((): Message => ({
    id: 'welcome',
    text: `مرحباً! 👋 أنا مساعدك الذكي للقراءة. أنا هنا لمساعدتك في فهم كتاب "${bookTitle}" للمؤلف "${bookAuthor}". يمكنني تلخيص الأفكار، شرح المفاهيم، والإجابة على أسئلتك حول المحتوى. كيف أستطيع مساعدتك؟`,
    isBot: true,
  }), [bookTitle, bookAuthor]);

  const [messages, setMessages] = useState<Message[]>([makeWelcome()]);

  // تحميل الرسائل المحفوظة من Supabase
  useEffect(() => {
    if (!user?.id || !bookId) {
      setMessagesLoaded(true);
      return;
    }

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('reader_assistant_messages')
          .select('id, message_text, is_bot, created_at')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const loaded: Message[] = data.map((row) => ({
            id: row.id,
            text: row.message_text,
            isBot: row.is_bot,
          }));
          setMessages(loaded);
        }
      } catch (err) {
        console.error('Failed to load assistant messages:', err);
      } finally {
        setMessagesLoaded(true);
      }
    };

    loadMessages();
  }, [user?.id, bookId]);

  // حفظ رسالة جديدة في Supabase
  const persistMessage = useCallback(async (text: string, isBot: boolean) => {
    if (!user?.id || !bookId) return;
    try {
      await supabase
        .from('reader_assistant_messages')
        .insert({ user_id: user.id, book_id: bookId, message_text: text, is_bot: isBot });
    } catch (err) {
      console.error('Failed to persist assistant message:', err);
    }
  }, [user?.id, bookId]);

  // بدء محادثة جديدة (حذف القديمة من DB)
  const startNewConversation = useCallback(async () => {
    if (user?.id && bookId) {
      try {
        await supabase
          .from('reader_assistant_messages')
          .delete()
          .eq('user_id', user.id)
          .eq('book_id', bookId);
      } catch (err) {
        console.error('Failed to clear assistant messages:', err);
      }
    }
    setMessages([makeWelcome()]);
  }, [user?.id, bookId, makeWelcome]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // التمرير للأسفل عند إضافة رسالة جديدة
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // التركيز على حقل الإدخال عند فتح المساعد
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const normalizeDigitsToAscii = (input: string) =>
    input
      // أرقام عربية هندية ٠١٢٣٤٥٦٧٨٩
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      // أرقام فارسية ۰۱۲۳۴۵۶۷۸۹
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

  const wantsExactPageOnly = (input: string) =>
    /(?:\bفقط\b|بالضبط|تحديد(?:اً|ا)?|حصري(?:اً|ا)?)/.test(input);

  const isBookWideQuestion = (input: string) =>
    /(?:\bلخص\b|تلخيص|ملخص|خلاصة|اختصر|بشكل عام|نظرة عامة|الفكرة(?:\s+)?الرئيسية|الأفكار(?:\s+)?الرئيسية|موضوع(?:\s+)?الكتاب|عن\s+ماذا\s+يتحدث\s+الكتاب|الكتاب\s+كله|الفصول|الفصل)/.test(input);

  // أسئلة تشير إلى (هذا المقطع/هذه الصفحة) => نستخدم الصفحة الحالية فقط
  const isLocalReferenceQuestion = (input: string) =>
    /(?:هذه\s+(?:الصفحة|الفقرة|الجملة|الكلام)|هذا\s+(?:المقطع|الجزء)|اشرح\s+(?:هذا|هذه)|ما\s+معنى\s+(?:هذا|هذه)|وضّح\s+(?:هذا|هذه)|هنا|في\s+هذا\s+(?:السطر|الموضع)|explain\s+(?:this|it)|what\s+does\s+this\s+mean|in\s+this\s+(?:page|paragraph))/i.test(input);

  const extractRequestedPages = (input: string): number[] => {
    const q = normalizeDigitsToAscii(input);
    const matches = Array.from(
      q.matchAll(/(?:الصفحة|صفحة|الصفحه|صفحه|ص\.?|صـ?)\s*([0-9]{1,6})/g)
    );

    const nums = matches
      .map((m) => Number(m[1]))
      .filter((n) => Number.isFinite(n) && n > 0);

    return Array.from(new Set(nums)).slice(0, 3);
  };

  const buildRelevantPdfExcerpt = (
    fullText: string | undefined,
    query: string,
    maxChars = 6000,
    currentPage?: number
  ) => {
    if (!fullText?.trim()) return undefined;

    const normalizeArabic = (input: string) =>
      input
        .replace(/[\u0000-\u001f]/g, ' ')
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // التشكيل
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim();

    // تقسيم المحتوى حسب الصفحات اعتماداً على العلامة: --- صفحة X ---
    const pages: Array<{ page: number; text: string }> = [];
    const marker = /--- صفحة (\d+) ---\n/g;

    const matches = Array.from(fullText.matchAll(marker));
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const page = Number(current[1]);
      const start = (current.index ?? 0) + current[0].length;
      const end = next?.index ?? fullText.length;
      const text = fullText.slice(start, end).trim();
      pages.push({ page, text });
    }

    if (!pages.length) {
      return fullText.substring(0, maxChars);
    }

    // 1) إذا ذكر المستخدم رقم/أرقام صفحات صراحةً، أعد تلك الصفحات فقط (بدون صفحات مجاورة)
    const requestedPages = extractRequestedPages(query);
    if (requestedPages.length) {
      const selected = pages
        .filter((p) => requestedPages.includes(p.page))
        .slice(0, 3);

      let out = 'مقتطفات من الصفحات المطلوبة:\n';
      for (const p of selected) {
        const remaining = maxChars - out.length;
        if (remaining <= 60) break;
        const sliceLen = Math.min(1500, remaining - 30);
        out += `--- صفحة ${p.page} ---\n${p.text.substring(0, sliceLen)}\n`;
      }
      return out.substring(0, maxChars);
    }

    // 2) اختيار صفحات ذات صلة عبر بحث بسيط بالكلمات المفتاحية
    const terms = Array.from(
      new Set(
        query
          .replace(/[\u061F؟،\.\,\!\:\;\(\)\[\]\{\}\"\']/g, ' ')
          .split(/\s+/)
          .map((t) => t.trim())
          .filter((t) => t.length >= 3)
      )
    )
      .slice(0, 8)
      .map((t) => normalizeArabic(t));

    const scored = pages
      .map((p) => {
        const normText = normalizeArabic(p.text);
        const score = terms.reduce(
          (acc, term) => (term && normText.includes(term) ? acc + 1 : acc),
          0
        );
        return { ...p, score };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const isSummaryRequest = /(?:لخص|تلخيص|ملخص|خلاصة|اختصر)/.test(query);

    const selected = (() => {
      if (scored.length) return scored;

      // عند طلب تلخيص عام، نرسل مقتطفات موزعة من بداية/وسط/نهاية الكتاب
      if (isSummaryRequest && pages.length >= 3) {
        const mid = pages[Math.floor(pages.length / 2)];
        const last = pages[pages.length - 1];
        return [pages[0], mid, last].filter(Boolean).slice(0, 3);
      }

      // لا توجد كلمات مفتاحية واضحة: الأفضل استخدام الصفحة الحالية إن كانت متاحة بدل خلط صفحات متعددة
      if (typeof currentPage === 'number') {
        const hit = pages.find((p) => p.page === currentPage);
        if (hit) return [hit];
      }

      return pages.slice(0, 1);
    })();

    let out = 'مقتطفات ذات صلة من الكتاب:\n';
    for (const p of selected) {
      const remaining = maxChars - out.length;
      if (remaining <= 60) break;
      const sliceLen = Math.min(1500, remaining - 30);
      out += `--- صفحة ${p.page} ---\n${p.text.substring(0, sliceLen)}\n`;
    }

    return out.substring(0, maxChars);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      isBot: false
    };

    setMessages(prev => [...prev, userMessage]);
    persistMessage(userMessage.text, false);
    setInputValue('');
    setIsLoading(true);

    try {
      const computedTotalPages = (() => {
        if (typeof totalPages === 'number' && totalPages > 0) return totalPages;
        if (!pdfTextContent) return undefined;

        const marker = /--- صفحة (\d+) ---/g;
        let max = 0;
        for (const m of pdfTextContent.matchAll(marker)) {
          const n = Number(m[1]);
          if (!Number.isNaN(n)) max = Math.max(max, n);
        }
        return max || undefined;
      })();

      const historyForAI = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-20);

      const requestedPages = extractRequestedPages(userMessage.text);
      const exactOnly = wantsExactPageOnly(userMessage.text);
      const bookWide = isBookWideQuestion(userMessage.text);
      const localRef = isLocalReferenceQuestion(userMessage.text);

      let excerptToSend: string | undefined;
      let contextMode: 'page_strict' | 'page' | 'current' | 'book' = 'book';

      // 1) إذا طلب صفحات صراحةً: أرسل تلك الصفحات فقط (بدون مجاورات)
      if (requestedPages.length && getPagesText) {
        const max = computedTotalPages ?? totalPages ?? Number.POSITIVE_INFINITY;
        const pagesToFetch = requestedPages.filter((p) => p >= 1 && p <= max);

        contextMode = exactOnly ? 'page_strict' : 'page';

        try {
          const extracted = await getPagesText(pagesToFetch);
          if (extracted?.trim()) {
            excerptToSend = (`مقتطفات من الصفحات المطلوبة:\n${extracted}`).substring(0, 6000);
          }
        } catch (e) {
          console.warn('Failed to extract requested pages text:', e);
        }
      }

      // 2) إذا كان السؤال يشير لـ "هذه الفقرة/هذا المقطع" نستخدم الصفحة الحالية فقط
      if (!excerptToSend && getPagesText && typeof currentPage === 'number' && localRef) {
        const max = computedTotalPages ?? totalPages ?? Number.POSITIVE_INFINITY;
        const pagesToFetch = [currentPage].filter((p) => p >= 1 && p <= max);
        contextMode = 'current';

        try {
          const extracted = await getPagesText(pagesToFetch);
          if (extracted?.trim()) {
            excerptToSend = (`مقتطفات من الصفحة الحالية:\n${extracted}`).substring(0, 6000);
          }
        } catch {
          // ignore
        }
      }

      // 3) بقية الأسئلة: نبحث داخل الكتاب (بدون خلط صفحات عشوائية إن لم توجد كلمات مفتاحية)
      if (!excerptToSend) {
        contextMode = 'book';
        excerptToSend = buildRelevantPdfExcerpt(
          pdfTextContent,
          userMessage.text,
          6000,
          typeof currentPage === 'number' ? currentPage : undefined
        );
      }

      // إذا لم نجد أي محتوى على الإطلاق
      const hasContent =
        excerptToSend &&
        excerptToSend
          .replace(/مقتطفات.*?:\n/g, '')
          .replace(/--- صفحة \d+ ---\n/g, '')
          .trim().length > 20;

      if (!hasContent) {
        console.log('⚠️ لم يتم استخراج محتوى نصي، سنرسل فقط معلومات الكتاب');
      }

      console.log('📤 Sending to assistant:', {
        hasContent,
        excerptLength: excerptToSend?.length ?? 0,
        totalPages: computedTotalPages,
        historyLength: historyForAI.length,
        contextMode,
        requestedPages,
        currentPage,
      });

      const { data, error } = await supabaseFunctions.functions.invoke('book-reader-assistant', {
        body: {
          message: userMessage.text,
          bookTitle,
          bookAuthor,
          pdfTotalPages: computedTotalPages,
          pdfTextContent: excerptToSend || '',
          conversationHistory: exactOnly ? historyForAI.filter((m) => !m.isBot) : historyForAI,
          contextMode,
          requestedPages,
          currentPage,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'فشل الاتصال بالمساعد');
      }

      if (data?.error) {
        console.error('Assistant error:', data.error);
        throw new Error(data.error);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data?.response || 'عذراً، لم أتمكن من معالجة طلبك.',
        isBot: true
      };

      setMessages(prev => [...prev, botMessage]);
      persistMessage(botMessage.text, true);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorText = 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.';
      
      if (error?.message?.includes('API') || error?.message?.includes('مفتاح')) {
        errorText = 'عذراً، هناك مشكلة في إعدادات الخدمة. يرجى المحاولة لاحقاً.';
      } else if (error?.message?.includes('الاتصال')) {
        errorText = 'عذراً، فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
      }
      
      toast.error('فشل في إرسال الرسالة');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isBot: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // اقتراحات سريعة
  const quickSuggestions = [
    { icon: <FileText className="h-3 w-3" />, text: 'لخص هذا الفصل' },
    { icon: <Lightbulb className="h-3 w-3" />, text: 'ما الأفكار الرئيسية؟' },
    { icon: <HelpCircle className="h-3 w-3" />, text: 'اشرح هذا المفهوم' },
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* زر فتح المساعد */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 left-4 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة المساعد */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 md:left-4 md:right-auto md:w-96 z-50 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* رأس النافذة */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <div>
                  <h3 className="font-bold font-cairo text-sm">مساعد القراءة الذكي</h3>
                  <p className="text-xs opacity-80 font-cairo truncate max-w-48">{bookTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewConversation}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  title="بدء محادثة جديدة"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* منطقة الرسائل */}
            <ScrollArea className="h-80 p-4" ref={scrollAreaRef as any}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.isBot
                          ? 'bg-muted text-foreground rounded-tl-sm'
                          : 'bg-primary text-primary-foreground rounded-tr-sm'
                      }`}
                    >
                      <p className="text-sm font-cairo whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm font-cairo text-muted-foreground">جاري التفكير...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* الاقتراحات السريعة */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2 flex gap-2 flex-wrap">
                {quickSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 font-cairo"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                  >
                    {suggestion.icon}
                    <span className="mr-1">{suggestion.text}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* حقل الإدخال */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="اسأل عن محتوى الكتاب..."
                  className="flex-1 font-cairo text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BookReaderAssistant;
