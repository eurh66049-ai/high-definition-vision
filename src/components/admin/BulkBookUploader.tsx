import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { Upload, Download, AlertTriangle, CheckCircle, FileText, X, Info, Pause, Play, Plus } from 'lucide-react';
import Papa from 'papaparse';
import FileValidationChecker from './FileValidationChecker';
import BulkUploadStorageReport, { type BulkUploadStorageReportItem } from './BulkUploadStorageReport';

interface CSVBook {
  title: string;
  author: string;
  category: string;
  description: string;
  language: string;
  cover_image_url?: string;
  book_file_url?: string;
  publication_year?: number;
  page_count?: number;
  publisher?: string;
  translator?: string;
  display_type?: string;
  file_type?: string;
  subtitle?: string;
  author_bio?: string;
  author_image_url?: string;
  author_website?: string;
  author_country_code?: string;
  author_country_name?: string;
  file_size?: number;
  user_email?: string;
  volume?: string | number;
}

interface BulkBookUploaderProps {
  onUploadComplete: () => void;
}

const BATCH_SIZE = 15;

const BulkBookUploader: React.FC<BulkBookUploaderProps> = ({ onUploadComplete }) => {
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<CSVBook[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [currentBookTitle, setCurrentBookTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[]; duplicates: number }>({
    success: 0, failed: 0, errors: [], duplicates: 0
  });
  const [postUploadItems, setPostUploadItems] = useState<BulkUploadStorageReportItem[]>([]);
  const [failedBooks, setFailedBooks] = useState<CSVBook[]>([]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const { toast } = useToast();
  const [fileSlots, setFileSlots] = useState<number[]>([0]);

  const requiredFields = ['title', 'author', 'category', 'description', 'language'];
  
  const sampleCSV = `title,author,category,description,language,cover_image_url,book_file_url,publication_year,page_count,publisher,translator,display_type,file_type,subtitle,author_bio,author_image_url,author_website,author_country_code,author_country_name,file_size,user_email,volume
كتاب تجريبي,مؤلف تجريبي,novels,وصف الكتاب التجريبي,ar,https://example.com/cover.jpg,https://example.com/book.pdf,2024,200,دار النشر,المترجم,download_read,application/pdf,العنوان الفرعي,نبذة عن المؤلف,https://example.com/author.jpg,https://author.com,EG,مصر,2048000,admin@example.com,1`;

  const downloadSampleCSV = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample-books.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVFile = (file: File): Promise<{ valid: CSVBook[]; errors: string[] }> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          const books = results.data as CSVBook[];
          const validBooks: CSVBook[] = [];
          const errors: string[] = [];

          books.forEach((book, index) => {
            const missingFields = requiredFields.filter(field => !book[field as keyof CSVBook] || book[field as keyof CSVBook]?.toString().trim() === '');
            if (missingFields.length > 0) {
              errors.push(`${file.name} - الصف ${index + 1}: حقول مفقودة (${missingFields.join(', ')})`);
            } else {
              validBooks.push({
                title: book.title.trim(),
                author: book.author.trim(),
                category: book.category.trim(),
                description: book.description.trim(),
                language: book.language.trim(),
                cover_image_url: book.cover_image_url?.trim() || '',
                book_file_url: book.book_file_url?.trim() || '',
                publication_year: book.publication_year ? parseInt(book.publication_year.toString()) : undefined,
                page_count: book.page_count ? parseInt(book.page_count.toString()) : undefined,
                publisher: book.publisher?.trim() || '',
                translator: book.translator?.trim() || '',
                display_type: book.display_type?.trim() || 'download_read',
                file_type: book.file_type?.trim() || 'application/pdf',
                subtitle: book.subtitle?.trim() || '',
                author_bio: book.author_bio?.trim() || '',
                author_image_url: book.author_image_url?.trim() || '',
                author_website: book.author_website?.trim() || '',
                author_country_code: book.author_country_code?.trim() || '',
                author_country_name: book.author_country_name?.trim() || '',
                file_size: book.file_size ? parseInt(book.file_size.toString()) : undefined,
                user_email: book.user_email?.trim() || '',
                volume: book.volume?.toString().trim() || ''
              });
            }
          });

          resolve({ valid: validBooks, errors });
        },
        error: () => {
          resolve({ valid: [], errors: [`${file.name}: خطأ في تحليل الملف`] });
        }
      });
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!(file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      toast({ title: "نوع ملف غير صحيح", description: "يرجى اختيار ملف CSV", variant: "destructive" });
      return;
    }

    setCsvFiles(prev => {
      const updated = [...prev];
      updated[slotIndex] = file;
      return updated;
    });

    // Re-parse all files
    const allFiles = [...csvFiles];
    allFiles[slotIndex] = file;
    await parseAllFiles(allFiles.filter(Boolean));
  };

  const parseAllFiles = async (files: File[]) => {
    let allValid: CSVBook[] = [];
    let allErrors: string[] = [];

    for (const file of files) {
      const { valid, errors } = await parseCSVFile(file);
      allValid = [...allValid, ...valid];
      allErrors = [...allErrors, ...errors];
    }

    if (allErrors.length > 0) {
      setResults(prev => ({ ...prev, errors: allErrors }));
    }

    setPreview(allValid);
    if (allValid.length > 0) {
      toast({ title: "تم تحليل الملفات", description: `${allValid.length} كتاب صالح للرفع من ${files.length} ملف` });
    }
  };

  const addFileSlot = () => {
    setFileSlots(prev => [...prev, prev.length]);
  };

  const removeFileSlot = (slotIndex: number) => {
    if (fileSlots.length <= 1) return;
    setFileSlots(prev => prev.filter((_, i) => i !== slotIndex));
    setCsvFiles(prev => {
      const updated = [...prev];
      updated.splice(slotIndex, 1);
      return updated;
    });
    // Re-parse remaining files
    const remaining = [...csvFiles];
    remaining.splice(slotIndex, 1);
    parseAllFiles(remaining.filter(Boolean));
  };

  const uploadBatchToServer = async (books: CSVBook[]): Promise<{
    results: Array<{ success: boolean; data?: any; error?: string; duplicate?: boolean; title?: string }>;
  }> => {
    try {
      const { data, error } = await supabaseFunctions.functions.invoke('bulk-upload-books-batch', {
        body: { books }
      });

      if (error) {
        // في حالة فشل الاتصال، نعيد فشل لكل كتاب
        return {
          results: books.map(b => ({ success: false, error: error.message, title: b.title }))
        };
      }

      if (data?.results) {
        return { results: data.results };
      }

      return {
        results: books.map(b => ({ success: false, error: data?.error || 'فشل غير معروف', title: b.title }))
      };
    } catch (err) {
      return {
        results: books.map(b => ({ success: false, error: err instanceof Error ? err.message : 'خطأ غير متوقع', title: b.title }))
      };
    }
  };

  const uploadBooks = useCallback(async () => {
    if (preview.length === 0) {
      toast({ title: "لا توجد كتب للرفع", variant: "destructive" });
      return;
    }

    setUploading(true);
    setPaused(false);
    pauseRef.current = false;
    cancelRef.current = false;
    setProgress(0);
    setFailedBooks([]);
    setResults({ success: 0, failed: 0, errors: [], duplicates: 0 });
    setPostUploadItems([]);

    const localResults = { success: 0, failed: 0, errors: [] as string[], duplicates: 0 };
    const localFailedBooks: CSVBook[] = [];
    let processed = 0;

    // تقسيم الكتب إلى دفعات وإرسال كل دفعة للخادم
    for (let batchStart = 0; batchStart < preview.length; batchStart += BATCH_SIZE) {
      if (cancelRef.current) break;

      while (pauseRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (cancelRef.current) break;
      }
      if (cancelRef.current) break;

      const batchEnd = Math.min(batchStart + BATCH_SIZE, preview.length);
      const batch = preview.slice(batchStart, batchEnd);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(preview.length / BATCH_SIZE);

      setCurrentBookIndex(batchStart + 1);
      setCurrentBookTitle(`دفعة ${batchNum}/${totalBatches} (${batch.length} كتب بالتوازي)`);
      setProgress((batchStart / preview.length) * 100);

      // إرسال الدفعة كاملة للخادم - يعالجها بالتوازي
      const batchResponse = await uploadBatchToServer(batch);

      for (let j = 0; j < batchResponse.results.length; j++) {
        const result = batchResponse.results[j];
        const book = batch[j];
        processed++;

        if (result.success) {
          localResults.success++;
          setPostUploadItems(prev => [...prev, result]);
        } else if (result.duplicate) {
          localResults.duplicates++;
          localResults.errors.push(`"${book.title}": مكرر`);
        } else {
          localResults.failed++;
          localResults.errors.push(`"${book.title}": ${result.error}`);
          localFailedBooks.push(book);
        }
      }

      setResults({ ...localResults });
      setProgress((processed / preview.length) * 100);
    }

    setProgress(100);
    setFailedBooks(localFailedBooks);
    setUploading(false);
    setCurrentBookTitle('');

    toast({
      title: localResults.success > 0 ? "تم رفع الكتب" : "فشل في الرفع",
      description: `نجح: ${localResults.success} | فشل: ${localResults.failed} | مكرر: ${localResults.duplicates}`,
      variant: localResults.failed === 0 ? "default" : "destructive"
    });

    if (localResults.success > 0) {
      onUploadComplete();
    }
  }, [preview, toast, onUploadComplete]);

  const togglePause = () => {
    pauseRef.current = !pauseRef.current;
    setPaused(pauseRef.current);
  };

  const cancelUpload = () => {
    cancelRef.current = true;
    pauseRef.current = false;
    setPaused(false);
  };

  const clearAll = () => {
    setCsvFiles([]);
    setPreview([]);
    setResults({ success: 0, failed: 0, errors: [], duplicates: 0 });
    setProgress(0);
    setFailedBooks([]);
    setPostUploadItems([]);
    setFileSlots([0]);
    fileInputRefs.current.forEach(ref => { if (ref) ref.value = ''; });
  };

  const getCategoryLabel = (categoryKey: string): string => {
    const categories: Record<string, string> = {
      'novels': 'روايات',
      'philosophy-culture': 'الفكر والثقافة العامة',
      'islamic-sciences': 'العلوم الإسلامية',
      'story-collections': 'مجموعة قصص',
      'poetry': 'الشعر',
      'texts-essays': 'نصوص وخواطر',
      'literature': 'الأدب',
      'history-civilizations': 'التاريخ والحضارات',
      'human-development': 'التنمية البشرية وتطوير الذات',
    };
    return categories[categoryKey] || categoryKey;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع كتب مجمعة عبر CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              يدعم رفع عدد غير محدود من الكتب من ملفات CSV متعددة. يتم معالجة {BATCH_SIZE} كتب بالتوازي في كل دفعة لتسريع الرفع.
              <Button variant="link" size="sm" onClick={downloadSampleCSV} className="p-0 h-auto mr-2">
                <Download className="h-4 w-4 ml-1" />
                تحميل ملف نموذج
              </Button>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label>ملفات CSV</Label>
            {fileSlots.map((_, slotIndex) => (
              <div key={slotIndex} className="flex items-center gap-2">
                <Input
                  ref={el => { fileInputRefs.current[slotIndex] = el; }}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e, slotIndex)}
                  disabled={uploading}
                  className="flex-1"
                />
                {csvFiles[slotIndex] && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                    <FileText className="h-4 w-4" />
                    <span className="max-w-[120px] truncate">{csvFiles[slotIndex].name}</span>
                  </div>
                )}
                {fileSlots.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeFileSlot(slotIndex)} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addFileSlot} disabled={uploading}>
              <Plus className="h-4 w-4 ml-1" />
              إضافة ملف CSV آخر
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => uploadBooks()} disabled={preview.length === 0 || uploading} className="flex-1">
              {uploading ? 'جاري الرفع...' : `رفع ${preview.length} كتاب`}
            </Button>
            
            {uploading && (
              <>
                <Button variant="outline" onClick={togglePause}>
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {paused ? 'استئناف' : 'إيقاف مؤقت'}
                </Button>
                <Button variant="destructive" onClick={cancelUpload}>
                  <X className="h-4 w-4 ml-1" />
                  إلغاء
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={clearAll} disabled={uploading}>
              <X className="h-4 w-4 ml-1" />
              مسح
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="text-sm text-center text-muted-foreground space-y-1">
                <p>
                  {paused ? '⏸️ متوقف مؤقتاً' : `📚 ${currentBookIndex}/${preview.length}`}
                  {currentBookTitle && ` — ${currentBookTitle}`}
                </p>
                <p className="text-xs">
                  ✅ {results.success} نجح | ❌ {results.failed} فشل | 🔄 {results.duplicates} مكرر
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(results.success > 0 || results.failed > 0 || results.duplicates > 0) && !uploading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.failed === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              نتائج الرفع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              {results.success > 0 && <Badge variant="default">نجح: {results.success}</Badge>}
              {results.failed > 0 && <Badge variant="destructive">فشل: {results.failed}</Badge>}
              {results.duplicates > 0 && <Badge variant="secondary">مكرر: {results.duplicates}</Badge>}
            </div>
            
            {results.errors.length > 0 && (
              <div className="space-y-2">
                <Label>الأخطاء ({results.errors.length}):</Label>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border max-h-60 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 dark:text-red-300">• {error}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {postUploadItems.length > 0 && <BulkUploadStorageReport items={postUploadItems} />}
      {preview.length > 0 && <FileValidationChecker books={preview} />}

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>معاينة البيانات ({preview.length} كتاب)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-right p-2">#</th>
                    <th className="text-right p-2">العنوان</th>
                    <th className="text-right p-2">المؤلف</th>
                    <th className="text-right p-2">التصنيف</th>
                    <th className="text-right p-2">اللغة</th>
                    <th className="text-right p-2">الغلاف</th>
                    <th className="text-right p-2">الملف</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((book, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2 max-w-48 truncate">{book.title}</td>
                      <td className="p-2">{book.author}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{getCategoryLabel(book.category)}</Badge>
                      </td>
                      <td className="p-2">{book.language}</td>
                      <td className="p-2">
                        {book.cover_image_url ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="p-2">
                        {book.book_file_url ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkBookUploader;
