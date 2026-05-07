import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BanUserDialogProps {
  userId: string;
  username: string;
  children?: React.ReactNode;
}

const BanUserDialog: React.FC<BanUserDialogProps> = ({ userId, username, children }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7'); // أيام

  const handleBanUser = async () => {
    if (!reason.trim()) {
      toast({
        title: "يجب إدخال سبب الحظر",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const banData: any = {
        user_id: userId,
        reason: reason.trim(),
        ban_type: banType
      };

      if (banType === 'temporary') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(duration));
        banData.expires_at = expiresAt.toISOString();
      }

      const { error } = await supabase
        .from('banned_users')
        .insert(banData);

      if (error) throw error;

      toast({
        title: "تم حظر المستخدم",
        description: `تم حظر المستخدم ${username} بنجاح.`
      });

      setOpen(false);
      setReason('');
      setBanType('temporary');
      setDuration('7');

    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "خطأ في حظر المستخدم",
        description: "تعذر حظر المستخدم. يرجى المحاولة مرة أخرى.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="destructive" size="sm" className="font-cairo">
            <UserX className="h-4 w-4 mr-2" />
            حظر المستخدم
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-tajawal">حظر المستخدم: {username}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ban-type" className="font-cairo">نوع الحظر</Label>
            <Select value={banType} onValueChange={(value: any) => setBanType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">حظر مؤقت</SelectItem>
                <SelectItem value="permanent">حظر دائم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {banType === 'temporary' && (
            <div>
              <Label htmlFor="duration" className="font-cairo">مدة الحظر (بالأيام)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">يوم واحد</SelectItem>
                  <SelectItem value="3">3 أيام</SelectItem>
                  <SelectItem value="7">أسبوع</SelectItem>
                  <SelectItem value="14">أسبوعين</SelectItem>
                  <SelectItem value="30">شهر</SelectItem>
                  <SelectItem value="90">3 أشهر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="reason" className="font-cairo">سبب الحظر</Label>
            <Textarea
              id="reason"
              placeholder="اكتب سبب حظر هذا المستخدم..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="font-cairo"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 font-cairo"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={loading || !reason.trim()}
              className="flex-1 font-cairo"
            >
              {loading ? 'جاري الحظر...' : 'حظر المستخدم'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BanUserDialog;