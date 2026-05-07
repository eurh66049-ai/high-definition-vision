
import React, { useState, useEffect } from 'react';
import { getRecentlyViewed } from '@/utils/recentlyViewedUtils';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { createBookSlug } from '@/utils/bookSlug';

interface RecentlyViewedBook {
  id: string;
  title: string;
  author: string;
  cover_image_url: string;
  viewedAt: string;
  slug?: string;
}

const RecentlyViewedBooks: React.FC<{ currentBookId?: string }> = ({ currentBookId }) => {
  const [recentBooks, setRecentBooks] = useState<RecentlyViewedBook[]>([]);

  useEffect(() => {
    const viewedBooks = getRecentlyViewed();
    const filteredBooks = viewedBooks.filter(book => book.id !== currentBookId).slice(0, 6);
    setRecentBooks(filteredBooks);
  }, [currentBookId]);

  if (recentBooks.length === 0) {
    return null;
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm py-12 lg:py-16 mt-8">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold font-amiri text-white text-center mb-8 relative">
          شاهدت مؤخراً
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-red-500 -mb-2"></div>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 pt-4">
          {recentBooks.map((book) => (
            <Link to={`/book/${createBookSlug(book.title, book.author)}`} key={book.id} className="group block">
              <Card className="bg-card/80 border-border/50 hover:border-book-primary transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden shadow-lg hover:shadow-red-500/20">
                <CardContent className="p-0 relative">
                  <AspectRatio ratio={3 / 4}>
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = '/src/assets/default-book-cover.png';
                      }}
                      loading="lazy"
                    />
                  </AspectRatio>
                  <div className="p-2 bg-gradient-to-t from-black/80 via-black/60 to-transparent absolute bottom-0 left-0 right-0">
                    <h3 className="text-xs font-bold text-white truncate font-cairo" title={book.title}>
                      {book.title}
                    </h3>
                    <p className="text-xxs text-gray-400 truncate" title={book.author}>
                      {book.author}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentlyViewedBooks;
