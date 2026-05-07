import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { optimizeImageUrl } from '@/utils/imageProxy';

interface AuthorSuggestion {
  author: string;
  bio: string | null;
  avatar_url: string | null;
  book_count: number;
}

interface AuthorSuggestionsProps {
  suggestions: AuthorSuggestion[];
  isLoading: boolean;
  onSelect: (author: AuthorSuggestion) => void;
  isVisible: boolean;
}

const AuthorSuggestions: React.FC<AuthorSuggestionsProps> = ({
  suggestions,
  isLoading,
  onSelect,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto shadow-lg border-border bg-card">
      <CardContent className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">البحث...</span>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground px-2 py-1 border-b border-border">
              مؤلف({suggestions.length}) الكتاب
            </div>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                onClick={() => onSelect(suggestion)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={optimizeImageUrl(suggestion.avatar_url || '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png', 'avatar')} 
                    alt={suggestion.author}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {suggestion.author.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">
                    {suggestion.author}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {suggestion.book_count} كتاب
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            لا توجد مؤلفين مطابقين
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthorSuggestions;