import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

interface MessageRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
  onSend: (receiverId: string, message?: string) => Promise<boolean>;
}

export const MessageRequestDialog: React.FC<MessageRequestDialogProps> = ({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
  onSend
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const success = await onSend(targetUserId, message.trim() || undefined);
    setSending(false);
    
    if (success) {
      setMessage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <MessageCircle className="h-5 w-5 text-primary" />
            طلب مراسلة
          </DialogTitle>
          <DialogDescription className="text-right">
            إرسال طلب مراسلة إلى <strong>{targetUsername}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message" className="text-right block">
              رسالة مع الطلب (اختياري)
            </Label>
            <Textarea
              id="message"
              placeholder="اكتب رسالة قصيرة للتعريف بنفسك..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none text-right"
              dir="rtl"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-left">
              {message.length}/500
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground text-right">
            <p>• سيصل إشعار للمستخدم بطلبك</p>
            <p>• عند قبول الطلب، يمكنكم تبادل الرسائل</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
