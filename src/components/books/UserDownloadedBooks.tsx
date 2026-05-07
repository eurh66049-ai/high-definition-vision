import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Download, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';


interface DownloadedBook {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string | null;
  book_cover_url: string | null;
  book_slug: string | null;
  downloaded_at: string;
}

const UserDownloadedBooks: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<DownloadedBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDownloads();
  }, [user]);

  const fetchDownloads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_downloads')
        .select('*')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeDownload = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_downloads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBooks(prev => prev.filter(b => b.id !== id));
      toast.success('تم إزالة الكتاب من قائمة التحميلات');
    } catch (error) {
      console.error('Error removing download:', error);
      toast.error('حدث خطأ أثناء الإزالة');
    }
  };

  const navigateToBook = (book: DownloadedBook) => {
    // استخدام slug المحفوظ أو book_id مباشرة (UUID)
    const identifier = book.book_slug || book.book_id;
    navigate(`/book/${identifier}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Download className="h-16 w-16 text-muted-foreground mx-auto opacity-40" />
        <h3 className="text-lg font-bold text-foreground font-tajawal">لا توجد تحميلات بعد</h3>
        <p className="text-muted-foreground font-cairo text-sm max-w-md mx-auto">
          عند تحميل أي كتاب من المنصة سيظهر هنا تلقائياً
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="font-cairo mt-2"
        >
          <BookOpen className="h-4 w-4 ml-2" />
          تصفح الكتب
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-cairo mb-4">
        عدد الكتب المحملة: {books.length}
      </p>
      <AnimatePresence>
        {books.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex gap-4 items-center">
                <div
                  className="w-14 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0"
                  onClick={() => navigateToBook(book)}
                >
                  {book.book_cover_url ? (
                    <img
                      src={book.book_cover_url}
                      alt={book.book_title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0" onClick={() => navigateToBook(book)}>
                  <h3 className="font-bold text-foreground font-amiri text-base line-clamp-1">
                    {book.book_title}
                  </h3>
                  {book.book_author && (
                    <p className="text-sm text-muted-foreground font-cairo line-clamp-1">
                      {book.book_author}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 font-cairo mt-1">
                    {new Date(book.downloaded_at).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDownload(book.id);
                  }}
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default UserDownloadedBooks;
