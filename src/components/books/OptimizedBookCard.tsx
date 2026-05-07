
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { createBookSlug } from '@/utils/bookSlug';
import { StarRating } from '@/components/ui/star-rating';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import BookImageLoader from '@/components/books/BookImageLoader';

interface OptimizedBookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    category: string;
    description: string;
    views: number;
    rating: number;
    cover_image_url?: string;
    slug?: string;
    created_at?: string;
    publisher?: string;
  };
  stats?: {
    total_reviews: number;
    average_rating: number;
  };
  onClick?: () => void;
}

const OptimizedBookCard: React.FC<OptimizedBookCardProps> = ({ book, stats, onClick }) => {
  // استخدام صورة الغلاف مباشرة - محسّنة مسبقاً
  const coverUrl = book.cover_image_url || '/placeholder.svg';

  // تحديد slug للاستخدام في الرابط
  const bookSlug = book.slug || createBookSlug(book.title, book.author);
  
  // تحديد ما إذا كان الكتاب جديد (آخر 7 أيام)
  const isNewBook = book.created_at ? 
    (new Date().getTime() - new Date(book.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000) : 
    false;
  
  const handleClick = async (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
    // إذا لم يكن هناك onClick محدد، سيعمل الرابط بشكل طبيعي
  };

  return (
    <a href={`/book/${bookSlug}`} className="block" onClick={handleClick}>
      <Card 
        className="group cursor-pointer bg-card text-card-foreground card-optimized touch-optimized hover:shadow-md"
      >
      <CardContent className="p-3">
        <div className="aspect-[3/4.5] mb-3 overflow-hidden rounded-lg bg-muted relative p-2">
          <BookImageLoader
            src={coverUrl}
            alt={book.title}
            className="h-full w-full object-contain"
            priority={false}
            fallbackSrc="/placeholder.svg"
          />
          {isNewBook && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold shadow-md">
              جديد
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-tajawal text-foreground line-clamp-2" style={{ fontWeight: 400, fontSize: '16px' }}>
            {book.title}
          </h3>
          
          <p className="font-tajawal text-muted-foreground line-clamp-1" style={{ fontWeight: 400, fontSize: '13px' }}>
            {book.author}
          </p>
          
          {book.publisher && (
            <p className="font-tajawal text-muted-foreground text-xs line-clamp-1">
              الناشر: {book.publisher}
            </p>
          )}
          
          <Badge variant="secondary" className="text-xs">
            {getCategoryInArabic(book.category)}
          </Badge>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              <span>{book.views || 0}</span>
            </div>
            
            {/* نجوم التقييم - تظهر دائماً (فارغة عند عدم وجود تقييم) */}
            <StarRating
              rating={stats?.average_rating || 0}
              totalReviews={stats?.total_reviews || 0}
              size="sm"
              showRating={(stats?.total_reviews || 0) > 0}
              showReviewCount={false}
              className="text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
    </a>
  );
};

export default OptimizedBookCard;
