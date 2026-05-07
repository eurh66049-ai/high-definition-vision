import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BookOpen } from 'lucide-react';
import { useQuotes } from '@/hooks/useQuotes';
import { useApprovedBooksForSelect } from '@/hooks/useApprovedBooksForSelect';

interface AddQuoteDialogProps {
  onQuoteAdded?: () => void;
}

export const AddQuoteDialog: React.FC<AddQuoteDialogProps> = ({ onQuoteAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useCustomBook, setUseCustomBook] = useState(false);
  const { addQuote } = useQuotes();
  const { books, loading: booksLoading } = useApprovedBooksForSelect();

  const handleBookSelect = (bookId: string) => {
    setSelectedBookId(bookId);
    const selectedBook = books.find(book => book.id === bookId);
    if (selectedBook) {
      setBookTitle(selectedBook.title);
      setAuthorName(selectedBook.author);
      setUseCustomBook(false);
    }
  };

  const handleCustomBookToggle = (useCustom: boolean) => {
    setUseCustomBook(useCustom);
    if (!useCustom) {
      setSelectedBookId('');
      setBookTitle('');
      setAuthorName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quoteText.trim() || !bookTitle.trim() || !authorName.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    const selectedBook = selectedBookId ? books.find(book => book.id === selectedBookId) : null;
    
    const success = await addQuote({
      quote_text: quoteText.trim(),
      book_title: bookTitle.trim(),
      author_name: authorName.trim(),
      book_id: selectedBook?.id,
      book_cover_url: selectedBook?.cover_image_url,
      book_author: selectedBook?.author,
      book_category: selectedBook?.category
    });

    if (success) {
      setQuoteText('');
      setSelectedBookId('');
      setBookTitle('');
      setAuthorName('');
      setUseCustomBook(false);
      setIsOpen(false);
      onQuoteAdded?.();
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          إضافة اقتباس
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">إضافة اقتباس جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote-text">نص الاقتباس *</Label>
            <Textarea
              id="quote-text"
              placeholder="اكتب الاقتباس هنا..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="min-h-[100px] resize-none"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={!useCustomBook ? "default" : "outline"}
                size="sm"
                onClick={() => handleCustomBookToggle(false)}
                className="flex-1"
              >
                <BookOpen className="h-4 w-4 ml-1" />
                اختر من الكتب المتاحة
              </Button>
              <Button
                type="button"
                variant={useCustomBook ? "default" : "outline"}
                size="sm"
                onClick={() => handleCustomBookToggle(true)}
                className="flex-1"
              >
                إدخال كتاب مخصص
              </Button>
            </div>

            {!useCustomBook ? (
              <div className="space-y-2">
                <Label htmlFor="book-select">اختر الكتاب *</Label>
                <Select value={selectedBookId} onValueChange={handleBookSelect} disabled={booksLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={booksLoading ? "جارٍ التحميل..." : "اختر كتاباً من المكتبة"} />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{book.title}</span>
                          <span className="text-sm text-muted-foreground">{book.author}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="book-title">اسم الكتاب *</Label>
                  <Input
                    id="book-title"
                    placeholder="عنوان الكتاب"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="author-name">اسم المؤلف *</Label>
                  <Input
                    id="author-name"
                    placeholder="اسم المؤلف"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
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
              disabled={
                isSubmitting || 
                !quoteText.trim() || 
                (!useCustomBook && !selectedBookId) ||
                (useCustomBook && (!bookTitle.trim() || !authorName.trim()))
              }
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