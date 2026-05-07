
import React, { useState, useCallback, memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from '@/hooks/use-mobile';
import { BookOpen } from 'lucide-react';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import BookImageLoader from './BookImageLoader';
import { createBookSlug } from '@/utils/bookSlug';
import { StarRating } from '@/components/ui/star-rating';
import { useBookReviewStats } from '@/hooks/useBookReviewStats';

interface DatabaseBookCardProps {
  id: string;
  title: string;
  author: string;
  cover_image?: string;
  description?: string;
  category: string;
  rating?: number;
  views?: number;
  optimized_cover_url?: string;
  created_at?: string;
  publisher?: string;
}

export const DatabaseBookCard = memo(({ 
  id, 
  title, 
  author, 
  cover_image, 
  description, 
  category,
  rating,
  views,
  optimized_cover_url,
  created_at,
  publisher
}: DatabaseBookCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const { stats, loading } = useBookReviewStats(id);

  // إنشاء slug للكتاب
  const slug = createBookSlug(title, author);
  const bookUrl = `/book/${slug}`;

  const displayTitle = title || 'عنوان غير متوفر';
  const displayAuthor = author || 'مؤلف غير معروف';

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
    <a href={bookUrl} className="block">
      <Card 
        className="group relative bg-card text-card-foreground rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden h-auto min-h-[280px] flex flex-col border-border card-optimized touch-optimized"
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* صورة الكتاب */}
      <div className="relative w-full p-2 sm:p-3 md:p-4 flex-shrink-0">
        <AspectRatio ratio={3/4.5} className="bg-muted rounded-xl overflow-hidden">
          <div className="relative w-full h-full">
            <BookImageLoader 
              src={cover_image || '/placeholder.svg'}
              optimizedSrc={optimized_cover_url}
              fallbackSrc="/placeholder.svg"
              alt={`غلاف كتاب ${displayTitle}`}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 rounded-xl"
              priority={false}
              maxRetries={2}
              hideRetryButton={true}
              immediateLoad={true}
            />
            
            {/* شارة "جديد" للكتب المنشورة خلال آخر 7 أيام */}
            {showNewBadge && (
              <div className="absolute top-2 right-2 z-10">
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-md shadow-lg animate-pulse">
                  جديد
                </span>
              </div>
            )}
            
            {/* طبقة تدرج عند التحويم */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
          </div>
        </AspectRatio>
      </div>
      
      {/* محتوى البطاقة */}
      <CardContent className="flex-1 p-3 sm:p-4 md:p-5 pt-0 flex flex-col justify-between min-h-[120px]">
        <div className="text-center space-y-2">
          {/* عنوان الكتاب */}
          <h3 className="font-tajawal text-card-foreground line-clamp-2 leading-tight px-1" style={{ fontWeight: 400, fontSize: '18px' }}>
            {displayTitle}
          </h3>
          
          {/* اسم المؤلف */}
          <p className="text-card-foreground font-tajawal line-clamp-1 px-1" style={{ fontWeight: 400, fontSize: '15px' }}>
            {displayAuthor}
          </p>
          
          {/* اسم الناشر */}
          {publisher && (
            <p className="text-muted-foreground font-tajawal text-xs line-clamp-1 px-1">
              الناشر: {publisher}
            </p>
          )}
          
          {/* معلومات إضافية */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2">
            {views && views > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>{views}</span>
              </div>
            )}
            
            {/* نجوم التقييم - تظهر دائماً (فارغة عند عدم وجود تقييم) */}
            {!loading && (
              <StarRating
                rating={stats?.average_rating || 0}
                totalReviews={stats?.total_reviews || 0}
                size="sm"
                showRating={(stats?.total_reviews || 0) > 0}
                showReviewCount={(stats?.total_reviews || 0) > 0}
                className="text-xs text-muted-foreground"
              />
            )}
          </div>
        </div>
      </CardContent>
      </Card>
    </a>
  );
});

DatabaseBookCard.displayName = 'DatabaseBookCard';
