import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, Sparkles, FileText, Plus, Trash2, Play, Pause, X, CheckCircle, AlertTriangle, ClipboardPaste, Link2, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import BackgroundQueuePanel from './BackgroundQueuePanel';
import AutoDiscoverPanel from './AutoDiscoverPanel';

interface SimpleBook {
  title: string;
  cover_image_url?: string;
  book_file_url: string;
}

interface BulkBookUploaderAIProps {
  onUploadComplete: () => void;
}

const SAMPLE_CSV = `title,book_file_url
الإيمان وتكامل الإنسان - kotobi,https://archive.org/download/kotobi_202605/الإيمان وتكامل الإنسان - kotobi.pdf
روائع من التاريخ العثماني - kotobi,https://archive.org/download/kotobi_202605/روائع من التاريخ العثماني - kotobi.pdf`;

const AI_BATCH_SIZE = 5; // دفعات صغيرة لتفادي timeout الـ Edge Function عند رفع ملفات PDF كبيرة
const MAX_BOOKS_PER_RUN = 1000;
const BETWEEN_BATCH_DELAY_MS = 500;
const RETRY_DELAY_MS = 20000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface UploadBookResult {
  success?: boolean;
  retryable?: boolean;
  error?: string;
  title?: string;
  page_count?: number | null;
}

interface UploadBatchResult {
  results: UploadBookResult[];
  retryAfterMs: number;
}

