import React, { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import BookImageLoader from './BookImageLoader';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { createBookSlug } from '@/utils/bookSlug';
import { StarRating } from '@/components/ui/star-rating';
import { useBookReviewStats } from '@/hooks/useBookReviewStats';
import { useBookDownloads } from '@/hooks/useBookDownloads';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { Download } from 'lucide-react';

interface BookCardProps {
  id: number | string;
  title: string;
  author: {
    name: string;
    id: number;
  };
  coverImage: string;
  description: string;
  category: string;
  created_at?: string;
  slug?: string;
  display_only?: boolean; // للكتب التي للعرض فقط بدون تحميل أو قراءة
  publisher?: string;
}

export const BookCard = memo(({ id, title, author, coverImage, description, category, created_at, slug, display_only, publisher }: BookCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const bookIdString = String(id);
  const navigate = useNavigate();
  const { stats, loading } = useBookReviewStats(bookIdString);
  const { downloads, loading: downloadsLoading } = useBookDownloads(bookIdString);
  const { navigateToBook } = useNavigationHistory();

  console.log('BookCard render:', { id, title, author: author?.name, coverImage });

  const truncateDescription = useCallback((text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }, []);

  // إنشاء slug للكتاب
  const bookSlug = slug || createBookSlug(title, author?.name || '');
  const bookUrl = `/book/${bookSlug}`;

  const validateCoverImage = useCallback(() => {
    if (!coverImage || coverImage === 'undefined' || coverImage === 'null' || coverImage.trim() === '') {
      return '/placeholder.svg';
    }
    return coverImage;
  }, [coverImage]);

  const validCoverImage = validateCoverImage();
  const displayTitle = title || 'عنوان غير متوفر';
  const displayAuthor = author?.name || 'مؤلف غير معروف';
  const displayCategory = getCategoryInArabic(category);

  // Check if book is new (published within last 15 days)
  const isNewBook = useCallback(() => {
    if (!created_at) return false;
    const publishedDate = new Date(created_at);
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    return publishedDate >= fifteenDaysAgo;
  }, [created_at]);

  const showNewBadge = isNewBook();

  return (
    <a href={bookUrl} className="block h-full">
      <Card 
        className="group relative bg-card text-card-foreground rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden h-full min-h-[220px] flex flex-col border-border"
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* صورة الكتاب */}
      <div className="relative w-full p-1.5 sm:p-2 md:p-2.5">
        <AspectRatio ratio={3/4.5} className="bg-muted rounded-xl overflow-hidden">
          <div className="relative w-full h-full">
            <BookImageLoader 
              src={validCoverImage}
              fallbackSrc="/placeholder.svg"
              alt={`غلاف كتاب ${displayTitle}`}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
              priority={false}
              maxRetries={1}
              hideRetryButton={true}
              immediateLoad={false}
            />
            
            {/* شارة "جديد" للكتب المنشورة خلال آخر 7 أيام */}
            {showNewBadge && !display_only && (
              <div className="absolute top-2 right-2 z-10">
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-md shadow-lg animate-pulse">
                  جديد
                </span>
              </div>
            )}
            
            {/* شارة "للعرض فقط" */}
            {display_only && (
              <div className="absolute top-2 right-2 z-10">
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-destructive rounded-md shadow-lg">
                  للعرض فقط
                </span>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
          </div>
        </AspectRatio>
      </div>
      {/* محتوى البطاقة */}
      <CardContent className="flex-1 p-2 sm:p-2.5 md:p-3 pt-0 flex flex-col justify-between min-h-[90px]">
        <div className="text-center space-y-1">
          <h3 className="book-card-title font-tajawal text-card-foreground line-clamp-2 leading-tight px-1" style={{ fontWeight: 400, fontSize: '15px' }}>
            {displayTitle}
          </h3>
           {/* اسم المؤلف — تغليظ كبير + حجم أكبر + تأثير ظل خفيف */}
          <p 
            className="author-card-name text-primary font-tajawal tracking-tight"
            style={{ fontWeight: 400, fontSize: '13px' }}
            title={displayAuthor}
          >
            {displayAuthor}
          </p>
          
          {/* اسم الناشر */}
          {publisher && (
            <p 
              className="text-muted-foreground font-tajawal text-xs"
              title={publisher}
            >
              الناشر: {publisher}
            </p>
          )}
          
           <span
             className="block text-xs md:text-sm mt-0.5 text-card-foreground font-cairo font-black"
             title={displayCategory}
           >
             {`التصنيف: ${displayCategory}`}
           </span>
           
           {/* نجوم التقييم وإحصائيات */}
           <div className="flex flex-col items-center gap-1 mt-1">
             {!loading && (
               <StarRating
                 rating={stats?.average_rating || 0}
                 totalReviews={stats?.total_reviews || 0}
                 size="sm"
                 showRating={true}
                 showReviewCount={true}
                 className="text-xs"
               />
             )}
             
             {!downloadsLoading && downloads > 0 && (
               <div className="flex items-center gap-1 text-xs text-muted-foreground">
                 <Download className="h-3 w-3" />
                 <span>{downloads} تنزيل</span>
               </div>
             )}
           </div>
         </div>
        </CardContent>
      </Card>
    </a>
  );
});

BookCard.displayName = 'BookCard';
