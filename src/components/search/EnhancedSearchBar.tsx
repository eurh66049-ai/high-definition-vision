import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { ImageSearchButton } from './SearchDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { createBookSlug } from '@/utils/bookSlug';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  className?: string;
}

export function EnhancedSearchBar({ 
  searchTerm, 
  onSearchChange, 
  onClearSearch, 
  className = "" 
}: EnhancedSearchBarProps) {
  // حالة محلية منفصلة تماماً للبحث
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // تحديث الحالة المحلية فقط عند تغيير خارجي مهم
  useEffect(() => {
    if (searchTerm === '' && localSearchTerm !== '') {
      // إذا تم مسح البحث من الخارج، نمسحه محلياً أيضاً
      setLocalSearchTerm('');
    }
  }, [searchTerm]);

  // البحث عن الاقتراحات مباشرة من قاعدة البيانات
  useEffect(() => {
    if (!localSearchTerm.trim() || localSearchTerm.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchInDatabase = async () => {
      try {
        const { data, error } = await supabase
          .from('book_submissions')
          .select('*')
          .eq('status', 'approved')
          .or(`title.ilike.%${localSearchTerm}%,author.ilike.%${localSearchTerm}%,category.ilike.%${localSearchTerm}%`)
          .order('title', { ascending: true })
          .limit(8);

        if (error) {
          console.error('خطأ في البحث:', error);
          return;
        }

        const formattedResults = (data || []).map(book => ({
          id: book.id,
          title: book.title || 'عنوان غير متوفر',
          author: book.author || 'مؤلف غير معروف',
          category: book.category || 'أخرى',
          cover_image_url: book.cover_image_url || '/placeholder.svg'
        }));

        setSuggestions(formattedResults);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('خطأ في البحث:', error);
        setSuggestions([]);
      }
    };

    // تأخير قصير لمنع الكثير من طلبات البحث
    const timeoutId = setTimeout(searchInDatabase, 300);
    return () => clearTimeout(timeoutId);
  }, [localSearchTerm]);

  // إخفاء الاقتراحات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          const selectedBook = suggestions[highlightedIndex];
          navigate(`/book/${createBookSlug(selectedBook.title, selectedBook.author)}`);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSearch = () => {
    if (localSearchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(localSearchTerm)}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (book: any) => {
    window.location.href = `/book/${createBookSlug(book.title, book.author)}`;
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    // عدم استدعاء onSearchChange لتجنب التضارب
  };

  const handleClearClick = () => {
    setLocalSearchTerm('');
    onClearSearch();
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`relative w-full max-w-full overflow-hidden ${className}`}>
      <div className="relative flex items-center bg-card border border-border rounded-full overflow-hidden shadow-lg w-full">
        <ImageSearchButton />
        <div className="flex-1 min-w-0">
          <Input
            ref={inputRef}
            type="text"
            placeholder="ابحث عن كتاب أو مؤلف..."
            value={localSearchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            className="border-0 bg-transparent text-right text-foreground placeholder:text-muted-foreground h-10 sm:h-12 px-3 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-base rounded-full"
            dir="rtl"
          />
        </div>

        {localSearchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearClick}
            className="h-8 w-8 mx-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

      </div>

      {/* قائمة الاقتراحات */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-xl z-[9999] mt-3 max-h-80 overflow-y-auto"
          dir="rtl"
        >
          {suggestions.map((book, index) => (
            <div
              key={book.id}
              className={`flex items-center p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                index === highlightedIndex ? 'bg-accent' : ''
              }`}
              onClick={() => handleSuggestionClick(book)}
            >
              <div className="w-10 h-14 flex-shrink-0 ml-3 rounded overflow-hidden shadow-sm bg-muted">
                <img 
                  src={book.cover_image_url || '/placeholder.svg'} 
                  alt={book.title} 
                  className="object-cover h-full w-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm truncate leading-tight">
                  {book.title}
                </h4>
                <p className="text-muted-foreground text-xs truncate mt-0.5">
                  {book.author}
                </p>
                <p className="text-muted-foreground text-xs truncate">
                  {getCategoryInArabic(book.category)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* رسالة عدم وجود نتائج */}
      {showSuggestions && localSearchTerm.trim() && suggestions.length === 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-xl z-[9999] mt-3 p-4 text-center text-muted-foreground"
          dir="rtl"
        >
          لا توجد نتائج مطابقة لـ "{localSearchTerm}"
        </div>
      )}
    </div>
  );
}