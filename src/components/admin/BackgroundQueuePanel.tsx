import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CloudUpload, RefreshCw, Trash2, Zap, Layers } from 'lucide-react';

interface SimpleBook {
  title: string;
  cover_image_url?: string;
  book_file_url: string;
}

interface BackgroundQueuePanelProps {
  books: SimpleBook[];
  disabled?: boolean;
  onEnqueued?: () => void;
}

interface BatchStats {
  batch_label: string;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  duplicate: number;
  total: number;
  first_created_at: string | null;
  last_updated_at: string | null;
}

const EMPTY_COUNTS = { pending: 0, processing: 0, success: 0, failed: 0, duplicate: 0 };

const BackgroundQueuePanel: React.FC<BackgroundQueuePanelProps> = ({ books, disabled, onEnqueued }) => {
  const { toast } = useToast();
  const [batches, setBatches] = useState<BatchStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [enqueuing, setEnqueuing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [batchName, setBatchName] = useState('');

  const refreshStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('bulk_upload_queue_stats_by_batch');
      if (error) throw error;

      const map = new Map<string, BatchStats>();
      (data as Array<{
        batch_label: string;
        status: string;
        count: number;
        first_created_at: string;
        last_updated_at: string;
      }> | null)?.forEach((row) => {
        const label = row.batch_label || 'غير مسماة';
        const existing = map.get(label) || {
          batch_label: label,
          ...EMPTY_COUNTS,
          total: 0,
          first_created_at: null as string | null,
          last_updated_at: null as string | null,
        };
        if (row.status in EMPTY_COUNTS) {
          (existing as any)[row.status] = Number(row.count) || 0;
        }
        existing.total += Number(row.count) || 0;
        if (!existing.first_created_at || (row.first_created_at && row.first_created_at < existing.first_created_at)) {
          existing.first_created_at = row.first_created_at;
        }
        if (!existing.last_updated_at || (row.last_updated_at && row.last_updated_at > existing.last_updated_at)) {
          existing.last_updated_at = row.last_updated_at;
        }
        map.set(label, existing);
      });

      const list = Array.from(map.values()).sort((a, b) => {
        const aTime = a.first_created_at ? new Date(a.first_created_at).getTime() : 0;
        const bTime = b.first_created_at ? new Date(b.first_created_at).getTime() : 0;
        return bTime - aTime;
      });
      setBatches(list);
    } catch (err: any) {
      console.error('queue stats error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10_000);
    return () => clearInterval(interval);
  }, []);

  const totals = useMemo(() => {
    return batches.reduce(
      (acc, b) => ({
        pending: acc.pending + b.pending,
        processing: acc.processing + b.processing,
        success: acc.success + b.success,
        failed: acc.failed + b.failed,
        duplicate: acc.duplicate + b.duplicate,
      }),
      { ...EMPTY_COUNTS },
    );
  }, [batches]);

  const enqueueBooks = async () => {
    if (books.length === 0) {
      toast({ title: 'لا توجد كتب', description: 'حضّر قائمة الكتب أولاً', variant: 'destructive' });
      return;
    }
    setEnqueuing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? null;
      const userId = userData.user?.id ?? null;

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const customName = batchName.trim();
      const batchLabel = customName ? `${customName} • ${stamp}` : `دفعة ${stamp}`;

      const rows = books.map((b) => ({
        title: b.title.trim(),
        book_file_url: b.book_file_url.trim(),
        cover_image_url: b.cover_image_url?.trim() || null,
        status: 'pending',
        created_by: userId,
        created_by_email: email,
        batch_label: batchLabel,
      }));

      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const { error } = await supabase.from('bulk_upload_queue').insert(slice);
        if (error) throw error;
      }

      toast({
        title: 'تمت إضافة دفعة جديدة',
        description: `${rows.length} كتاب • ${batchLabel} — سيستمر الرفع تلقائياً في الخلفية`,
      });
      setBatchName('');
      onEnqueued?.();
      triggerNow(true);
    } catch (err: any) {
      toast({ title: 'فشل الإضافة', description: err.message || 'خطأ غير معروف', variant: 'destructive' });
    } finally {
      setEnqueuing(false);
      refreshStats();
    }
  };

  const triggerNow = async (silent = false) => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-bulk-upload-queue', { body: {} });
      if (error) throw error;
      if (!silent) {
        toast({
          title: 'تم تشغيل المعالج',
          description: data?.processed
            ? `جارٍ معالجة ${data.processed} كتاب`
            : 'لا توجد عناصر معلّقة حالياً',
        });
      }
    } catch (err: any) {
      if (!silent) {
        toast({ title: 'فشل تشغيل المعالج', description: err.message, variant: 'destructive' });
      }
    } finally {
      setTriggering(false);
      refreshStats();
    }
  };

  const clearFinishedBatch = async (label?: string) => {
    const msg = label
      ? `حذف سجلات النجاح/الفشل/التكرار من دفعة "${label}"؟`
      : 'حذف كل سجلات النجاح/الفشل/التكرار من جميع الدفعات؟';
    if (!confirm(msg)) return;
    try {
      let q = supabase
        .from('bulk_upload_queue')
        .delete()
        .in('status', ['success', 'failed', 'duplicate']);
      if (label) q = q.eq('batch_label', label);
      const { error } = await q;
      if (error) throw error;
      toast({ title: 'تم التنظيف' });
      refreshStats();
    } catch (err: any) {
      toast({ title: 'فشل الحذف', description: err.message, variant: 'destructive' });
    }
  };

  const cancelPendingBatch = async (label: string) => {
    if (!confirm(`إلغاء الكتب المعلّقة في دفعة "${label}"؟`)) return;
    try {
      const { error } = await supabase
        .from('bulk_upload_queue')
        .delete()
        .eq('batch_label', label)
        .eq('status', 'pending');
      if (error) throw error;
      toast({ title: 'تم إلغاء الكتب المعلّقة' });
      refreshStats();
    } catch (err: any) {
      toast({ title: 'فشل الإلغاء', description: err.message, variant: 'destructive' });
    }
  };

  const totalActive = totals.pending + totals.processing;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudUpload className="h-5 w-5 text-primary" />
          الرفع في الخلفية — دفعات متعددة متوازية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            أضف عدة دفعات في أي وقت دون انتظار اكتمال السابقة. يعالج الخادم 5 كتب في الدقيقة من جميع الدفعات. كل دفعة لها إحصائيات مستقلة.
          </AlertDescription>
        </Alert>

        {/* إضافة دفعة جديدة */}
        <div className="flex flex-wrap gap-2 items-center rounded-lg border p-3 bg-muted/30">
          <Input
            placeholder="اسم الدفعة (اختياري) — مثال: كتب الأدب"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            disabled={enqueuing}
            className="flex-1 min-w-[200px]"
          />
          <Button
            onClick={enqueueBooks}
            disabled={disabled || enqueuing || books.length === 0}
            className="min-w-[200px]"
          >
            <CloudUpload className="ml-2 h-4 w-4" />
            {enqueuing ? 'جارِ الإضافة...' : `أضف ${books.length} كتاب كدفعة جديدة`}
          </Button>
        </div>

        {/* أزرار عامة */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => triggerNow(false)} disabled={triggering}>
            <Zap className="ml-2 h-4 w-4" />
            {triggering ? 'جارٍ التشغيل...' : 'تشغيل الآن'}
          </Button>
          <Button variant="ghost" size="icon" onClick={refreshStats} disabled={loading} title="تحديث">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => clearFinishedBatch()} title="حذف المكتمل من جميع الدفعات">
            <Trash2 className="ml-2 h-4 w-4" />
            تنظيف الكل
          </Button>
        </div>

        {/* الإجمالي */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="rounded-lg border p-2">
            <div className="text-2xl font-bold tabular-nums">{totals.pending}</div>
            <div className="text-muted-foreground">في الانتظار</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-2xl font-bold tabular-nums text-blue-600">{totals.processing}</div>
            <div className="text-muted-foreground">قيد المعالجة</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-2xl font-bold tabular-nums text-green-600">{totals.success}</div>
            <div className="text-muted-foreground">نجح</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-2xl font-bold tabular-nums text-amber-600">{totals.duplicate}</div>
            <div className="text-muted-foreground">مكرر</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-2xl font-bold tabular-nums text-red-600">{totals.failed}</div>
            <div className="text-muted-foreground">فشل</div>
          </div>
        </div>

        {totalActive > 0 && (
          <Badge variant="secondary" className="w-full justify-center py-2">
            {totalActive} كتاب نشط في الخلفية — يعمل تلقائياً كل دقيقة
          </Badge>
        )}

        {/* قائمة الدفعات */}
        {batches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Layers className="h-4 w-4" />
              الدفعات ({batches.length})
            </div>

            {batches.map((batch) => {
              const done = batch.success + batch.failed + batch.duplicate;
              const pct = batch.total > 0 ? Math.round((done / batch.total) * 100) : 0;
              const isActive = batch.pending + batch.processing > 0;

              return (
                <div key={batch.batch_label} className="rounded-lg border p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {batch.batch_label}
                        {isActive && (
                          <Badge variant="default" className="text-[10px] py-0 h-5">
                            نشطة
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {batch.total} كتاب • {pct}% مكتمل
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {batch.pending > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelPendingBatch(batch.batch_label)}
                          title="إلغاء المعلّق"
                        >
                          إلغاء المعلّق
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => clearFinishedBatch(batch.batch_label)}
                        title="حذف المكتمل من هذه الدفعة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Progress value={pct} className="h-2" />

                  <div className="grid grid-cols-5 gap-1 text-center text-[11px]">
                    <div>
                      <div className="font-bold tabular-nums">{batch.pending}</div>
                      <div className="text-muted-foreground">انتظار</div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums text-blue-600">{batch.processing}</div>
                      <div className="text-muted-foreground">معالجة</div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums text-green-600">{batch.success}</div>
                      <div className="text-muted-foreground">نجح</div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums text-amber-600">{batch.duplicate}</div>
                      <div className="text-muted-foreground">مكرر</div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums text-red-600">{batch.failed}</div>
                      <div className="text-muted-foreground">فشل</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BackgroundQueuePanel;
