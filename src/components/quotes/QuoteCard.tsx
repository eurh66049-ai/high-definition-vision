import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit, Trash2, BookOpen, Quote as QuoteIcon, Sparkles, ImageIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { Quote } from '@/hooks/useQuotes';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { optimizeImageUrl } from '@/utils/imageProxy';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { UnifiedProfileLink } from '@/components/profile/UnifiedProfileLink';
import { QuoteShareImage } from './QuoteShareImage';
import { QuoteLikeButton } from './QuoteLikeButton';
import { QuoteReplies } from './QuoteReplies';
import { resolveKotobiAiAvatar, isKotobiAiUser } from '@/utils/kotobiAi';

interface QuoteCardProps {
  quote: Quote;
  onDelete: (quoteId: string) => Promise<boolean>;
  onUpdate: (quoteId: string, quoteData: any) => Promise<boolean>;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onDelete, onUpdate }) => {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editQuoteText, setEditQuoteText] = useState(quote.quote_text);
  const [editBookTitle, setEditBookTitle] = useState(quote.book_title);
  const [editAuthorName, setEditAuthorName] = useState(quote.author_name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareImageOpen, setIsShareImageOpen] = useState(false);

  const isOwner = user?.id === quote.user_id;

  const handleBookClick = () => {
    const bookPath = quote.book_slug || quote.book_id;
    if (bookPath) {
      window.location.href = `/book/${bookPath}`;
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuoteText.trim() || !editBookTitle.trim() || !editAuthorName.trim()) return;
    setIsUpdating(true);
    const success = await onUpdate(quote.id, {
      quote_text: editQuoteText.trim(),
      book_title: editBookTitle.trim(),
      author_name: editAuthorName.trim()
    });
    if (success) setIsEditDialogOpen(false);
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(quote.id);
    if (success) setIsDeleteDialogOpen(false);
    setIsDeleting(false);
  };

  const timeAgo = formatDistanceToNow(new Date(quote.created_at), { addSuffix: true, locale: ar });

  return (
    <>
      <article className="quote-card group relative w-full overflow-hidden rounded-2xl bg-card border border-border/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {/* تخطيط من عمودين: شريط غلاف الكتاب + المحتوى */}
        <div className="flex">
          {/* العمود الأيمن: شريط الكتاب الفاخر */}
          <div
            className="relative w-[88px] md:w-[110px] flex-shrink-0 flex flex-col items-center justify-between py-5 px-3 cursor-pointer"
            onClick={handleBookClick}
            style={{
              background:
                'linear-gradient(160deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 60%, transparent 100%)',
            }}
          >
            {/* خط فاصل عمودي */}
            <div className="absolute left-0 top-4 bottom-4 w-px bg-border/80" />

            {quote.book_cover_url ? (
              <img
                src={quote.book_cover_url}
                alt={`غلاف ${quote.book_title}`}
                className="w-16 md:w-20 h-24 md:h-28 object-cover rounded-md shadow-md"
                loading="lazy"
              />
            ) : (
              <div className="w-16 md:w-20 h-24 md:h-28 rounded-md bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary/60" />
              </div>
            )}

            <QuoteIcon className="mt-3 h-5 w-5 text-primary/50" aria-hidden="true" />
          </div>

          {/* العمود الأيسر: المحتوى */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* رأس بسيط */}
            <header className="flex items-center justify-between px-4 md:px-5 pt-4">
              <UnifiedProfileLink
                userId={quote.user_id}
                username={quote.username}
                className="flex items-center gap-2.5 min-w-0"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={(() => {
                      const resolved = resolveKotobiAiAvatar({ userId: quote.user_id, avatarUrl: quote.avatar_url });
                      if (!resolved) return '';
                      return isKotobiAiUser(quote.user_id) ? resolved : optimizeImageUrl(resolved, 'avatar');
                    })()}
                    alt={quote.username}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {quote.username?.[0] || 'م'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 leading-tight">
                  <p className="font-semibold text-[13px] text-foreground truncate">{quote.username}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                </div>
              </UnifiedProfileLink>

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </header>

            {/* نص الاقتباس — البطل */}
            <blockquote className="px-4 md:px-5 py-4 flex-1">
              <p
                className="text-[16px] md:text-[19px] leading-[1.95] text-foreground font-medium"
                style={{
                  fontFamily: "'Amiri', 'Noto Naskh Arabic', serif",
                }}
              >
                {quote.quote_text}
              </p>
            </blockquote>

            {/* معلومات الكتاب — سطر واحد أنيق */}
            <div
              className="px-4 md:px-5 py-2.5 flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 cursor-pointer"
              onClick={handleBookClick}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[13px] text-foreground truncate hover:text-primary transition-colors">
                  {quote.book_title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{quote.author_name}</p>
              </div>
              {quote.book_category && (
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 px-2 py-0 flex-shrink-0">
                  {getCategoryInArabic(quote.book_category)}
                </Badge>
              )}
            </div>

            {/* شريط الإجراءات */}
            <div className="px-2 md:px-3 py-1.5 flex items-center flex-wrap gap-0.5 border-t border-border/60">
              <QuoteLikeButton quoteId={quote.id} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsShareImageOpen(true)}
                className="h-8 flex items-center gap-1.5 rounded-full px-2.5 text-muted-foreground hover:text-primary"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-xs">صورة</span>
              </Button>
              <QuoteReplies quoteId={quote.id} />
            </div>
          </div>
        </div>
      </article>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">تعديل الاقتباس</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quote-text">نص الاقتباس *</Label>
              <Textarea id="edit-quote-text" value={editQuoteText} onChange={(e) => setEditQuoteText(e.target.value)} className="min-h-[100px] resize-none" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-book-title">اسم الكتاب *</Label>
              <Input id="edit-book-title" value={editBookTitle} onChange={(e) => setEditBookTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-author-name">اسم المؤلف *</Label>
              <Input id="edit-author-name" value={editAuthorName} onChange={(e) => setEditAuthorName(e.target.value)} required />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">إلغاء</Button>
              <Button type="submit" disabled={isUpdating || !editQuoteText.trim() || !editBookTitle.trim() || !editAuthorName.trim()} className="flex-1">
                {isUpdating ? 'جارٍ التحديث...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">حذف الاقتباس</AlertDialogTitle>
            <AlertDialogDescription className="text-center">هل أنت متأكد من حذف هذا الاقتباس؟ لن يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'جارٍ الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuoteShareImage
        quote={quote}
        open={isShareImageOpen}
        onOpenChange={setIsShareImageOpen}
      />
    </>
  );
};
