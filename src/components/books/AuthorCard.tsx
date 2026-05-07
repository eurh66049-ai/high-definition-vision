
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Globe, ExternalLink, Users } from 'lucide-react';
import { authorImageUrls } from '@/data/authorImageUrls';
import { useNavigate } from 'react-router-dom';
import { optimizeImageUrl } from '@/utils/imageProxy';

interface AuthorCardProps {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  rating?: number;
  booksCount?: number;
  followersCount?: number;
  website?: string;
}

const AuthorCard: React.FC<AuthorCardProps> = ({
  id,
  name,
  bio,
  avatarUrl,
  rating = 0,
  booksCount = 0,
  followersCount = 0,
  website,
}) => {
  const navigate = useNavigate();
  const defaultAuthorImage = '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png';

  // دالة للحصول على الأحرف الأولى من اسم المؤلف
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

// الحصول على صورة المؤلف من authorImageUrls إذا كان متاحًا
const authorImage = optimizeImageUrl(authorImageUrls[Number(id)] || avatarUrl || defaultAuthorImage, 'avatar');

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // إجبار تحديث الصفحة والانتقال إلى صفحة المؤلف
    window.location.href = `/author/${encodeURIComponent(name)}`;
  };

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (website) {
      window.open(website, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer h-full"
      onClick={handleAuthorClick}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-16 w-16 border-2 border-book-primary">
          <AvatarImage src={authorImage} alt={name} />
          <AvatarFallback className="bg-book-light text-book-primary text-lg font-bold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1">
          <h3 className="author-card-title text-xl">{name}</h3>
          <div className="flex items-center gap-3 text-sm text-book-author font-cairo">
            {booksCount > 0 && <span>{booksCount} كتب</span>}
            {followersCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {followersCount} متابع
              </span>
            )}
          </div>
          {website && (
            <button
              onClick={handleWebsiteClick}
              className="flex items-center gap-1 text-sm text-book-primary hover:text-book-secondary transition-colors duration-200 mt-1 w-fit"
            >
              <Globe className="h-4 w-4" />
              <span>الموقع الإلكتروني</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </CardHeader>
      {bio && (
        <CardContent className="pt-0">
          <p className="author-card-bio text-base whitespace-pre-wrap">{bio}</p>
        </CardContent>
      )}
    </Card>
  );
};

export default AuthorCard;
