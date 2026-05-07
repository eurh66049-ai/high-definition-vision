import { useState, useEffect } from "react";
import { supabase, supabaseFunctions } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Droplet, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProcessResult {
  bookId: string;
  title: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  newUrl?: string;
}

interface Stats {
  total: number;
  withWatermark: number;
  withoutWatermark: number;
}

export function BatchWatermarkManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [progress, setProgress] = useState({ total: 0, success: 0, failed: 0, skipped: 0 });
  const [stats, setStats] = useState<Stats>({ total: 0, withWatermark: 0, withoutWatermark: 0 });
  const { toast } = useToast();

  // جلب الإحصائيات عند تحميل المكون
  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const { data, error } = await supabaseFunctions.functions.invoke('batch-add-watermarks', {
        body: { getStatsOnly: true }
      });

      if (error) throw error;
      
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("❌ خطأ في جلب الإحصائيات:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // جلب الإحصائيات عند تحميل المكون
  useEffect(() => {
    loadStats();
  }, []);

  const handleBatchWatermark = async () => {
    try {
      setIsProcessing(true);
      setResults([]);
      setProgress({ total: 0, success: 0, failed: 0, skipped: 0 });

      console.log("🚀 بدء معالجة الكتب...");

      toast({
        title: "⏳ جاري المعالجة...",
        description: "يتم الآن إضافة الشعار على الكتب التي لا تحتوي على شعار",
      });

      // معالجة الكتب على دفعات
      let hasMore = true;
      const allResults: ProcessResult[] = [];

      while (hasMore) {
        console.log("📦 معالجة دفعة جديدة...");
        
        const { data, error } = await supabaseFunctions.functions.invoke('batch-add-watermarks', {
          body: { batchSize: 5 }
        });

        console.log("📨 استجابة الدالة:", { data, error });

        if (error) {
          console.error("❌ خطأ في استدعاء الدالة:", error);
          throw error;
        }

        if (!data) {
          console.error("❌ لا توجد بيانات في الاستجابة");
          throw new Error("لا توجد بيانات في الاستجابة");
        }

        if (data.results && data.results.length > 0) {
          console.log(`✅ تمت معالجة ${data.results.length} كتاب في هذه الدفعة`);
          allResults.push(...data.results);
          setResults([...allResults]);
          
          // تحديث الإحصائيات
          const newProgress = {
            total: allResults.length,
            success: allResults.filter(r => r.status === 'success').length,
            failed: allResults.filter(r => r.status === 'failed').length,
            skipped: allResults.filter(r => r.status === 'skipped').length,
          };
          setProgress(newProgress);
          
          // إذا كان عدد النتائج أقل من حجم الدفعة، فهذا يعني أننا انتهينا
          if (data.results.length < 5) {
            console.log("✅ انتهت جميع الدفعات");
            hasMore = false;
          }
        } else {
          console.log("ℹ️ لا توجد كتب للمعالجة");
          hasMore = false;
        }

        // انتظار قصير بين الدفعات
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const finalSuccess = allResults.filter(r => r.status === 'success').length;
      
      toast({
        title: "✅ اكتملت المعالجة",
        description: `تمت معالجة ${finalSuccess} كتاب بنجاح من أصل ${allResults.length}`,
      });

      console.log("🎉 اكتملت جميع العمليات بنجاح");
      
      // تحديث الإحصائيات بعد الانتهاء
      await loadStats();

    } catch (error) {
      console.error("❌ خطأ في معالجة الكتب:", error);
      toast({
        title: "❌ خطأ في المعالجة",
        description: error.message || "حدث خطأ أثناء معالجة الكتب",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const progressPercentage = progress.total > 0 
    ? ((progress.success + progress.failed + progress.skipped) / progress.total) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplet className="h-5 w-5" />
          إضافة الشعار على جميع الكتب
        </CardTitle>
        <CardDescription>
          إضافة شعار الموقع تلقائياً على جميع الكتب القديمة التي لا تحتوي على شعار
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* عرض الإحصائيات */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground">إجمالي الكتب</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.withWatermark}</div>
            <div className="text-xs text-muted-foreground">بها شعار</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.withoutWatermark}</div>
            <div className="text-xs text-muted-foreground">بدون شعار</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleBatchWatermark}
            disabled={isProcessing || isLoadingStats || stats.withoutWatermark === 0}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Droplet className="ml-2 h-4 w-4" />
                بدء إضافة الشعار ({stats.withoutWatermark} كتاب)
              </>
            )}
          </Button>
          
          <Button
            onClick={loadStats}
            disabled={isLoadingStats || isProcessing}
            variant="outline"
          >
            {isLoadingStats ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              "تحديث الإحصائيات"
            )}
          </Button>
        </div>

        {progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>التقدم</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>نجح: {progress.success}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>فشل: {progress.failed}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">تخطي: {progress.skipped}</span>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-semibold">النتائج:</h4>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-sm ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20'
                    : result.status === 'failed'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  {result.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : result.status === 'failed' ? (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <span className="text-muted-foreground">⏭️</span>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">{result.error}</div>
                    )}
                    {result.status === 'skipped' && (
                      <div className="text-xs text-muted-foreground mt-1">تم تخطي الكتاب</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
