import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle, Loader2 } from "lucide-react";

interface BookRejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  bookTitle: string;
  isLoading?: boolean;
}

export const BookRejectionDialog: React.FC<BookRejectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookTitle,
  isLoading = false
}) => {
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmit = () => {
    if (rejectionReason.trim()) {
      onConfirm(rejectionReason.trim());
      setRejectionReason('');
    }
  };

  const handleClose = () => {
    setRejectionReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            رفض الكتاب
          </DialogTitle>
          <DialogDescription>
            سيتم رفض كتاب "<span className="font-semibold">{bookTitle}</span>" وحذفه نهائياً من النظام.
            يرجى كتابة سبب الرفض ليتم إرساله للمؤلف.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="rejection-reason" className="text-right">
              سبب الرفض *
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="يرجى كتابة سبب رفض الكتاب بشكل واضح ومفصل..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isLoading}
              dir="rtl"
            />
            <p className="text-xs text-muted-foreground text-right">
              سيتم إرسال هذا السبب للمؤلف عبر البريد الإلكتروني
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!rejectionReason.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الرفض...
              </>
            ) : (
              <>
                <XCircle className="ml-2 h-4 w-4" />
                تأكيد الرفض
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};