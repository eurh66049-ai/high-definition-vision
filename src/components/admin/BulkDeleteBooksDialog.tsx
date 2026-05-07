import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BulkDeleteBooksDialogProps {
  selectedBooks: Array<{ id: string; title: string }>;
  onBooksDeleted: () => void;
  onSelectionCleared: () => void;
}

const BulkDeleteBooksDialog: React.FC<BulkDeleteBooksDialogProps> = ({
  selectedBooks,
  onBooksDeleted,
  onSelectionCleared
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    if (!reason.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال سبب الحذف",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      // الحصول على بيانات المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('لا يمكن تحديد هوية المدير');
      }

      const bookIds = selectedBooks.map(book => book.id);
      
      const { data, error } = await supabaseFunctions.functions.invoke('bulk-delete-approved-books', {
        body: {
          bookIds,
          reason: reason.trim(),
          adminEmail: user.email
        }
      });

      if (error) {
        throw error;
      }

      const results = data.results;
      
      // عرض نتائج العملية
      if (results.successfulCount > 0) {
        toast({
          title: "نجح الحذف المجمع",
          description: `تم حذف ${results.successfulCount} كتاب بنجاح من أصل ${results.totalRequested}`,
          variant: "success"
        });
      }

      if (results.failedCount > 0) {
        toast({
          title: "تحذير",
          description: `فشل في حذف ${results.failedCount} كتاب. تحقق من الأذونات.`,
          variant: "destructive"
        });
      }

      // تنظيف وإعادة تحديث
      setReason('');
      setIsOpen(false);
      onSelectionCleared();
      onBooksDeleted();

    } catch (error: any) {
      console.error('خطأ في الحذف المجمع:', error);
      toast({
        title: "خطأ في الحذف",
        description: error.message || "فشل في حذف الكتب المحددة",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedBooks.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          حذف المحددة ({selectedBooks.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">حذف الكتب المحددة نهائياً</DialogTitle>
          <DialogDescription className="text-right">
            أنت على وشك حذف <Badge variant="destructive" className="mx-1">{selectedBooks.length}</Badge> كتاب نهائياً.
            هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع الملفات المرتبطة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded p-2">
            <Label className="text-sm font-semibold">الكتب المحددة:</Label>
            <ul className="text-sm mt-1 space-y-1">
              {selectedBooks.map((book, index) => (
                <li key={book.id} className="text-muted-foreground">
                  {index + 1}. {book.title}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">سبب الحذف النهائي *</Label>
            <Textarea
              id="reason"
              placeholder="اكتب سبب حذف هذه الكتب نهائياً..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isDeleting || !reason.trim()}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                تأكيد الحذف النهائي
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteBooksDialog;