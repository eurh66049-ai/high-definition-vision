
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BookOpen, Download, Eye, Calendar, FileText, User, Loader2 } from 'lucide-react';
import { resolvePdfDownloadUrl } from '@/utils/imageProxy';
import { useAuth } from '@/context/AuthContext';
import { useBookDownloads } from '@/hooks/useBookDownloads';
import { toast } from 'sonner';
import ResponsiveDescription from '@/components/ui/ResponsiveDescription';
import { createBookSlug } from '@/utils/bookSlug';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { getLanguageInArabic } from '@/utils/languageTranslation';
import BookShareButtons from '@/components/books/BookShareButtons';
import { FollowButton } from '@/components/authors/FollowButton';
import { useAuthorFollow } from '@/hooks/useAuthorFollow';
import { useOptimizedAuthorData } from '@/hooks/useOptimizedAuthorData';
import AuthorSkeleton from '@/components/ui/AuthorSkeleton';

interface BookDetailsContentProps {
  book: {
    id: string;
    title: string;
    subtitle?: string;
    author: string;
    author_bio?: string;
    author_image_url?: string;
    category: string;
    description?: string;
    language?: string;
    publication_year?: number;
    page_count?: number;
    cover_image_url?: string;
    book_file_url?: string;
    views?: number;
    rating?: number;
    created_at?: string;
    file_size?: number;
    file_type?: string;
    slug?: string;
    display_type?: string;
    publisher?: string;
  };
}

