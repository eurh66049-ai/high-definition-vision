
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Mail } from 'lucide-react';
import VerifiedBadge from '@/components/icons/VerifiedBadge';
import { optimizeImageUrl } from '@/utils/imageProxy';


interface OptimizedAuthorCardProps {
  author: {
    id: string;
    name: string;
    bio: string | null;
    avatar_url: string | null;
    email: string | null;
    books_count: number;
    social_links?: any;
    country_code?: string | null;
    country_name?: string | null;
    is_verified?: boolean;
  };
  onClick?: () => void;
}

const OptimizedAuthorCard: React.FC<OptimizedAuthorCardProps> = ({ author, onClick }) => {
  const avatarUrl = optimizeImageUrl(author.avatar_url || '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png', 'avatar');
  
  // وظيفة لإرجاع علم الدولة بناءً على رمز الدولة
  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    return `https://flagsapi.com/${countryCode.toUpperCase()}/flat/32.png`;
  };

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="relative h-16 w-16 flex-shrink-0">
            <img
              src={avatarUrl}
              alt={author.name}
              className="h-full w-full rounded-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png';
              }}
            />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground line-clamp-1">
                    {author.name}
                  </h3>
                  {author.is_verified && (
                    <VerifiedBadge size={16} className="flex-shrink-0" />
                  )}
                  {author.country_code && (
                    <img
                      src={getCountryFlag(author.country_code)}
                      alt={author.country_name || ''}
                      className="w-5 h-5 object-cover rounded-sm"
                      title={author.country_name || ''}
                    />
                  )}
                </div>
              </div>
              
              <Badge variant="outline" className="flex items-center gap-1">
                <Book className="h-3 w-3" />
                <span>{author.books_count}</span>
              </Badge>
            </div>
            
            {author.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                {author.bio}
              </p>
            )}
            
            {author.email && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="line-clamp-1">{author.email}</span>
              </div>
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizedAuthorCard;
