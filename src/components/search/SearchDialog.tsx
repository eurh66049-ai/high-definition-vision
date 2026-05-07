import React, { useRef, useState } from 'react';
import { Camera, LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { createBookSlug } from '@/utils/bookSlug';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ====== SearchDialog — نافذة البحث الرئيسية ====== */
interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageResults, setImageResults] = useState<any[]>([]);
  const [extractedInfo, setExtractedInfo] = useState<any>(null);
  const [imageSearched, setImageSearched] = useState(false);

  // Live text search state
  const [searchTerm, setSearchTerm] = useState('');
  const [textResults, setTextResults] = useState<any[]>([]);
  const [textSearching, setTextSearching] = useState(false);

  // Live search as user types
  React.useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 1) {
      setTextResults([]);
      return;
    }
    setTextSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('book_submissions')
          .select('id, title, author, category, cover_image_url')
          .eq('status', 'approved')
          .or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .order('title', { ascending: true })
          .limit(8);
        setTextResults(data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setTextSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleTextSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setImagePreview(null);
    setImageResults([]);
    setExtractedInfo(null);
    setImageSearched(false);
    setSearchTerm('');
    setTextResults([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة فقط');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      await searchByImage(base64);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const searchByImage = async (imageBase64: string) => {
    setImageLoading(true);
    setImageResults([]);
    setExtractedInfo(null);
    setImageSearched(false);

    try {
      const { data, error } = await supabaseFunctions.functions.invoke('search-by-image', {
        body: { imageBase64 },
      });
      if (error) throw error;
      if (data?.success) {
        setImageResults(data.results || []);
        setExtractedInfo(data.extractedInfo);
      } else {
        toast.error(data?.error || 'حدث خطأ أثناء البحث');
      }
    } catch (err) {
      console.error('Image search error:', err);
      toast.error('حدث خطأ أثناء البحث بالصورة');
    } finally {
      setImageLoading(false);
      setImageSearched(true);
    }
  };

  const BookResultItem = ({ book, onClickAction }: { book: any; onClickAction: () => void }) => (
    <Link
      to={`/book/${createBookSlug(book.title, book.author)}`}
      onClick={onClickAction}
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
    >
      <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-muted shadow-sm">
        <img
          src={book.cover_image_url || '/placeholder.svg'}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground text-sm truncate">{book.title}</h4>
        <p className="text-muted-foreground text-xs truncate">{book.author}</p>
        <p className="text-muted-foreground text-xs">{getCategoryInArabic(book.category)}</p>
      </div>
    </Link>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v ? handleClose() : onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-4" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">🔍 بحث</DialogTitle>
        </DialogHeader>

        {/* البحث النصي + زر البحث بالصورة */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleTextSearch} className="flex-1">
            <Input
              name="q"
              placeholder="ابحث عن كتاب أو مؤلف..."
              className="text-right"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
            title="البحث بصورة الغلاف"
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>

        {/* نتائج البحث النصي المباشر */}
        {textSearching && searchTerm.trim() && (
          <div className="flex items-center justify-center py-4">
            <LoaderCircle className="h-5 w-5 text-primary animate-spin" />
            <span className="text-muted-foreground text-sm mr-2">جاري البحث...</span>
          </div>
        )}

        {!textSearching && searchTerm.trim() && textResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">تم العثور على {textResults.length} نتيجة</p>
            {textResults.map((book) => (
              <BookResultItem key={book.id} book={book} onClickAction={handleClose} />
            ))}
          </div>
        )}

        {!textSearching && searchTerm.trim().length >= 1 && textResults.length === 0 && (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">لم يتم العثور على نتائج لـ "{searchTerm}"</p>
          </div>
        )}

        {/* معاينة الصورة */}
        {imagePreview && (
          <div className="flex justify-center mb-4 mt-2">
            <div className="relative w-32 h-44 rounded-lg overflow-hidden shadow-md border border-border">
              <img src={imagePreview} alt="صورة الغلاف" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* المعلومات المستخرجة */}
        {extractedInfo && (extractedInfo.title || extractedInfo.author) && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm space-y-1">
            <p className="text-muted-foreground font-medium">المعلومات المستخرجة:</p>
            {extractedInfo.title && (
              <p>📖 العنوان: <span className="font-semibold text-foreground">{extractedInfo.title}</span></p>
            )}
            {extractedInfo.author && (
              <p>✍️ المؤلف: <span className="font-semibold text-foreground">{extractedInfo.author}</span></p>
            )}
          </div>
        )}

        {/* تحميل */}
        {imageLoading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <LoaderCircle className="h-8 w-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">جاري تحليل الصورة والبحث...</p>
          </div>
        )}

        {/* نتائج البحث بالصورة */}
        {!imageLoading && imageSearched && imageResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">تم العثور على {imageResults.length} نتيجة</p>
            {imageResults.map((book) => (
              <Link
                key={book.id}
                to={`/book/${createBookSlug(book.title, book.author)}`}
                onClick={handleClose}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-muted shadow-sm">
                  <img
                    src={book.cover_image_url || '/placeholder.svg'}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm truncate">{book.title}</h4>
                  <p className="text-muted-foreground text-xs truncate">{book.author}</p>
                  <p className="text-muted-foreground text-xs">{getCategoryInArabic(book.category)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* لا نتائج */}
        {!imageLoading && imageSearched && imageResults.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لم يتم العثور على كتب مطابقة</p>
            <p className="text-muted-foreground text-sm mt-1">جرب صورة أوضح للغلاف</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ====== ImageSearchButton — زر البحث بالصورة المستقل ====== */
export function ImageSearchButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [extractedInfo, setExtractedInfo] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار صورة فقط'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      setOpen(true);
      const base64 = dataUrl.split(',')[1];
      await searchByImage(base64);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const searchByImage = async (imageBase64: string) => {
    setLoading(true); setResults([]); setExtractedInfo(null); setSearched(false);
    try {
      const { data, error } = await supabaseFunctions.functions.invoke('search-by-image', { body: { imageBase64 } });
      if (error) throw error;
      if (data?.success) { setResults(data.results || []); setExtractedInfo(data.extractedInfo); }
      else { toast.error(data?.error || 'حدث خطأ أثناء البحث'); }
    } catch (err) { console.error('Image search error:', err); toast.error('حدث خطأ أثناء البحث بالصورة'); }
    finally { setLoading(false); setSearched(true); }
  };

  const handleClose = () => { setOpen(false); setPreview(null); setResults([]); setExtractedInfo(null); setSearched(false); };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}
        className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="البحث بصورة الغلاف">
        <Camera className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">🔍 البحث بصورة الغلاف</DialogTitle></DialogHeader>
          {preview && (
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-44 rounded-lg overflow-hidden shadow-md border border-border">
                <img src={preview} alt="صورة الغلاف" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          {extractedInfo && (extractedInfo.title || extractedInfo.author) && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <p className="text-muted-foreground font-medium">المعلومات المستخرجة:</p>
              {extractedInfo.title && <p>📖 العنوان: <span className="font-semibold text-foreground">{extractedInfo.title}</span></p>}
              {extractedInfo.author && <p>✍️ المؤلف: <span className="font-semibold text-foreground">{extractedInfo.author}</span></p>}
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <LoaderCircle className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">جاري تحليل الصورة والبحث...</p>
            </div>
          )}
          {!loading && searched && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">تم العثور على {results.length} نتيجة</p>
              {results.map((book) => (
                <Link key={book.id} to={`/book/${createBookSlug(book.title, book.author)}`} onClick={handleClose}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-muted shadow-sm">
                    <img src={book.cover_image_url || '/placeholder.svg'} alt={book.title} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">{book.title}</h4>
                    <p className="text-muted-foreground text-xs truncate">{book.author}</p>
                    <p className="text-muted-foreground text-xs">{getCategoryInArabic(book.category)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لم يتم العثور على كتب مطابقة</p>
              <p className="text-muted-foreground text-sm mt-1">جرب صورة أوضح للغلاف</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
