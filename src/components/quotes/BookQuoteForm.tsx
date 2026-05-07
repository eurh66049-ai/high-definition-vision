import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Quote, Plus } from 'lucide-react';
import { useQuotes } from '@/hooks/useQuotes';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCategoryInArabic } from '@/utils/categoryTranslation';

interface BookQuoteFormProps {
  book: {
    id: string;
    title: string;
    author: string;
    category?: string;
    cover_image_url?: string;
  };
}

export const BookQuoteForm: React.FC<BookQuoteFormProps> = ({ book }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addQuote } = useQuotes();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة اقتباس');
      navigate('/auth');
      return;
    }
    
    if (!quoteText.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    const success = await addQuote({
      quote_text: quoteText.trim(),
      book_title: book.title,
      author_name: book.author,
      book_id: book.id,
      book_cover_url: book.cover_image_url,
      book_author: book.author,
      book_category: book.category
    });

    if (success) {
      setQuoteText('');
      setIsOpen(false);
      toast.success('تم إضافة الاقتباس بنجاح! سيتم توجيهك إلى صفحة الاقتباسات');
      
      // إعادة تحميل الصفحة والتوجه إلى صفحة الاقتباسات
      setTimeout(() => {
        window.location.href = '/quotes';
      }, 1000); // انتظار ثانية واحدة لعرض رسالة النجاح
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2 bg-card border-border hover:bg-accent"
        >
          <Quote className="h-4 w-4" />
          أضف اقتباساً من هذا الكتاب
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Quote className="h-5 w-5" />
            إضافة اقتباس
          </DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {book.cover_image_url && (
              <img
                src={book.cover_image_url}
                alt={`غلاف ${book.title}`}
                className="w-12 h-16 object-cover rounded-md"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{book.title}</p>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              {book.category && (
                <p className="text-xs text-muted-foreground">{getCategoryInArabic(book.category)}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote-text">نص الاقتباس *</Label>
            <Textarea
              id="quote-text"
              placeholder="اكتب الاقتباس الذي أعجبك من هذا الكتاب..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="min-h-[120px] resize-none"
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !quoteText.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'جارٍ الإضافة...' : 'إضافة الاقتباس'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};