// تحليل النص الحر (قوائم مرقمة) إلى كتب
function parseFreeformList(input: string): SimpleBook[] {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: SimpleBook[] = [];
  let pendingTitle = '';

  for (const line of lines) {
    // سطر يبدأ برقم: عنوان جديد
    const titleMatch = line.match(/^\d+[\.\)\-]\s*(.+)$/);
    if (titleMatch) {
      pendingTitle = titleMatch[1].trim();
      continue;
    }
    // سطر يحتوي رابط: نأخذ السطر كاملًا لأن روابط archive.org العربية تحتوي مسافات داخل اسم الملف
    const urlMatch = line.match(/(https?:\/\/.+)/i);
    if (urlMatch && pendingTitle) {
      const url = urlMatch[1].trim();
      // تنظيف العنوان من " - kotobi" في النهاية
      const cleanTitle = pendingTitle
        .replace(/\s*-\s*kotobi\s*$/i, '')
        .trim();
      items.push({ title: cleanTitle, book_file_url: url });
      pendingTitle = '';
    } else if (!urlMatch && !titleMatch) {
      // السطر امتداد للعنوان السابق
      if (pendingTitle) pendingTitle += ' ' + line;
    }
  }

  return items;
}
const BulkBookUploaderAI: React.FC<BulkBookUploaderAIProps> = ({ onUploadComplete }) => {
  const [books, setBooks] = useState<SimpleBook[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [manualRows, setManualRows] = useState<SimpleBook[]>([
    { title: '', book_file_url: '' },
  ]);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTitle, setCurrentTitle] = useState('');
  const [activeBookProgress, setActiveBookProgress] = useState(0);
  const [results, setResults] = useState({ success: 0, failed: 0, errors: [] as string[] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const { toast } = useToast();

  // === استخراج روابط التحميل من صفحات archive.org عبر Mistral AI ===
  const [pageLinksText, setPageLinksText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState({ done: 0, total: 0 });

  const extractFromArchivePages = async () => {
    const urls = pageLinksText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^https?:\/\//i.test(l));

    if (urls.length === 0) {
      toast({ title: 'لا توجد روابط', description: 'ألصق روابط صفحات الكتب (سطر لكل رابط)', variant: 'destructive' });
      return;
    }

    setExtracting(true);
    setExtractProgress({ done: 0, total: urls.length });
    const extracted: SimpleBook[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < urls.length; i++) {
        const pageUrl = urls[i];
        try {
          const { data, error } = await supabase.functions.invoke('extract-archive-book-link', {
            body: { pageUrl },
          });
          if (error) throw new Error(error.message);
          if (data?.success && data?.book_file_url) {
            extracted.push({
              title: (data.title || '').trim() || pageUrl,
              book_file_url: data.book_file_url,
            });
          } else {
            errors.push(`${pageUrl}: ${data?.error || 'لم يتم العثور على رابط PDF'}`);
          }
        } catch (e: any) {
          errors.push(`${pageUrl}: ${e.message || 'فشل الاستخراج'}`);
        }
        setExtractProgress({ done: i + 1, total: urls.length });
      }

      if (extracted.length > 0) {
        const limited = extracted.slice(0, MAX_BOOKS_PER_RUN);
        setBooks((prev) => {
          // دمج بدون تكرار حسب الرابط
          const existing = new Set(prev.map((b) => b.book_file_url));
          const merged = [...prev];
          for (const b of limited) {
            if (!existing.has(b.book_file_url)) {
              merged.push(b);
              existing.add(b.book_file_url);
            }
          }
          return merged.slice(0, MAX_BOOKS_PER_RUN);
        });
      }

      toast({
        title: 'اكتمل الاستخراج',
        description: `تم استخراج ${extracted.length} رابط PDF من ${urls.length} صفحة` + (errors.length ? ` • فشل ${errors.length}` : ''),
        variant: errors.length && !extracted.length ? 'destructive' : undefined,
      });

      if (errors.length) {
        console.warn('Extraction errors:', errors);
      }
    } finally {
      setExtracting(false);
    }
  };

  // === الاكتشاف التلقائي: بحث في archive.org → استخراج روابط PDF → إضافة ===
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverLimit, setDiscoverLimit] = useState(500);
  const [discovering, setDiscovering] = useState(false);
  const [discoverProgress, setDiscoverProgress] = useState({ phase: '', done: 0, total: 0 });

  const discoverAndAdd = async () => {
    const q = discoverQuery.trim();
    if (!q) {
      toast({ title: 'أدخل موضوع البحث', description: 'مثال: روايات عربية، تاريخ إسلامي، البخلاء...', variant: 'destructive' });
      return;
    }
    setDiscovering(true);
    setDiscoverProgress({ phase: 'جارٍ البحث في archive.org...', done: 0, total: 0 });

    try {
      // 1) البحث داخل الدالة المنشورة نفسها حتى لا يفشل الطلب إذا لم تكن دوال الاكتشاف الجديدة منشورة
      const { data: searchData, error: searchErr } = await supabase.functions.invoke('bulk-upload-books-ai', {
        body: { discoverArchiveBooks: true, query: q, limit: discoverLimit, upload: false },
      });
      if (searchErr) throw new Error(searchErr.message);
      if (!searchData?.success) throw new Error(searchData?.error || 'فشل البحث');

      const items: { identifier: string; title: string; details_url: string; book_file_url: string }[] = searchData.books || [];
      if (items.length === 0) {
        toast({ title: 'لا توجد نتائج', description: 'جرّب كلمات بحث مختلفة', variant: 'destructive' });
        return;
      }

      // فلترة المعرّفات المضافة مسبقًا
      const existingUrls = new Set(books.map((b) => b.book_file_url));

      setDiscoverProgress({ phase: 'إضافة روابط PDF...', done: items.length, total: items.length });
      const extracted: SimpleBook[] = items
        .filter((item) => item.book_file_url && !existingUrls.has(item.book_file_url))
        .map((item) => ({
          title: (item.title || '').trim() || item.identifier,
          book_file_url: item.book_file_url,
        }));
      const errors: string[] = [];

      if (extracted.length > 0) {
        setBooks((prev) => {
          const existing = new Set(prev.map((b) => b.book_file_url));
          const merged = [...prev];
          for (const b of extracted) {
            if (!existing.has(b.book_file_url)) {
              merged.push(b);
              existing.add(b.book_file_url);
            }
          }
          return merged.slice(0, MAX_BOOKS_PER_RUN);
        });
      }

      toast({
        title: 'اكتمل الاكتشاف',
        description: `تم العثور على ${items.length} كتاب غير مكرر • أُضيف ${extracted.length} للقائمة`,
      });
      if (errors.length) console.warn('Discovery errors:', errors);
    } catch (e: any) {
      toast({ title: 'فشل الاكتشاف', description: e.message || 'خطأ غير متوقع', variant: 'destructive' });
    } finally {
      setDiscovering(false);
      setDiscoverProgress({ phase: '', done: 0, total: 0 });
    }
  };


  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-books-ai.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (res) => {
        const rows = (res.data as Partial<SimpleBook>[])
          .map((r) => ({
            title: (r.title || '').trim(),
            cover_image_url: (r.cover_image_url || '').trim() || undefined,
            book_file_url: (r.book_file_url || '').trim(),
          }))
          .filter((r) => r.title && r.book_file_url);
        const limited = rows.slice(0, MAX_BOOKS_PER_RUN);
        setBooks(limited);
        toast({
          title: 'تم تحميل الملف',
          description:
            `${rows.length} كتاب جاهز` +
            (rows.length > MAX_BOOKS_PER_RUN ? ` — سيتم رفع أول ${MAX_BOOKS_PER_RUN} فقط` : ''),
          variant: rows.length > MAX_BOOKS_PER_RUN ? 'destructive' : undefined,
        });
      },
      error: (err) => {
        toast({ title: 'خطأ في قراءة الملف', description: err.message, variant: 'destructive' });
      },
    });
  };

  const usePastedText = () => {
    const parsed = parseFreeformList(pasteText);
    if (parsed.length === 0) {
      toast({ title: 'لم يتم التعرف على أي كتاب', description: 'تأكد أن كل عنوان متبوع برابط PDF', variant: 'destructive' });
      return;
    }
    const limited = parsed.slice(0, MAX_BOOKS_PER_RUN);
    setBooks(limited);
    toast({
      title: 'تم استخراج الكتب',
      description: `${parsed.length} كتاب جاهز للرفع`,
    });
  };

  const addManualRow = () => {
    setManualRows((prev) => [...prev, { title: '', book_file_url: '' }]);
  };

  const removeManualRow = (idx: number) => {
    setManualRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateManualRow = (idx: number, field: keyof SimpleBook, val: string) => {
    setManualRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  };

  const useManualRows = () => {
    const valid = manualRows.filter((r) => r.title.trim() && r.book_file_url.trim());
    if (valid.length === 0) {
      toast({ title: 'لا توجد بيانات', description: 'املأ صفًا واحدًا على الأقل', variant: 'destructive' });
      return;
    }
    setBooks(valid);
    toast({ title: 'تم تجهيز الكتب', description: `${valid.length} كتاب جاهز للرفع` });
  };

  const uploadBatch = async (batch: SimpleBook[]): Promise<UploadBatchResult> => {
    const { data, error } = await supabase.functions.invoke('bulk-upload-books-ai', {
      body: { books: batch },
    });

    if (error) {
      return {
        retryAfterMs: RETRY_DELAY_MS,
        results: batch.map((book) => ({
          success: false,
          retryable: true,
          title: book.title,
          error: error.message || 'تعذر الاتصال بدالة الرفع',
        })),
      };
    }

    const retryAfterMs = typeof data?.retry_after_ms === 'number' ? data.retry_after_ms : 0;
    if (Array.isArray(data?.results)) return { results: data.results, retryAfterMs };

    if (data?.success && data?.book) {
      return { results: [{ success: true, title: data.book.title }], retryAfterMs };
    }

    return {
      retryAfterMs,
      results: batch.map((book) => ({
        success: false,
        title: book.title,
        error: data?.error || 'خطأ غير معروف',
      })),
    };
  };

  const startUpload = async () => {
    if (books.length === 0) {
      toast({ title: 'لا توجد كتب', description: 'حمّل ملف CSV أو ألصق قائمة أو أضف صفوفًا أولًا', variant: 'destructive' });
      return;
    }
    if (books.length > MAX_BOOKS_PER_RUN) {
      toast({
        title: 'عدد الكتب كبير جدًا',
        description: `الحد الأقصى ${MAX_BOOKS_PER_RUN} كتاب في المرة الواحدة. لديك ${books.length} كتاب، قسّم القائمة.`,
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    setPaused(false);
    pauseRef.current = false;
    cancelRef.current = false;
    setCurrentIndex(0);
    setActiveBookProgress(0);
    setResults({ success: 0, failed: 0, errors: [] });

    const localResults = { success: 0, failed: 0, errors: [] as string[] };
    let pending = books;
    let attempt = 0;
    let processed = 0;

    while (pending.length > 0 && attempt < 4 && !cancelRef.current) {
      const retryableBooks: SimpleBook[] = [];
      attempt += 1;

      for (let start = 0; start < pending.length; start += AI_BATCH_SIZE) {
        if (cancelRef.current) break;
        while (pauseRef.current && !cancelRef.current) {
          await delay(400);
        }
        if (cancelRef.current) break;

        const batch = pending.slice(start, start + AI_BATCH_SIZE);
        setCurrentIndex(Math.min(processed, Math.max(books.length - 1, 0)));
        setActiveBookProgress(8);
        const batchNum = Math.floor(start / AI_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(pending.length / AI_BATCH_SIZE);
        setCurrentTitle(
          `محاولة ${attempt} — دفعة ${batchNum}/${totalBatches} (${batch.length} كتاب بالتوازي)`,
        );

        const progressTimer = window.setInterval(() => {
          setActiveBookProgress((prev) => Math.min(prev + 3, 92));
        }, 1200);
        let batchResponse: UploadBatchResult = {
          retryAfterMs: RETRY_DELAY_MS,
          results: batch.map((book) => ({
            success: false,
            retryable: true,
            title: book.title,
            error: 'انقطع طلب الرفع قبل اكتماله',
          })),
        };
        try {
          batchResponse = await uploadBatch(batch);
          setActiveBookProgress(100);
        } finally {
          window.clearInterval(progressTimer);
        }
        batchResponse.results.forEach((result, index) => {
          const book = batch[index] || batch.find((b) => b.title === result.title) || batch[0];

          if (result.success) {
            localResults.success += 1;
            processed += 1;
          } else if (result.retryable && attempt < 4) {
            retryableBooks.push(book);
          } else {
            localResults.failed += 1;
            processed += 1;
            localResults.errors.push(`${book.title}: ${result.error || 'فشل غير معروف'}`);
          }
        });

        setResults({ ...localResults });
        setCurrentIndex(Math.min(processed, books.length));
        setActiveBookProgress(0);
        if (batchResponse.retryAfterMs > 0 && retryableBooks.length > 0 && !cancelRef.current) {
          setCurrentTitle(`انتظار ${Math.ceil(batchResponse.retryAfterMs / 1000)} ثانية بسبب ضغط Mistral ثم المتابعة`);
          await delay(batchResponse.retryAfterMs);
        }
        await delay(BETWEEN_BATCH_DELAY_MS);
      }

      pending = retryableBooks;
      if (pending.length > 0 && attempt < 4 && !cancelRef.current) {
        setCurrentTitle(`انتظار ${RETRY_DELAY_MS / 1000} ثانية ثم إعادة محاولة ${pending.length} كتاب بسبب حد Mistral`);
        await delay(RETRY_DELAY_MS);
      }
    }

    if (pending.length > 0 && !cancelRef.current) {
      localResults.failed += pending.length;
      localResults.errors.push(...pending.map((book) => `${book.title}: تعذر الرفع بعد عدة محاولات، أعد تشغيل الرفع لاحقًا`));
      setResults({ ...localResults });
    }

    setUploading(false);
    setCurrentTitle('');
    onUploadComplete();
    toast({
      title: cancelRef.current ? 'تم الإيقاف' : 'اكتمل الرفع',
      description: `نجح ${localResults.success} • فشل ${localResults.failed}`,
    });
  };

  const togglePause = () => {
    pauseRef.current = !pauseRef.current;
    setPaused(pauseRef.current);
  };

  const cancelUpload = () => {
    cancelRef.current = true;
    pauseRef.current = false;
    setPaused(false);
  };

  const totalProcessed = results.success + results.failed;
  const progress = books.length > 0
    ? Math.min(100, ((totalProcessed + (uploading ? activeBookProgress / 100 : 0)) / books.length) * 100)
    : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            رفع مجمع 2 — بمساعدة الذكاء الاصطناعي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              ارفع ملف CSV يحتوي على حقلين فقط: <strong>title</strong> و{' '}
              <strong>book_file_url</strong>. <strong>الغلاف يُولَّد تلقائيًا من الصفحة الأولى للـPDF</strong>.
              الذكاء الاصطناعي يستنتج المؤلف، التصنيف، الوصف، اللغة وسنة النشر تلقائيًا. عدد الصفحات
              يُحسب فعليًا من ملف PDF.
              يمكنك رفع حتى <strong>{MAX_BOOKS_PER_RUN}</strong> كتاب دفعة واحدة.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadSample}>
              <Download className="ml-2 h-4 w-4" />
              تحميل ملف نموذجي
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <FileText className="ml-2 h-4 w-4" />
              اختيار ملف CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvFile}
            />
            {books.length > 0 && (
              <Badge variant="secondary" className="text-base px-3 py-1">
                {books.length} كتاب جاهز
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardPaste className="h-4 w-4" />
            ألصق قائمة (عنوان ثم رابط في السطر التالي)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`1. الإيمان وتكامل الإنسان - kotobi
https://archive.org/download/.../الإيمان وتكامل الإنسان - kotobi.pdf

2. روائع من التاريخ العثماني - kotobi
https://archive.org/download/.../روائع من التاريخ العثماني - kotobi.pdf`}
            rows={10}
            disabled={uploading}
            className="font-mono text-sm"
          />
          <Button onClick={usePastedText} disabled={uploading || !pasteText.trim()}>
            <Sparkles className="ml-2 h-4 w-4" />
            استخراج الكتب من النص
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أو أضف الكتب يدويًا</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {manualRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs">عنوان الكتاب</Label>
                <Input
                  value={row.title}
                  onChange={(e) => updateManualRow(idx, 'title', e.target.value)}
                  placeholder="البخلاء"
                  disabled={uploading}
                />
              </div>
              <div>
                <Label className="text-xs">رابط التحميل (PDF) — الغلاف يُولَّد تلقائيًا</Label>
                <Input
                  value={row.book_file_url}
                  onChange={(e) => updateManualRow(idx, 'book_file_url', e.target.value)}
                  placeholder="https://..."
                  disabled={uploading}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeManualRow(idx)}
                disabled={uploading || manualRows.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addManualRow} disabled={uploading}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة صف
            </Button>
            <Button variant="secondary" onClick={useManualRows} disabled={uploading}>
              تجهيز هذه الصفوف للرفع
            </Button>
          </div>
        </CardContent>
      </Card>

      <AutoDiscoverPanel />

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            اكتشاف ورفع تلقائي كامل من Archive.org عبر Mistral AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              فقط أدخل <strong>موضوع البحث</strong> (مثلاً: «روايات عربية» أو «تاريخ إسلامي»)، وسيقوم Mistral AI بـ:
              <br />
              ١) البحث في archive.org وجلب <strong>روابط details</strong> تلقائيًا.
              <br />
              ٢) فتح كل صفحة واستخراج <strong>رابط ملف PDF المباشر</strong>.
              <br />
              ٣) إضافة الكتب غير المكررة إلى قائمة الرفع. ثم اضغط «ابدأ الرفع» في الأسفل.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_auto] gap-3 items-end">
            <div>
              <Label className="text-xs">موضوع البحث</Label>
              <Input
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder="روايات عربية، تاريخ، أدب، فقه..."
                disabled={discovering || uploading}
              />
            </div>
            <div>
              <Label className="text-xs">عدد الكتب (اتركه فارغًا = غير محدود)</Label>
              <Input
                type="number"
                min={1}
                max={5000}
                value={discoverLimit}
                onChange={(e) => setDiscoverLimit(Math.max(1, Math.min(5000, parseInt(e.target.value, 10) || 1)))}
                disabled={discovering || uploading}
                className="w-32"
                placeholder="غير محدود"
              />
            </div>
            <Button onClick={discoverAndAdd} disabled={discovering || uploading || !discoverQuery.trim()}>
              {discovering ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {discoverProgress.total > 0
                    ? `${discoverProgress.done}/${discoverProgress.total}`
                    : 'جارٍ البحث...'}
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 h-4 w-4" />
                  اكتشف وأضف تلقائيًا
                </>
              )}
            </Button>
          </div>
          {discovering && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{discoverProgress.phase}</div>
              {discoverProgress.total > 0 && (
                <Progress value={(discoverProgress.done / discoverProgress.total) * 100} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            استخراج روابط PDF تلقائيًا من صفحات archive.org عبر Mistral AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              ألصق روابط <strong>صفحات الكتب</strong> على archive.org (مثال:{' '}
              <code className="text-xs">https://archive.org/details/20220728_20220728_1119</code>) — سطر لكل رابط.
              سيقوم الذكاء الاصطناعي باستخراج رابط ملف PDF المباشر تلقائيًا (مثال:{' '}
              <code className="text-xs">https://archive.org/download/.../file.pdf</code>) وإضافته إلى قائمة الرفع
              بدون تكرار.
            </AlertDescription>
          </Alert>
          <Textarea
            value={pageLinksText}
            onChange={(e) => setPageLinksText(e.target.value)}
            placeholder={`https://archive.org/details/20220728_20220728_1119
https://archive.org/details/another-book-id`}
            rows={6}
            disabled={extracting || uploading}
            className="font-mono text-sm"
            dir="ltr"
          />
          <div className="flex items-center gap-3">
            <Button onClick={extractFromArchivePages} disabled={extracting || uploading || !pageLinksText.trim()}>
              {extracting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارٍ الاستخراج {extractProgress.done}/{extractProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 h-4 w-4" />
                  استخراج روابط PDF بالذكاء الاصطناعي
                </>
              )}
            </Button>
            {extracting && extractProgress.total > 0 && (
              <div className="flex-1">
                <Progress value={(extractProgress.done / extractProgress.total) * 100} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <BackgroundQueuePanel books={books} disabled={uploading} />

      {books.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">بدء الرفع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!uploading ? (
              <Button onClick={startUpload} className="w-full" size="lg">
                <Upload className="ml-2 h-5 w-5" />
                ابدأ رفع {books.length} كتاب عبر Mistral AI (مع توليد الغلاف من الصفحة الأولى)
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      جارِ المعالجة: {totalProcessed} / {books.length}
                    </span>
                    <span className="text-2xl font-black tabular-nums text-primary">{Math.floor(progress)}%</span>
                    <span className="text-muted-foreground truncate max-w-[60%]">{currentTitle}</span>
                  </div>
                  <Progress value={progress} />
                  <div className="text-xs text-muted-foreground">
                    تقدم الكتاب الحالي: <strong className="text-foreground tabular-nums">{Math.round(activeBookProgress)}%</strong>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>✅ نجح: <strong className="text-foreground">{results.success}</strong></span>
                    <span>❌ فشل: <strong className="text-foreground">{results.failed}</strong></span>
                    <span>⏳ متبقي: <strong className="text-foreground">{Math.max(books.length - totalProcessed, 0)}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={togglePause} className="flex-1">
                    {paused ? <Play className="ml-2 h-4 w-4" /> : <Pause className="ml-2 h-4 w-4" />}
                    {paused ? 'متابعة' : 'إيقاف مؤقت'}
                  </Button>
                  <Button variant="destructive" onClick={cancelUpload} className="flex-1">
                    <X className="ml-2 h-4 w-4" />
                    إلغاء
                  </Button>
                </div>
              </>
            )}

            {totalProcessed > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg border p-3 text-center">
                  <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold">{results.success}</div>
                  <div className="text-xs text-muted-foreground">نجح</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <X className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <div className="text-2xl font-bold">{results.failed}</div>
                  <div className="text-xs text-muted-foreground">فشل</div>
                </div>
              </div>
            )}

            {results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-bold mb-1">أخطاء ({results.errors.length}):</div>
                  <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                    {results.errors.slice(0, 50).map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkBookUploaderAI;
