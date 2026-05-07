
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';

interface DeleteBookDialogProps {
  bookId: string;
  bookTitle: string;
  onBookDeleted: () => void;
}

const DeleteBookDialog: React.FC<DeleteBookDialogProps> = ({
  bookId,
  bookTitle,
  onBookDeleted
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState('');

  const handleDelete = async () => {
    console.log('=== تم الضغط على زر تأكيد الحذف ===');
    console.log('Reason text:', `"${reason}"`);
    console.log('Reason trimmed:', `"${reason.trim()}"`);
    console.log('Is reason empty?', !reason.trim());
    
    if (!reason.trim()) {
      console.log('توقف: السبب فارغ');
      toast.error('يرجى إدخال سبب الحذف النهائي');
      return;
    }

    console.log('=== بدء عملية حذف الكتاب ===');
    console.log('Book ID:', bookId);
    console.log('Book Title:', bookTitle);
    console.log('Reason:', reason.trim());

    setIsDeleting(true);
    
    try {
      console.log('=== استدعاء edge function: delete-approved-book ===');
      console.log('Request body:', { bookId, reason: reason.trim(), adminEmail: 'adilelbourachdi397@gmail.com' });
      
      const { data, error } = await supabaseFunctions.functions.invoke('delete-approved-book', {
        body: { 
          bookId,
          reason: reason.trim(),
          adminEmail: 'adilelbourachdi397@gmail.com'
        }
      });
      
      console.log('=== Raw response from edge function ===');
      console.log('Raw data:', data);
      console.log('Raw error:', error);

      console.log('=== نتيجة edge function ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('=== خطأ في Edge Function ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        throw new Error(error.message || 'فشل في حذف الكتاب');
      }

      if (!data) {
        console.error('=== لا توجد بيانات في الاستجابة ===');
        throw new Error('لم يتم الحصول على استجابة من الخادم');
      }

      if (!data.success) {
        console.error('=== العملية فشلت ===');
        console.error('Error from server:', data.error);
        throw new Error(data.error || 'فشل في حذف الكتاب');
      }

      console.log('تم حذف الكتاب نهائياً بنجاح');
      
      toast.success('تم حذف الكتاب نهائياً', {
        description: `تم حذف كتاب "${bookTitle}" وجميع بياناته نهائياً`
      });
      
      setIsOpen(false);
      setReason('');
      onBookDeleted();
      
    } catch (error) {
      console.error('خطأ في حذف الكتاب نهائياً:', error);
      toast.error('خطأ في حذف الكتاب نهائياً', {
        description: error instanceof Error ? error.message : 'حدثت مشكلة أثناء حذف الكتاب نهائياً'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="ml-1 h-4 w-4" />
          حذف نهائي
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">تأكيد الحذف النهائي</DialogTitle>
          <DialogDescription className="text-right">
            هل أنت متأكد من حذف كتاب "{bookTitle}" نهائياً؟
            <br />
            <strong className="text-red-600">تحذير:</strong> سيتم حذف الكتاب وجميع ملفاته وبياناته نهائياً ولن يمكن استرداده!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="delete-reason">سبب الحذف النهائي (مطلوب)</Label>
            <Textarea
              id="delete-reason"
              placeholder="اذكر سبب حذف هذا الكتاب نهائياً..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('تم الضغط على زر الإلغاء');
              setIsOpen(false);
            }}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button 
            variant="destructive"
            onClick={(e) => {
              console.log('تم الضغط على زر تأكيد الحذف!');
              console.log('Event:', e);
              console.log('Current reason:', `"${reason}"`);
              console.log('Is button disabled?', isDeleting || !reason.trim());
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
            type="button"
          >
            {isDeleting ? (
              <Loader2 className="ml-1 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="ml-1 h-4 w-4" />
            )}
            {isDeleting ? 'جاري الحذف النهائي...' : 'تأكيد الحذف النهائي'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteBookDialog;
