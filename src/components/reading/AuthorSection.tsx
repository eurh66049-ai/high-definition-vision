
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookOpen, ChevronLeft, Globe, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { authorImageUrls } from '@/data/authorImageUrls';
import { createBookSlug } from '@/utils/bookSlug';
import { FollowOptionsPopover } from '@/components/authors/FollowOptionsPopover';
import { useAuthorFollow } from '@/hooks/useAuthorFollow';

interface AuthorSectionProps { 
  author: any;
  relatedBooks: any[];
  currentBookId: number;
  navigate: (path: string) => void;
}

const AuthorSection = ({ 
  author, 
  relatedBooks, 
  currentBookId,
  navigate 
}: AuthorSectionProps) => {
  // إعداد hook للمتابعة
  const authorId = author?.name ? author.name.toLowerCase().replace(/\s+/g, '-') : null;
  const { isFollowing, loading, followersCount, toggleFollow, authorSocialLinks } = useAuthorFollow(authorId, author?.name);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // الحصول على صورة المؤلف من البيانات أو استخدام الصورة الافتراضية الجديدة
  const defaultAuthorImage = '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png';
  const authorImage = author?.id ? authorImageUrls[author.id] : null;
  const displayAuthorImage = authorImage || defaultAuthorImage;

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (author?.website) {
      window.open(author.website, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white/80 to-blue-50/80 dark:from-gray-900/90 dark:to-blue-950/90 backdrop-blur-lg rounded-2xl mb-10">
        <CardContent className="p-8 relative">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-book-primary/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-tr from-book-secondary/10 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-book-primary to-book-secondary p-1 shadow-lg shadow-book-primary/30">
                  <Avatar className="w-full h-full border-2 border-white dark:border-gray-900">
                    <AvatarImage src={displayAuthorImage} alt={author?.name || 'مؤلف'} />
                    <AvatarFallback className="bg-book-light text-book-primary text-xl">
                      {getInitials(author?.name || 'مؤلف')}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-book-primary/70 shadow-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-book-secondary/70 shadow-lg"></div>
              </div>
              
              <div className="flex flex-col items-center md:items-start text-center md:text-right">
                <h3 className="font-amiri text-3xl font-bold text-book-primary mb-2 text-transparent bg-clip-text bg-gradient-to-r from-book-primary to-book-secondary">{author?.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-lg mb-3">
                  {author?.bio || 'مؤلف مبدع له العديد من المؤلفات المميزة في مجال الأدب والثقافة، اكتشف المزيد من أعماله وإبداعاته الأدبية.'}
                </p>
                
                {/* زر المتابعة وعدد المتابعين */}
                <div className="flex items-center gap-3 mb-3">
                  <FollowOptionsPopover
                    isFollowing={isFollowing}
                    loading={loading}
                    onFollowOnSite={toggleFollow}
                    authorName={author?.name || 'المؤلف'}
                    socialLinks={authorSocialLinks}
                  />
                  {followersCount > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                      {followersCount} متابع
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col md:flex-row gap-2">
                  <Button 
                    variant="link" 
                    onClick={() => navigate(`/?author=${encodeURIComponent(author?.name || '')}`)}
                    className="p-0 h-auto justify-start text-book-primary group transition-all duration-300"
                  >
                    <span className="relative">
                      عرض جميع كتب المؤلف
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-book-primary/70 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                    </span>
                  </Button>
                  
                  {author?.website && (
                    <Button 
                      variant="link" 
                      onClick={handleWebsiteClick}
                      className="p-0 h-auto justify-start text-book-primary group transition-all duration-300 flex items-center gap-1"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="relative">
                        الموقع الإلكتروني
                        <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-book-primary/70 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-book-primary/10 shadow-inner">
              <h4 className="font-amiri text-xl font-semibold text-book-primary mb-4 border-b border-book-primary/20 pb-2 flex items-center">
                <BookOpen className="h-5 w-5 ml-2 text-book-primary/70" />
                كتب أخرى للمؤلف
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedBooks
                  .filter(book => book.id !== currentBookId)
                  .slice(0, 4)
                  .map(book => (
                    <motion.div 
                      key={book.id} 
                      className="group cursor-pointer bg-white/70 dark:bg-gray-800/50 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-500"
                      onClick={() => navigate(`/book/${book.slug || createBookSlug(book.title, book.author)}`)}
                      whileHover={{ y: -5, scale: 1.03 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="aspect-[3/4] overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-book-primary/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                        <img 
                          src={book.coverImage} 
                          alt={book.title} 
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-all duration-700"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium line-clamp-2 text-center group-hover:text-book-primary transition-colors duration-300">{book.title}</p>
                      </div>
                    </motion.div>
                  ))}
              </div>
              
              {relatedBooks.filter(book => book.id !== currentBookId).length > 4 && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="ghost" 
                    className="text-book-primary hover:text-book-secondary hover:bg-book-primary/10"
                    onClick={() => navigate(`/?author=${encodeURIComponent(author?.name || '')}`)}
                  >
                    عرض المزيد
                    <ChevronLeft className="h-4 w-4 mr-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AuthorSection;
