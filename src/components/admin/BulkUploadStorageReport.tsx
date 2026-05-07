import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Link2 } from 'lucide-react';

export interface BulkUploadStorageReportItem {
  success: boolean;
  title?: string;
  author?: string;
  inserted_id?: string;
  cover_uploaded_to_supabase?: boolean;
  book_uploaded_to_supabase?: boolean;
  cover_image_url?: string | null;
  book_file_url?: string | null;
  original_cover_image_url?: string | null;
  original_book_file_url?: string | null;
  error?: string;
}

interface BulkUploadStorageReportProps {
  items: BulkUploadStorageReportItem[];
}

const BulkUploadStorageReport: React.FC<BulkUploadStorageReportProps> = ({ items }) => {
  const total = items.length;
  const successCount = items.filter((i) => i.success).length;
  const failedItems = items.filter((i) => !i.success);

  const coverConverted = items.filter((i) => i.success && i.cover_uploaded_to_supabase).length;
  const coverNotConverted = items.filter((i) => i.success && i.cover_uploaded_to_supabase === false).length;

  const fileConverted = items.filter((i) => i.success && i.book_uploaded_to_supabase).length;
  const fileNotConverted = items.filter((i) => i.success && i.book_uploaded_to_supabase === false).length;

  const conversionIssues = items.filter(
    (i) => i.success && (i.cover_uploaded_to_supabase === false || i.book_uploaded_to_supabase === false)
  );

  const hasIssues = failedItems.length > 0 || conversionIssues.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasIssues ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          التحقق بعد الرفع (تحويل الروابط إلى Supabase)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">إجمالي: {total}</Badge>
          <Badge variant="default">نجح: {successCount}</Badge>
          {failedItems.length > 0 && <Badge variant="destructive">فشل: {failedItems.length}</Badge>}
          <Badge variant="outline">أغلفة تحولت: {coverConverted}</Badge>
          {coverNotConverted > 0 && <Badge variant="destructive">أغلفة لم تتحول: {coverNotConverted}</Badge>}
          <Badge variant="outline">ملفات تحولت: {fileConverted}</Badge>
          {fileNotConverted > 0 && <Badge variant="destructive">ملفات لم تتحول: {fileNotConverted}</Badge>}
        </div>

        {hasIssues && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              بعض الكتب تم إدراجها لكن روابط الغلاف/الملف بقيت كما هي (لم تُرفع إلى Supabase)، أو حدث فشل كامل أثناء الرفع.
            </AlertDescription>
          </Alert>
        )}

        {(failedItems.length > 0 || conversionIssues.length > 0) && (
          <div className="space-y-2">
            <div className="text-sm font-medium">الكتب التي تحتاج مراجعة:</div>
            <ScrollArea className="h-72 border rounded-lg">
              <div className="p-3 space-y-3">
                {failedItems.map((item, idx) => (
                  <div key={`fail-${idx}`} className="rounded-lg border p-3 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{item.title || 'كتاب غير محدد'}</div>
                        {item.author && <div className="text-xs text-muted-foreground truncate">{item.author}</div>}
                      </div>
                      <Badge variant="destructive">فشل</Badge>
                    </div>
                    {item.error && <div className="mt-2 text-xs text-muted-foreground">{item.error}</div>}
                  </div>
                ))}

                {conversionIssues.map((item, idx) => (
                  <div key={`conv-${idx}`} className="rounded-lg border p-3 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{item.title || 'كتاب غير محدد'}</div>
                        {item.author && <div className="text-xs text-muted-foreground truncate">{item.author}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.cover_uploaded_to_supabase === false && <Badge variant="destructive">غلاف لم يتحول</Badge>}
                        {item.book_uploaded_to_supabase === false && <Badge variant="destructive">PDF لم يتحول</Badge>}
                      </div>
                    </div>

                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <Link2 className="h-3 w-3" />
                        عرض الروابط
                      </summary>
                      <div className="mt-2 space-y-2 break-all">
                        <div>
                          <div className="font-medium">الغلاف</div>
                          <div className="text-muted-foreground">الأصلي: {item.original_cover_image_url || '—'}</div>
                          <div className="text-muted-foreground">بعد الرفع: {item.cover_image_url || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium">ملف الكتاب</div>
                          <div className="text-muted-foreground">الأصلي: {item.original_book_file_url || '—'}</div>
                          <div className="text-muted-foreground">بعد الرفع: {item.book_file_url || '—'}</div>
                        </div>
                      </div>
                    </details>
                  </div>
                ))}

                {!hasIssues && (
                  <div className="text-sm text-muted-foreground text-center py-6">لا توجد مشاكل</div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkUploadStorageReport;
