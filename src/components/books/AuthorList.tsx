import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authors } from '@/data/authors';
import { authorImageUrls } from '@/data/authorImageUrls';

const AuthorList = () => {
  const [authorsList, setAuthorsList] = useState<{ id: number; name: string; bookCount: number; imageUrl: string }[]>([]);
  const defaultAuthorImage = '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png';
  
  useEffect(() => {
    // استخدام بيانات المؤلفين من ملف authors.ts المُحسّن
    const formattedAuthors = authors.map(author => ({
      id: author.id,
      name: author.name,
      bookCount: author.booksCount || 0,
      imageUrl: authorImageUrls[author.id] || defaultAuthorImage
    }));
    
    setAuthorsList(formattedAuthors);
  }, []);

  // دالة للحصول على الأحرف الأولى من اسم المؤلف
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // التعامل مع النقر على المؤلف - فتح صفحة المؤلف مباشرة
  const handleAuthorClick = (authorName: string) => {
    window.location.href = `/author/${encodeURIComponent(authorName)}`;
  };

  return (
    <div>
      <h2 className="text-3xl font-scheherazade font-bold mb-6 text-center text-book-title">المؤلفون</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {authorsList.map((author) => (
          <Card 
            key={author.id} 
            className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
            onClick={() => handleAuthorClick(author.name)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-3 bg-book-light border-2 border-book-primary">
                <AvatarImage src={author.imageUrl} alt={author.name} />
                <AvatarFallback className="text-xl font-bold text-book-primary">
                  {getInitials(author.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-cairo font-semibold text-lg mb-1 line-clamp-1 text-book-primary">{author.name}</h3>
              <p className="text-sm text-book-primary font-tajawal">{author.bookCount} كتب</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AuthorList;
