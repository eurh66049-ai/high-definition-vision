import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReadingClubs } from '@/hooks/useReadingClubs';
import { useApprovedBooksForSelect } from '@/hooks/useApprovedBooksForSelect';
import { BookOpen, Users, Lock, Globe, Search, Check } from 'lucide-react';

interface CreateClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateClubDialog: React.FC<CreateClubDialogProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { createClub } = useReadingClubs();
  const { books, loading: booksLoading } = useApprovedBooksForSelect();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    book_id: '',
    max_members: 20,
    is_public: true
  });
  const [creating, setCreating] = useState(false);
  const [bookSearch, setBookSearch] = useState('');

  const selectedBook = books.find(b => b.id === formData.book_id);

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    book.author.toLowerCase().includes(bookSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.book_id) {
      return;
    }

    setCreating(true);
    
    const club = await createClub({
      name: formData.name,
      description: formData.description || undefined,
      book_id: formData.book_id,
      book_title: selectedBook?.title || '',
      book_cover_url: selectedBook?.cover_image_url || undefined,
      book_author: selectedBook?.author || undefined,
      max_members: formData.max_members,
      is_public: formData.is_public
    });

    setCreating(false);

    if (club) {
      onOpenChange(false);
      navigate(`/reading-clubs/${(club as any).id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto pb-24 sm:pb-6 mb-20 sm:mb-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            إنشاء نادي قراءة جديد
          </DialogTitle>
          <DialogDescription>
            أنشئ ناديًا لقراءة كتاب مع الآخرين ومناقشته معًا
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* اسم النادي */}
          <div className="space-y-2">
            <Label htmlFor="name">اسم النادي *</Label>
            <Input
              id="name"
              placeholder="مثال: نادي الروايات العالمية"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* اختيار الكتاب مع البحث */}
          <div className="space-y-2">
            <Label>اختر الكتاب *</Label>
            
            {/* حقل البحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن كتاب بالاسم أو المؤلف..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* قائمة الكتب */}
            <ScrollArea className="h-48 border rounded-lg">
              {booksLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">جاري تحميل الكتب...</div>
              ) : filteredBooks.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {bookSearch ? 'لا توجد نتائج للبحث' : 'لا توجد كتب متاحة'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredBooks.map(book => (
                    <div
                      key={book.id}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, book_id: book.id }));
                        setBookSearch('');
                      }}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.book_id === book.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <img
                        src={book.cover_image_url || '/placeholder.svg'}
                        alt=""
                        className="w-8 h-11 object-cover rounded shadow-sm flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{book.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                      </div>
                      {formData.book_id === book.id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* الكتاب المختار */}
            {selectedBook && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <img
                  src={selectedBook.cover_image_url || '/placeholder.svg'}
                  alt={selectedBook.title}
                  className="w-12 h-16 object-cover rounded shadow"
                />
                <div>
                  <p className="font-medium text-sm line-clamp-1">{selectedBook.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedBook.author}</p>
                </div>
              </div>
            )}
          </div>

          {/* الوصف */}
          <div className="space-y-2">
            <Label htmlFor="description">وصف النادي</Label>
            <Textarea
              id="description"
              placeholder="صف هدف النادي وما تريد مناقشته..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* عدد الأعضاء */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              الحد الأقصى للأعضاء
            </Label>
            <select
              value={formData.max_members}
              onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value={5}>5 أعضاء</option>
              <option value={10}>10 أعضاء</option>
              <option value={20}>20 عضوًا</option>
              <option value={50}>50 عضوًا</option>
              <option value={100}>100 عضو</option>
            </select>
          </div>

          {/* نادي عام/خاص */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {formData.is_public ? (
                <Globe className="h-4 w-4 text-green-500" />
              ) : (
                <Lock className="h-4 w-4 text-yellow-500" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {formData.is_public ? 'نادي عام' : 'نادي خاص'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.is_public 
                    ? 'يمكن لأي شخص الانضمام' 
                    : 'بدعوة فقط'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
            />
          </div>

          {/* أزرار */}
          <div className="flex gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={creating || !formData.name || !formData.book_id}
              className="flex-1"
            >
              {creating ? 'جاري الإنشاء...' : 'إنشاء النادي'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClubDialog;
