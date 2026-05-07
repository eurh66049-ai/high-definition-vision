import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FallbackImage } from '@/components/ui/fallback-image';
import { StarRating } from '@/components/ui/star-rating';
import { Eye, Download, BookOpen } from 'lucide-react';
import { useBookDownloads } from '@/hooks/useBookDownloads';
import { DisplayOnlyIcon } from '@/components/icons/DisplayOnlyIcon';

interface EnhancedBookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    category: string;
    cover_image_url?: string;
    views?: number;
    rating?: number;
    slug?: string;
    display_only?: boolean; // للكتب التي للعرض فقط بدون تحميل أو قراءة
  };
  onReadClick?: () => void;
  onDetailsClick?: () => void;
  showFileIntegrity?: boolean;
}

export const EnhancedBookCard: React.FC<EnhancedBookCardProps> = ({
  book,
  onReadClick,
  onDetailsClick,
  showFileIntegrity = false
}) => {
  const { downloads, loading: downloadsLoading } = useBookDownloads(book.id);
  
  // إنشاء slug للكتاب
  const bookSlug = book.slug || `${book.title}-${book.author}`.toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u200C-\u200Ea-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  const bookUrl = `/book/${bookSlug}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onReadClick || onDetailsClick) {
      e.preventDefault();
      if (onReadClick) onReadClick();
      if (onDetailsClick) onDetailsClick();
    }
  };

  return (
    <a href={bookUrl} className="block" onClick={handleClick}>
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="relative">
          <FallbackImage
            src={book.cover_image_url}
            alt={`غلاف كتاب ${book.title}`}
            bookId={book.id}
            imageType="cover"
            showMissingIndicator={showFileIntegrity}
            className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* شريط الأدوات العلوي */}
          <div className="absolute top-2 right-2 flex gap-1 flex-col">
            <Badge variant="secondary" className="text-xs">
              {book.category}
            </Badge>
            {book.display_only && (
              <Badge variant="destructive" className="text-xs font-bold">
                للعرض فقط
              </Badge>
            )}
          </div>

          {/* شريط الأدوات السفلي */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/50 rounded-lg p-2 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-white text-xs">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{book.views || 0}</span>
              </div>
              {!downloadsLoading && downloads > 0 && (
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{downloads}</span>
                </div>
              )}
            </div>
            
            {book.rating && (
              <StarRating
                rating={book.rating}
                size="sm"
                showRating={false}
                showReviewCount={false}
                className="text-yellow-400"
              />
            )}
          </div>
        </div>

        {book.display_only && (
          <div className="w-full flex justify-center -mt-3">
            <DisplayOnlyIcon className="h-8 w-8 md:h-10 md:w-10" />
          </div>
        )}

        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-2 font-amiri group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-3 font-cairo">
            {book.author}
          </p>

          <div className="flex gap-2">
            {book.display_only ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 cursor-not-allowed opacity-50"
                disabled
                onClick={(e) => e.preventDefault()}
              >
                <BookOpen className="h-4 w-4 ml-1" />
                غير متاح للقراءة
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onReadClick?.();
                }}
                size="sm"
                className="flex-1"
              >
                <BookOpen className="h-4 w-4 ml-1" />
                قراءة
              </Button>
            )}
            
            <Button
              onClick={(e) => {
                e.preventDefault();
                onDetailsClick?.();
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              تفاصيل
            </Button>
          </div>
        </CardContent>
      </Card>
    </a>
  );
};