const BookDetailsContent: React.FC<BookDetailsContentProps> = ({ book }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recordDownload } = useBookDownloads(String(book.id));
  const [isDownloading, setIsDownloading] = useState(false);
  const defaultAuthorImage = '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png';
  
  // الحصول على معرف المؤلف من اسمه (يمكن تحسين هذا لاحقاً باستخدام معرف فعلي)
  const authorId = book.author ? book.author.toLowerCase().replace(/\s+/g, '-') : null;
  const { isFollowing, loading, initialLoading: followInitialLoading, followersCount, toggleFollow } = useAuthorFollow(authorId, book.author);

  const handleReadNow = async () => {
    if (book.book_file_url) {
      // التحقق من نوع الملف
      if (book.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          book.file_type === 'application/msword' ||
          book.file_type === 'text/plain') {
        // للملفات غير PDF، نقوم بتحميلها مباشرة
        handleDownload();
        toast.info('تم تحميل الملف - يمكنك فتحه في التطبيق المناسب لقراءته');
        return;
      }
      
      // للملفات PDF، الانتقال لصفحة القراءة
      const bookIdentifier = book.slug || createBookSlug(book.title, book.author);
      navigate(`/book/reading/${bookIdentifier}`);
    } else {
      toast.error('ملف الكتاب غير متوفر للقراءة');
    }
  };

  const handleDownload = async () => {
    if (!user) {
      try { localStorage.setItem('auth_redirect_path', window.location.pathname + window.location.search); } catch {}
      toast.error('يجب تسجيل الدخول لتحميل الكتب');
      navigate('/auth');
      return;
    }
    if (!book.book_file_url) {
      toast.error('ملف الكتاب غير متوفر للتحميل');
      return;
    }

    setIsDownloading(true);
    try {
      const sourceUrl = resolvePdfDownloadUrl(book.book_file_url);
      const response = await fetch(sourceUrl);
      
      if (!response.ok || !response.body) {
        throw new Error('فشل في تحميل الملف');
      }

      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      let mimeType = 'application/pdf';
      let fileExtension = '.pdf';
      if (book.file_type) {
        mimeType = book.file_type;
        switch (book.file_type) {
          case 'text/plain': fileExtension = '.txt'; break;
          case 'application/msword': fileExtension = '.doc'; break;
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': fileExtension = '.docx'; break;
          default:
            const urlParts = book.book_file_url.split('.');
            if (urlParts.length > 1) fileExtension = '.' + urlParts[urlParts.length - 1].split('?')[0];
        }
      }

      const blob = new Blob(chunks, { type: mimeType });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${book.title} - kotobi${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      await recordDownload();

      if (user) {
        try {
          await supabase.from('user_downloads').upsert({
            user_id: user.id,
            book_id: String(book.id),
            book_title: book.title,
            book_author: book.author || null,
            book_cover_url: book.cover_image_url || null,
            book_slug: book.slug || null,
            downloaded_at: new Date().toISOString(),
          }, { onConflict: 'user_id,book_id' });
        } catch (e) {
          console.error('Error tracking download:', e);
        }
      }

      toast.success('تم تحميل الكتاب بنجاح!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل في تحميل الكتاب، جاري فتح الرابط...');
      window.open(book.book_file_url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAuthorInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatViewCount = (views: number) => {
    if (views >= 1000000) {
      const millions = Math.floor(views / 1000000);
      const remainder = Math.floor((views % 1000000) / 100000);
      return remainder > 0 ? `${millions}.${remainder} مليون` : `${millions} مليون`;
    } else if (views >= 1000) {
      const thousands = Math.floor(views / 1000);
      const remainder = Math.floor((views % 1000) / 100);
      return remainder > 0 ? `${thousands}.${remainder} ألف` : `${thousands} ألف`;
    }
    return views.toString();
  };

  // استخدام الhook المحسن لجلب بيانات المؤلف
  const {
    avatarUrl: displayAuthorImage,
    bio: authorBio,
    isVerified,
    followersCount: authorFollowersCount,
    loading: authorDataLoading
  } = useOptimizedAuthorData(book.author);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* معلومات الكتاب الأساسية */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            {book.subtitle && (
              <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-4 font-amiri">
                {book.subtitle}
              </h2>
            )}
            
            {/* معلومات الكتاب في الوسط */}
            <div className="text-center mb-6">
              <div className="mb-4">
                <span className="text-lg text-foreground font-cairo">المؤلف: </span>
                <span className="text-lg text-foreground font-cairo font-semibold">{book.author}</span>
              </div>
              
              {book.publisher && (
                <div className="mb-4">
                  <span className="text-lg text-foreground font-cairo">الناشر: </span>
                  <span className="text-lg text-foreground font-cairo font-semibold">{book.publisher}</span>
                </div>
              )}
              
              {book.page_count && typeof book.page_count === 'number' && book.page_count > 0 && (
                <div className="mb-4">
                  <span className="text-lg font-cairo text-red-600 dark:text-red-400 font-semibold">
                    عدد الصفحات: {book.page_count}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-6 justify-center">
              {book.publication_year && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300 font-cairo">{book.publication_year}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6 justify-center">
              <Badge variant="secondary" className="font-cairo">{getCategoryInArabic(book.category)}</Badge>
              {book.language && (
                <Badge variant="outline" className="font-cairo">{getLanguageInArabic(book.language)}</Badge>
              )}
            </div>

            {/* الإحصائيات */}
            <div className="flex flex-wrap items-center gap-6 mb-6 justify-center">
              {book.views !== undefined && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                    {formatViewCount(book.views)} مشاهدة
                  </span>
                </div>
              )}
            </div>

            {/* الوصف */}
            {book.description && (
              <div className="max-w-none">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 font-amiri">
                  وصف الكتاب
                </h3>
                <ResponsiveDescription 
                  text={book.description} 
                  lineClamp={5}
                  className="text-foreground leading-relaxed font-cairo text-justify whitespace-pre-wrap text-base"
                  showMoreLabel="عرض المزيد"
                  showLessLabel="عرض أقل"
                />
              </div>
            )}

            {/* معلومات المؤلف */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-amiri">
                نبذة عن المؤلف
              </h3>
              
              {authorDataLoading ? (
                <AuthorSkeleton />
              ) : (
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 flex-shrink-0">
                      <AvatarImage 
                        src={displayAuthorImage} 
                        alt={`صورة المؤلف ${book.author}`}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-lg">
                        {getAuthorInitials(book.author)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-amiri">
                            {book.author}
                          </h4>
                          {isVerified && (
                            <span className="text-blue-500" title="مؤلف موثق">✓</span>
                          )}
                        </div>
                        {!followInitialLoading && (
                          <FollowButton
                            isFollowing={isFollowing}
                            loading={loading}
                            onClick={toggleFollow}
                            className="ml-3"
                          />
                        )}
                      </div>
                      
                      {(followersCount > 0 || authorFollowersCount > 0) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-cairo">
                          {Math.max(followersCount, authorFollowersCount)} متابع
                        </p>
                      )}
                      
                      {/* عرض نبذة المؤلف */}
                      {authorBio && authorBio.trim() !== '' ? (
                        <ResponsiveDescription 
                          text={authorBio} 
                          lineClamp={4}
                          className="text-gray-700 dark:text-gray-300 leading-relaxed font-cairo text-justify whitespace-pre-wrap text-sm mt-3"
                          showMoreLabel="عرض المزيد"
                          showLessLabel="عرض أقل"
                        />
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-500 font-cairo mt-3 italic">
                          لا توجد معلومات إضافية عن هذا المؤلف
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* الغلاف والأزرار */}
        <div className="space-y-6">
          <div className="sticky top-6">
            {/* صورة الغلاف */}
            <div className="w-full max-w-[280px] mx-auto aspect-[3/4] mb-4 rounded-lg overflow-hidden shadow-lg">
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-blue-400 dark:text-blue-300" />
                </div>
              )}
            </div>

            {/* عنوان الكتاب تحت الصورة وفي الوسط */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-amiri">
                {book.title}
              </h1>
            </div>

            {/* أزرار العمل - حسب نوع العرض */}
            <div className="space-y-3">
              {/* للقراءة فقط */}
              {book.display_type === 'read_only' && book.book_file_url && (
                <Button
                  onClick={handleReadNow}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  <BookOpen className="ml-2 h-5 w-5" />
                  {book.file_type === 'application/pdf' ? 'اقرأ الآن' : 'افتح الملف'}
                </Button>
              )}

              {/* للتحميل والقراءة */}
              {book.book_file_url && book.display_type !== 'no_access' && book.display_type !== 'read_only' && (
                <>
                  <Button
                    onClick={handleReadNow}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <BookOpen className="ml-2 h-5 w-5" />
                    {book.file_type === 'application/pdf' ? 'اقرأ الآن' : 'افتح الملف'}
                  </Button>

                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Download className="ml-2 h-5 w-5" />
                    )}
                    {isDownloading ? 'جاري التحميل...' : 'تحميل الملف'}
                  </Button>
                </>
              )}

              {/* بدون تحميل ولا قراءة */}
              {book.display_type === 'no_access' && (
                <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                  <div className="text-gray-600 dark:text-gray-400 mb-2">
                    🔒 غير متاح للقراءة أو التحميل
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    المؤلف لم يوافق على إتاحة هذا الكتاب للقراءة العامة حالياً
                  </p>
                </div>
              )}
            </div>

            {/* معلومات إضافية */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 font-amiri">
                معلومات الملف
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-cairo">
                <div>النوع: {book.file_type === 'application/pdf' ? 'PDF' : 
                           book.file_type === 'text/plain' ? 'نص' :
                           book.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Word (DOCX)' :
                           book.file_type === 'application/msword' ? 'Word (DOC)' : 'ملف'}</div>
                <div>الحجم: متوسط</div>
                <div>جودة: عالية</div>
                <div>تاريخ الإضافة: {formatDate(book.created_at)}</div>
              </div>
            </div>

            {/* أزرار المشاركة */}
            <BookShareButtons book={book} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailsContent;
