import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  FileText, 
  Image, 
  User,
  Download,
  ExternalLink 
} from 'lucide-react';
import { useFileIntegrityChecker } from '@/hooks/useFileIntegrityChecker';
import { toast } from 'sonner';

export const FileIntegrityDashboard: React.FC = () => {
  const {
    integrityStatus,
    missingFiles,
    loading,
    error,
    checkFileIntegrity,
    restoreMissingFiles
  } = useFileIntegrityChecker();

  const [showDetails, setShowDetails] = useState(false);

  // إحصائيات سريعة
  const stats = {
    totalBooks: integrityStatus.length,
    booksWithMissingFiles: integrityStatus.filter(book => 
      book.missing_cover || book.missing_pdf || book.missing_author_image
    ).length,
    missingCovers: integrityStatus.filter(book => book.missing_cover).length,
    missingPDFs: integrityStatus.filter(book => book.missing_pdf).length,
    missingAuthorImages: integrityStatus.filter(book => book.missing_author_image).length,
    totalMissingFiles: missingFiles.length
  };

  const handleExportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      stats,
      missingFiles: missingFiles.map(file => ({
        book_id: file.book_id,
        file_type: file.file_type,
        file_url: file.file_url,
        error_message: file.error_message,
        reported_at: file.reported_at,
        status: file.status
      })),
      booksWithIssues: integrityStatus.filter(book => 
        book.missing_cover || book.missing_pdf || book.missing_author_image
      )
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `file-integrity-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    toast.success('تم تحميل تقرير سلامة الملفات');
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 space-x-reverse">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">خطأ في تحميل بيانات سلامة الملفات: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-amiri">لوحة مراقبة سلامة الملفات</h1>
          <p className="text-gray-600 font-cairo">مراقبة وإدارة ملفات الكتب المفقودة</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={checkFileIntegrity}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            فحص شامل
          </Button>
          
          <Button
            onClick={restoreMissingFiles}
            disabled={loading}
            variant="outline"
          >
            🔧 استعادة
          </Button>
          
          <Button
            onClick={handleExportReport}
            variant="outline"
          >
            <Download className="ml-2 h-4 w-4" />
            تحميل التقرير
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الكتب</p>
                <p className="text-2xl font-bold font-amiri">{stats.totalBooks}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">كتب بملفات مفقودة</p>
                <p className="text-2xl font-bold font-amiri text-red-600">{stats.booksWithMissingFiles}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">أغلفة مفقودة</p>
                <p className="text-2xl font-bold font-amiri text-orange-600">{stats.missingCovers}</p>
              </div>
              <Image className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ملفات PDF مفقودة</p>
                <p className="text-2xl font-bold font-amiri text-red-600">{stats.missingPDFs}</p>
              </div>
              <FileText className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Books with Missing Files */}
      {stats.booksWithMissingFiles > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-amiri">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              كتب تحتاج إلى مراجعة ({stats.booksWithMissingFiles})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrityStatus
                .filter(book => book.missing_cover || book.missing_pdf || book.missing_author_image)
                .slice(0, showDetails ? undefined : 5)
                .map((book) => (
                  <div key={book.book_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold font-amiri">{book.title}</h3>
                        <p className="text-sm text-gray-600">ID: {book.book_id}</p>
                      </div>
                      
                      <div className="flex gap-1">
                        {book.missing_cover && (
                          <Badge variant="destructive" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            غلاف
                          </Badge>
                        )}
                        {book.missing_pdf && (
                          <Badge variant="destructive" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            PDF
                          </Badge>
                        )}
                        {book.missing_author_image && (
                          <Badge variant="destructive" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            مؤلف
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {book.cover_url && (
                        <div className="flex items-center gap-1">
                          <span className={book.missing_cover ? 'text-red-600' : 'text-green-600'}>
                            {book.missing_cover ? '❌' : '✅'}
                          </span>
                          <span className="truncate">غلاف: {book.cover_url.split('/').pop()}</span>
                        </div>
                      )}
                      {book.pdf_url && (
                        <div className="flex items-center gap-1">
                          <span className={book.missing_pdf ? 'text-red-600' : 'text-green-600'}>
                            {book.missing_pdf ? '❌' : '✅'}
                          </span>
                          <span className="truncate">PDF: {book.pdf_url.split('/').pop()}</span>
                        </div>
                      )}
                      {book.author_image_url && (
                        <div className="flex items-center gap-1">
                          <span className={book.missing_author_image ? 'text-red-600' : 'text-green-600'}>
                            {book.missing_author_image ? '❌' : '✅'}
                          </span>
                          <span className="truncate">مؤلف: {book.author_image_url.split('/').pop()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              
              {stats.booksWithMissingFiles > 5 && (
                <Button
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full"
                >
                  {showDetails ? 'عرض أقل' : `عرض جميع الكتب (${stats.booksWithMissingFiles})`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {stats.booksWithMissingFiles === 0 && stats.totalBooks > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 space-x-reverse">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700 font-medium">
                🎉 ممتاز! جميع ملفات الكتب ({stats.totalBooks}) موجودة وسليمة
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Missing Files Log */}
      {missingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-amiri">سجل الملفات المفقودة الأخيرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingFiles.slice(0, 10).map((file) => (
                <div key={file.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">{file.file_type}</span>
                    <span className="text-sm text-gray-600 mr-2">
                      {new Date(file.reported_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <Badge variant={file.status === 'fixed' ? 'default' : 'destructive'}>
                    {file.status === 'fixed' ? 'تم الإصلاح' : 'مُبلّغ عنه'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};