import React, { useState, useEffect, useRef, useMemo, useDeferredValue, useCallback } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, Search, CheckCircle, XCircle, RefreshCw, Eye, Play, Pause, Square, Zap, Server } from 'lucide-react';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BookWithExtraction {
  id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  book_file_url: string | null;
  extraction_status: string | null;
  text_length: number | null;
  extraction_error: string | null;
  updated_at?: string | null;
}

type BulkState = 'idle' | 'running' | 'paused';

const TextExtractionManager: React.FC = () => {
  const [books, setBooks] = useState<BookWithExtraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingBookId, setProcessingBookId] = useState<string | null>(null);
  const [viewText, setViewText] = useState<{ bookTitle: string; text: string } | null>(null);

  // Bulk extraction state
  const [bulkState, setBulkState] = useState<BulkState>('idle');
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0, currentTitle: '' });
  const bulkStateRef = useRef<BulkState>('idle');
  const { toast } = useToast();

  // حالة الطابور الخلفي (يعمل عبر cron حتى عند إغلاق الموقع)
  const [queueStats, setQueueStats] = useState<{ pending: number; processing: number; completed: number; failed: number } | null>(null);

  const fetchQueueStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('text_extraction_queue' as any)
        .select('status');
      if (error) throw error;
      const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
      for (const row of (data as any[]) || []) {
        const s = row.status as keyof typeof stats;
        if (s in stats) stats[s]++;
      }
      setQueueStats(stats);
    } catch (err) {
      console.error('queue stats error', err);
    }
  }, []);

  useEffect(() => {
    fetchQueueStats();
    const id = setInterval(fetchQueueStats, 15000);
    return () => clearInterval(id);
  }, [fetchQueueStats]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      // جلب جميع الكتب المعتمدة عبر صفحات (pagination) لتجاوز حد 1000 الافتراضي
      const PAGE_SIZE = 1000;
      let allBooks: any[] = [];
      let from = 0;
      while (true) {
        const { data: page, error } = await supabase
          .from('approved_books' as any)
          .select('id, title, author, cover_image_url, book_file_url')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        const pageData = (page as any[]) || [];
        allBooks = allBooks.concat(pageData);
        if (pageData.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      // جلب جميع سجلات الاستخراج عبر صفحات أيضاً لأن Supabase يطبق حد 1000 صف افتراضياً
      let allExtractions: Array<{
        book_id: string | null;
        extraction_status: string | null;
        text_length: number | null;
        extraction_error: string | null;
        updated_at: string | null;
      }> = [];
      let extractionFrom = 0;

      while (true) {
        const { data: extractionPage, error: extractionError } = await supabase
          .from('book_extracted_text')
          .select('book_id, extraction_status, text_length, extraction_error, updated_at')
          .order('updated_at', { ascending: false })
          .range(extractionFrom, extractionFrom + PAGE_SIZE - 1);

        if (extractionError) throw extractionError;

        const pageData = extractionPage || [];
        allExtractions = allExtractions.concat(pageData);
        if (pageData.length < PAGE_SIZE) break;
        extractionFrom += PAGE_SIZE;
      }

      const extractionMap = new Map(
        allExtractions
          .filter((extraction) => extraction.book_id)
          .map((extraction) => [extraction.book_id, extraction])
      );

      const booksWithExtraction: BookWithExtraction[] = allBooks.map((book: any) => {
        const ext = extractionMap.get(book.id);
        return {
          ...book,
          extraction_status: ext?.extraction_status || null,
          text_length: ext?.text_length || null,
          extraction_error: ext?.extraction_error || null,
        };
      }).sort((a, b) => {
        const aCompleted = a.extraction_status === 'completed' && (a.text_length || 0) > 0 ? 1 : 0;
        const bCompleted = b.extraction_status === 'completed' && (b.text_length || 0) > 0 ? 1 : 0;
        return aCompleted - bCompleted;
      });

      setBooks(booksWithExtraction);
    } catch (err) {
      console.error('Error fetching books:', err);
      toast({ title: 'خطأ في جلب الكتب', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const extractText = async (bookId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data, error } = await supabaseFunctions.functions.invoke('extract-book-text', {
        body: { bookId, bookTable: 'approved_books' }
      });
      if (error) throw error;

      if (!(data?.success && data?.textLength > 0)) {
        return { ok: false, error: data?.error || data?.errors?.join('; ') || 'فشل الاستخراج: لم يتم استخراج أي نص' };
      }

      const { data: latestExtraction, error: verificationError } = await supabase
        .from('book_extracted_text')
        .select('extraction_status, text_length, extraction_error, updated_at')
        .eq('book_id', bookId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (verificationError) {
        return { ok: false, error: verificationError.message };
      }

      const verifiedRow = latestExtraction?.[0];
      if (verifiedRow?.extraction_status === 'completed' && (verifiedRow.text_length || 0) > 0) {
        return { ok: true };
      }

      return { ok: false, error: verifiedRow?.extraction_error || 'تم استدعاء الاستخراج لكن لم يتم حفظ النص المستخرج بنجاح' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'خطأ غير متوقع' };
    }
  };

  const handleSingleExtract = async (bookId: string) => {
    setProcessingBookId(bookId);
    const res = await extractText(bookId);
    if (res.ok) {
      await fetchBooks();
      toast({ title: 'تم استخراج النص بنجاح' });
    } else {
      toast({ title: 'خطأ في استخراج النص', description: res.error, variant: 'destructive' });
    }
    setProcessingBookId(null);
  };

  // === استخراج تلقائي لكل الكتب الناقصة ===
  const startBulkExtraction = async () => {
    const pending = books.filter(
      b => !(b.extraction_status === 'completed' && (b.text_length || 0) > 0) && b.book_file_url
    );

    if (pending.length === 0) {
      toast({ title: 'لا توجد كتب بحاجة للاستخراج', description: 'جميع الكتب مستخرجة مسبقاً' });
      return;
    }

    bulkStateRef.current = 'running';
    setBulkState('running');
    setBulkProgress({ done: 0, total: pending.length, failed: 0, currentTitle: '' });

    let done = 0;
    let failed = 0;

    for (const book of pending) {
      // إيقاف كامل
      if ((bulkStateRef.current as BulkState) === 'idle') break;

      // انتظار في حالة الإيقاف المؤقت
      while ((bulkStateRef.current as BulkState) === 'paused') {
        await new Promise(r => setTimeout(r, 500));
      }
      if ((bulkStateRef.current as BulkState) === 'idle') break;

      setBulkProgress(p => ({ ...p, currentTitle: book.title }));
      setProcessingBookId(book.id);

      const res = await extractText(book.id);
      if (res.ok) done++;
      else failed++;

      setBulkProgress({ done: done + failed, total: pending.length, failed, currentTitle: book.title });
      setProcessingBookId(null);

      // فاصل صغير لتجنب rate limits
      await new Promise(r => setTimeout(r, 800));
    }

    bulkStateRef.current = 'idle';
    setBulkState('idle');
    toast({
      title: 'اكتمل الاستخراج التلقائي',
      description: `نجح: ${done} | فشل: ${failed}`,
    });
    fetchBooks();
  };

  const pauseBulk = () => {
    bulkStateRef.current = 'paused';
    setBulkState('paused');
  };

  const resumeBulk = () => {
    bulkStateRef.current = 'running';
    setBulkState('running');
  };

  const stopBulk = () => {
    bulkStateRef.current = 'idle';
    setBulkState('idle');
    setProcessingBookId(null);
  };

  const viewExtractedText = async (bookId: string, bookTitle: string) => {
    try {
      const { data, error } = await supabase
        .from('book_extracted_text')
        .select('extracted_text, updated_at')
        .eq('book_id', bookId)
        .order('updated_at', { ascending: false })
        .limit(1);

      const latestText = data?.[0];

      if (error || !latestText?.extracted_text) {
        toast({ title: 'لا يوجد نص مستخرج لهذا الكتاب', variant: 'destructive' });
        return;
      }
      setViewText({ bookTitle, text: latestText.extracted_text });
    } catch {
      toast({ title: 'خطأ في جلب النص', variant: 'destructive' });
    }
  };

  // البحث المؤجل لتجنب اللاغ أثناء الكتابة
  const deferredQuery = useDeferredValue(searchQuery);

  const filteredBooks = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }, [books, deferredQuery]);

  const pendingCount = useMemo(
    () => books.filter(b => !(b.extraction_status === 'completed' && (b.text_length || 0) > 0) && b.book_file_url).length,
    [books]
  );
  const completedCount = useMemo(
    () => books.filter(b => b.extraction_status === 'completed' && (b.text_length || 0) > 0).length,
    [books]
  );

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="h-3 w-3 ml-1" />مكتمل</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"><Loader2 className="h-3 w-3 ml-1 animate-spin" />قيد المعالجة</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><XCircle className="h-3 w-3 ml-1" />فشل</Badge>;
      default:
        return <Badge variant="outline">لم يُستخرج بعد</Badge>;
    }
  };

  // صف الكتاب داخل القائمة الافتراضية (react-window v2)
  const BookRow = useCallback(
    ({ index, style, books: rowBooks }: RowComponentProps<{ books: BookWithExtraction[] }>) => {
      const book = rowBooks[index];
      if (!book) return null;
      return (
        <div style={style} className="px-1 pb-3">
          <Card className={`overflow-hidden ${processingBookId === book.id ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{book.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {getStatusBadge(book.extraction_status)}
                    {book.text_length && (
                      <span className="text-xs text-muted-foreground">
                        {book.text_length.toLocaleString()} حرف
                      </span>
                    )}
                  </div>
                  {book.extraction_error && (
                    <p className="text-xs text-destructive mt-1 truncate">{book.extraction_error}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleSingleExtract(book.id)}
                    disabled={processingBookId === book.id || bulkState !== 'idle'}
                  >
                    {processingBookId === book.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 ml-1" />
                    )}
                    استخراج
                  </Button>
                  {book.extraction_status === 'completed' && (
                    <Button size="sm" variant="outline" onClick={() => viewExtractedText(book.id, book.title)}>
                      <Eye className="h-4 w-4 ml-1" />
                      عرض
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    },
    [processingBookId, bulkState]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-3 text-muted-foreground">جاري تحميل الكتب...</span>
      </div>
    );
  }

  const progressPct = bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* لوحة الطابور الخلفي - يعمل تلقائياً حتى عند إغلاق الموقع */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Server className="h-5 w-5 text-emerald-600" />
                الاستخراج التلقائي في الخلفية
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                يعمل تلقائياً كل دقيقتين عبر السيرفر — يستمر حتى لو أغلقت الموقع
              </p>
            </div>
            <Button onClick={fetchQueueStats} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 ml-1" />
              تحديث
            </Button>
          </div>
          {queueStats ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded border bg-background p-2">
                  <div className="text-muted-foreground">في الانتظار</div>
                  <div className="text-lg font-bold text-yellow-600">{queueStats.pending.toLocaleString()}</div>
                </div>
                <div className="rounded border bg-background p-2">
                  <div className="text-muted-foreground">قيد المعالجة</div>
                  <div className="text-lg font-bold text-blue-600">{queueStats.processing.toLocaleString()}</div>
                </div>
                <div className="rounded border bg-background p-2">
                  <div className="text-muted-foreground">مكتمل</div>
                  <div className="text-lg font-bold text-emerald-600">{queueStats.completed.toLocaleString()}</div>
                </div>
                <div className="rounded border bg-background p-2">
                  <div className="text-muted-foreground">فشل</div>
                  <div className="text-lg font-bold text-red-600">{queueStats.failed.toLocaleString()}</div>
                </div>
              </div>
              {(() => {
                const total = queueStats.pending + queueStats.processing + queueStats.completed + queueStats.failed;
                const done = queueStats.completed + queueStats.failed;
                const pct = total > 0 ? (done / total) * 100 : 0;
                return (
                  <div className="space-y-1">
                    <Progress value={pct} className="h-2" />
                    <div className="text-xs text-muted-foreground text-center">
                      {done.toLocaleString()} / {total.toLocaleString()} ({pct.toFixed(1)}%)
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">جاري تحميل حالة الطابور...</div>
          )}
        </CardContent>
      </Card>

      {/* لوحة الاستخراج التلقائي */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                الاستخراج التلقائي الشامل
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                إجمالي: {books.length} | مستخرج: {completedCount} | بحاجة لاستخراج: {pendingCount}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              {bulkState === 'idle' && (
                <Button onClick={startBulkExtraction} disabled={pendingCount === 0} size="sm">
                  <Play className="h-4 w-4 ml-1" />
                  استخراج الكل ({pendingCount})
                </Button>
              )}
              {bulkState === 'running' && (
                <>
                  <Button onClick={pauseBulk} variant="outline" size="sm">
                    <Pause className="h-4 w-4 ml-1" />
                    إيقاف مؤقت
                  </Button>
                  <Button onClick={stopBulk} variant="destructive" size="sm">
                    <Square className="h-4 w-4 ml-1" />
                    إيقاف
                  </Button>
                </>
              )}
              {bulkState === 'paused' && (
                <>
                  <Button onClick={resumeBulk} size="sm">
                    <Play className="h-4 w-4 ml-1" />
                    استئناف
                  </Button>
                  <Button onClick={stopBulk} variant="destructive" size="sm">
                    <Square className="h-4 w-4 ml-1" />
                    إيقاف
                  </Button>
                </>
              )}
            </div>
          </div>

          {bulkState !== 'idle' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate flex-1">
                  {bulkState === 'paused' ? '⏸️ متوقف مؤقتاً - ' : '⚙️ جاري: '}
                  <span className="font-medium text-foreground">{bulkProgress.currentTitle}</span>
                </span>
                <span className="font-medium whitespace-nowrap mr-2">
                  {bulkProgress.done}/{bulkProgress.total}
                  {bulkProgress.failed > 0 && <span className="text-destructive"> (فشل: {bulkProgress.failed})</span>}
                </span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن كتاب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={fetchBooks} variant="outline" size="sm" disabled={bulkState !== 'idle'}>
          <RefreshCw className="h-4 w-4 ml-1" />
          تحديث
        </Button>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد كتب مطابقة للبحث
        </div>
      ) : (
        <List
          rowComponent={BookRow}
          rowCount={filteredBooks.length}
          rowHeight={140}
          rowProps={{ books: filteredBooks }}
          overscanCount={4}
          style={{ height: 'calc(100vh - 360px)', minHeight: 400 }}
        />
      )}

      <ExtractedTextDialog viewText={viewText} onClose={() => setViewText(null)} />
    </div>
  );
};

// === مكوّن عرض النص المستخرج مع تقسيم لصفحات ===
const TEXT_PAGE_SIZE = 5000; // عدد الأحرف في الصفحة

const ExtractedTextDialog: React.FC<{
  viewText: { bookTitle: string; text: string } | null;
  onClose: () => void;
}> = ({ viewText, onClose }) => {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [viewText]);

  const pages = useMemo(() => {
    if (!viewText?.text) return [];
    const text = viewText.text;
    const result: string[] = [];
    for (let i = 0; i < text.length; i += TEXT_PAGE_SIZE) {
      result.push(text.slice(i, i + TEXT_PAGE_SIZE));
    }
    return result;
  }, [viewText]);

  const totalPages = pages.length;
  const currentText = pages[page] || '';

  return (
    <Dialog open={!!viewText} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">النص المستخرج - {viewText?.bookTitle}</DialogTitle>
        </DialogHeader>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              السابق
            </Button>
            <span className="text-muted-foreground text-center flex-1">
              صفحة {page + 1} من {totalPages} • {viewText?.text.length.toLocaleString()} حرف
            </span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              التالي
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto rounded border p-4 bg-muted/20" dir="rtl">
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed break-words">
            {currentText}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TextExtractionManager;
