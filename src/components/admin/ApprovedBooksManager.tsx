import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Eye, AlertTriangle, RefreshCw, BookOpen, Globe, Calendar, FileText, Building, User, ChevronDown, ExternalLink, CheckSquare, Square } from 'lucide-react';
import DeleteBookDialog from '@/components/admin/DeleteBookDialog';
import BulkDeleteBooksDialog from '@/components/admin/BulkDeleteBooksDialog';
import { useAdminApprovedBooks } from '@/hooks/useAdminApprovedBooks';
import { useToast } from '@/hooks/use-toast';
import { getLanguageInArabic } from '@/utils/languageTranslation';
import { optimizeImageUrl } from '@/utils/imageProxy';

interface ApprovedBooksManagerProps {
  onBookDeleted: () => void;
}

const ApprovedBooksManager: React.FC<ApprovedBooksManagerProps> = ({ onBookDeleted }) => {
  const navigate = useNavigate();
  const { 
    books, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    totalCount,
    searchQuery,
    loadMore,
    search,
    refetch
  } = useAdminApprovedBooks();
  
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleViewBookDetails = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  const handleSelectBook = (bookId: string, checked: boolean) => {
    const newSelection = new Set(selectedBooks);
    if (checked) {
      newSelection.add(bookId);
    } else {
      newSelection.delete(bookId);
    }
    setSelectedBooks(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allBookIds = new Set(books.map(book => book.id));
      setSelectedBooks(allBookIds);
    } else {
      setSelectedBooks(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedBooks(new Set());
  };

  const selectedBooksData = books
    .filter(book => selectedBooks.has(book.id))
    .map(book => ({ id: book.id, title: book.title }));

  // IntersectionObserver للـ infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  // البحث مع debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        search(localSearchQuery);
      }
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [localSearchQuery, search, searchQuery]);

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
      'memoirs-autobiographies': 'مذكرات وسير ذاتية',
      'philosophy-logic': 'الفلسفة والمنطق',
      'politics': 'السياسية',
      'children': 'الأطفال',
      'studies-research': 'دراسات وبحوث',
      'religion': 'الأديان',
      'plays-arts': 'مسرحيات وفنون',
      'psychology': 'علم النفس',
      'education-pedagogy': 'التعليم والتربية',
      'love-relationships': 'الحب والعلاقات',
    };
    
    return categories[categoryKey] || categoryKey;
  };

  const getDisplayTypeLabel = (displayType: string): string => {
    const displayTypes: Record<string, string> = {
      'download_read': 'تحميل وقراءة',
      'read_only': 'قراءة فقط',
      'download_only': 'تحميل فقط'
    };
    
    return displayTypes[displayType] || displayType;
  };

  const getFileTypeLabel = (fileType: string | null, fileUrl?: string | null): string => {
    // إذا كان file_type موجود، استخدمه
    if (fileType) {
      const fileTypes: Record<string, string> = {
        'application/pdf': 'ملف PDF',
        'application/epub+zip': 'كتاب إلكتروني EPUB',
        'application/x-mobipocket-ebook': 'كتاب Kindle',
        'text/plain': 'ملف نصي',
        'application/msword': 'مستند Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'مستند Word حديث'
      };
      return fileTypes[fileType] || fileType;
    }
    
    // إذا لم يكن file_type موجود، استنتج من امتداد الملف
    if (fileUrl) {
      const url = fileUrl.toLowerCase();
      if (url.includes('.pdf')) return 'ملف PDF';
      if (url.includes('.epub')) return 'كتاب إلكتروني EPUB';
      if (url.includes('.mobi')) return 'كتاب Kindle';
      if (url.includes('.txt')) return 'ملف نصي';
      if (url.includes('.doc') || url.includes('.docx')) return 'مستند Word';
    }
    
    return 'ملف PDF'; // افتراضي لأن معظم الكتب PDF
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">جاري تحميل الكتب المعتمدة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">خطأ في تحميل البيانات</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="ml-2 h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* شريط البحث والأدوات */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الكتب المعتمدة..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>إجمالي الكتب: {totalCount}</span>
            <span>معروض: {books.length}</span>
            {searchQuery && (
              <Badge variant="secondary" className="text-xs">
                نتائج البحث: "{searchQuery}"
              </Badge>
            )}
          </div>
        </div>

        {/* شريط التحديد المتعدد */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={books.length > 0 && selectedBooks.size === books.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                تحديد الكل ({books.length})
              </label>
            </div>
            
            {selectedBooks.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedBooks.size} محدد
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSelection}
                >
                  إلغاء التحديد
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedBooks.size > 0 && (
              <BulkDeleteBooksDialog 
                selectedBooks={selectedBooksData}
                onBooksDeleted={refetch}
                onSelectionCleared={clearSelection}
              />
            )}
          </div>
        </div>
      </div>

      {/* قائمة الكتب */}
      {books.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {books.map((book) => (
            <Card key={book.id} className={`overflow-hidden transition-all ${selectedBooks.has(book.id) ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-1/4 h-64 lg:h-auto overflow-hidden bg-book-light flex-shrink-0 relative">
                    <div className="absolute top-2 right-2 z-10">
                      <Checkbox
                        checked={selectedBooks.has(book.id)}
                        onCheckedChange={(checked) => handleSelectBook(book.id, checked as boolean)}
                        className="bg-white/90 border-2"
                      />
                    </div>
                    <img 
                      src={book.cover_image_url || 'https://placehold.co/600x800?text=لا+توجد+صورة'} 
                      alt={book.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/600x800?text=لا+توجد+صورة';
                      }}
                    />
                  </div>
                  
                  <div className="lg:w-3/4 p-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-xl">{book.title}</h3>
                          <Badge variant="default">معتمد</Badge>
                        </div>
                        
                        {book.subtitle && (
                          <p className="text-lg text-muted-foreground mb-2">{book.subtitle}</p>
                        )}
                        
                        <p className="text-book-secondary font-semibold mb-3">{book.author}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">التصنيف:</span>
                        <span>{getCategoryLabel(book.category || 'other')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">اللغة:</span>
                        <span>{getLanguageInArabic(book.language || '') || 'غير محدد'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">سنة النشر:</span>
                        <span>{book.publication_year || 'غير محدد'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">عدد الصفحات:</span>
                        <span>{book.page_count || 'غير محدد'}</span>
                      </div>
                      
                      {book.publisher && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">الناشر:</span>
                          <span>{book.publisher}</span>
                        </div>
                      )}
                      
                      {book.translator && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">المترجم:</span>
                          <span>{book.translator}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="text-sm">
                        <span className="font-semibold">نوع العرض:</span> {getDisplayTypeLabel(book.display_type || 'غير محدد')}
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-semibold">نوع الملف:</span> {getFileTypeLabel(book.file_type, book.book_file_url)}
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-semibold">تأكيد الحقوق:</span> 
                        <Badge variant={book.rights_confirmation ? "default" : "destructive"} className="ml-2">
                          {book.rights_confirmation ? "مؤكد" : "غير مؤكد"}
                        </Badge>
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-semibold">تاريخ الإضافة:</span> {formatDate(book.created_at)}
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-semibold">المشاهدات:</span> {book.views || 0}
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-semibold">التقييم:</span> {book.rating || 0}/5
                      </div>
                    </div>
                    
                    {book.description && (
                      <div className="mb-4">
                        <span className="font-semibold text-sm block mb-2">وصف الكتاب:</span>
                        <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          {book.description}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-6">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleViewBookDetails(book.id)}
                        className="bg-book-primary hover:bg-book-primary/80"
                      >
                        <ExternalLink className="ml-1 h-4 w-4" />
                        عرض التفاصيل
                      </Button>
                      
                      <DeleteBookDialog
                        bookId={book.id}
                        bookTitle={book.title}
                        onBookDeleted={onBookDeleted}
                      />
                      
                      {book.book_file_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(book.book_file_url!, '_blank')}
                        >
                          <Eye className="ml-1 h-4 w-4" />
                          عرض الملف
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* مؤشر التحميل للمزيد */}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {loadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري تحميل المزيد...</span>
              </div>
            )}
            {!hasMore && books.length > 0 && (
              <div className="text-center text-muted-foreground text-sm">
                تم عرض جميع الكتب المعتمدة
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد كتب معتمدة"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? `لم يتم العثور على كتب تحتوي على "${searchQuery}"`
              : "لا توجد كتب معتمدة حالياً في المكتبة"
            }
          </p>
          <div className="flex justify-center gap-2">
            {searchQuery && (
              <Button 
                onClick={() => {
                  setLocalSearchQuery('');
                  search('');
                }} 
                variant="outline"
              >
                إلغاء البحث
              </Button>
            )}
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="ml-2 h-4 w-4" />
              إعادة تحديث
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedBooksManager;