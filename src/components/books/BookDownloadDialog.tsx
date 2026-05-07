import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Check, BookOpen, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useBookDownloads } from '@/hooks/useBookDownloads';
import { convertPdfToProxyUrl } from '@/utils/imageProxy';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const WAIT_TIME_SECONDS = 7;

interface BookDownloadDialogProps {
  book: {
    id: string | number;
    title: string;
    author: { name: string };
    coverImage?: string;
    downloadUrl?: string;
    file_type?: string;
    slug?: string;
  };
  trigger: React.ReactNode;
}

const BookDownloadDialog: React.FC<BookDownloadDialogProps> = ({ book, trigger }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [waitProgress, setWaitProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(WAIT_TIME_SECONDS);
  const { recordDownload } = useBookDownloads(String(book.id));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // تنظيف المؤقتات عند إغلاق النافذة
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsWaiting(false);
      setWaitProgress(0);
      setRemainingSeconds(WAIT_TIME_SECONDS);
      setIsDownloading(false);
      setDownloadComplete(false);
    }
  }, [isOpen]);

  const startDownloadProcess = () => {
    if (!book.downloadUrl) {
      toast.error('رابط التحميل غير متوفر');
      return;
    }

    downloadFile();
  };

  const downloadFile = async () => {
    if (!book.downloadUrl) return;

    setIsDownloading(true);

    try {
      const proxiedUrl = convertPdfToProxyUrl(book.downloadUrl);
      const response = await fetch(proxiedUrl);
      
      if (!response.ok || !response.body) {
        throw new Error('فشل في تحميل الملف');
      }

      const reader = response.body.getReader();
      let chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
        }
      }

      // تحديد نوع الملف
      let mimeType = 'application/pdf';
      let fileExtension = '.pdf';
      
      if (book.file_type) {
        mimeType = book.file_type;
        switch (book.file_type) {
          case 'text/plain':
            fileExtension = '.txt';
            break;
          case 'application/msword':
            fileExtension = '.doc';
            break;
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            fileExtension = '.docx';
            break;
          default:
            const urlParts = book.downloadUrl.split('.');
            if (urlParts.length > 1) {
              fileExtension = '.' + urlParts[urlParts.length - 1].split('?')[0];
            }
        }
      }

      const blob = new Blob(chunks, { type: mimeType });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${book.title} - kotobi${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      await recordDownload();
      
      // تسجيل التحميل في سجل المستخدم
      if (user) {
        try {
          await supabase.from('user_downloads').upsert({
            user_id: user.id,
            book_id: String(book.id),
            book_title: book.title,
            book_author: book.author?.name || null,
            book_cover_url: book.coverImage || null,
            book_slug: book.slug || null,
            downloaded_at: new Date().toISOString(),
          }, { onConflict: 'user_id,book_id' });
        } catch (e) {
          console.error('Error tracking download:', e);
        }
      }
      
      setDownloadComplete(true);
      toast.success('تم تحميل الكتاب بنجاح!');

      setTimeout(() => {
        setIsOpen(false);
      }, 1500);

    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل في تحميل الكتاب');
      setIsDownloading(false);
      setWaitProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm p-0 bg-background border-border rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 space-y-5">
          {/* Book Cover & Info */}
          <div className="flex gap-4 items-start">
            <div className="relative w-20 h-28 rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-muted">
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-base font-bold text-foreground font-amiri leading-snug line-clamp-2 mb-1">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground font-cairo">
                {book.author.name}
              </p>
            </div>
          </div>

          {/* Progress Bar - Waiting Phase */}
          <AnimatePresence>
            {(isWaiting || isDownloading) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm text-muted-foreground font-cairo">
                  <span>{isWaiting ? `انتظر ${remainingSeconds} ثانية...` : 'جاري التحميل...'}</span>
                  <span>{Math.round(waitProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${waitProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Download Button or Login Prompt */}
          {user ? (
            <Button
              onClick={startDownloadProcess}
              disabled={isWaiting || isDownloading}
              className={`w-full font-cairo text-base py-5 rounded-xl transition-all duration-300 ${
                downloadComplete 
                  ? 'bg-green-500 hover:bg-green-500 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              <AnimatePresence mode="wait">
                {downloadComplete ? (
                  <motion.span
                    key="complete"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Check className="h-5 w-5" />
                    تم التحميل
                  </motion.span>
                ) : isDownloading ? (
                  <motion.span
                    key="downloading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري التحميل...
                  </motion.span>
                ) : isWaiting ? (
                  <motion.span
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Loader2 className="h-5 w-5 animate-spin" />
                    انتظر {remainingSeconds} ثانية...
                  </motion.span>
                ) : (
                  <motion.span
                    key="download"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    تحميل الكتاب
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground font-cairo">
                يجب تسجيل الدخول لتحميل الكتب
              </p>
              <Button
                onClick={() => {
                  try { localStorage.setItem('auth_redirect_path', window.location.pathname + window.location.search); } catch {}
                  setIsOpen(false);
                  navigate('/auth');
                }}
                className="w-full font-cairo text-base py-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <LogIn className="h-5 w-5 ml-2" />
                تسجيل الدخول
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookDownloadDialog;
