import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Trash2, Edit2, X, Check, Megaphone, ImagePlus, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface SiteUpdate {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

const SiteUpdatesManager: React.FC = () => {
  const [updates, setUpdates] = useState<SiteUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `update-${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-updates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('site-updates')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في رفع الصورة',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'خطأ', description: 'يرجى اختيار ملف صورة فقط', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'حجم الصورة يجب أن لا يتجاوز 5 ميجابايت', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب التحديثات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال العنوان والرسالة',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase.from('site_updates').insert({
        title: title.trim(),
        message: message.trim(),
        image_url: imageUrl,
        created_by: user?.id,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'تم الإرسال',
        description: 'تم نشر التحديث بنجاح لجميع المستخدمين',
      });

      setTitle('');
      setMessage('');
      clearImage();
      fetchUpdates();
    } catch (error) {
      console.error('Error submitting update:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في نشر التحديث',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('site_updates')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      setUpdates(prev =>
        prev.map(update =>
          update.id === id ? { ...update, is_active: !currentState } : update
        )
      );

      toast({
        title: 'تم التحديث',
        description: !currentState ? 'تم تفعيل التحديث' : 'تم إخفاء التحديث',
      });
    } catch (error) {
      console.error('Error toggling update:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تغيير حالة التحديث',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التحديث؟')) return;

    try {
      const { error } = await supabase.from('site_updates').delete().eq('id', id);

      if (error) throw error;

      setUpdates(prev => prev.filter(update => update.id !== id));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف التحديث بنجاح',
      });
    } catch (error) {
      console.error('Error deleting update:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف التحديث',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (update: SiteUpdate) => {
    setEditingId(update.id);
    setEditTitle(update.title);
    setEditMessage(update.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditMessage('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim() || !editMessage.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال العنوان والرسالة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('site_updates')
        .update({
          title: editTitle.trim(),
          message: editMessage.trim(),
        })
        .eq('id', id);

      if (error) throw error;

      setUpdates(prev =>
        prev.map(update =>
          update.id === id
            ? { ...update, title: editTitle.trim(), message: editMessage.trim() }
            : update
        )
      );

      cancelEdit();
      toast({
        title: 'تم التحديث',
        description: 'تم تعديل التحديث بنجاح',
      });
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تعديل التحديث',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Form for new update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            نشر تحديث جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">عنوان التحديث</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="أدخل عنوان التحديث..."
                className="mt-1"
                dir="rtl"
              />
            </div>
            <div>
              <Label htmlFor="message">نص الرسالة</Label>
              <Textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="أدخل نص الرسالة التي ستظهر لجميع المستخدمين..."
                className="mt-1 min-h-[120px]"
                dir="rtl"
              />
            </div>
            <div>
              <Label>صورة (اختياري)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative mt-2 inline-block">
                  <img src={imagePreview} alt="معاينة" className="max-h-40 rounded-lg border" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={clearImage}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1 w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4 ml-2" />
                  إضافة صورة
                </Button>
              )}
            </div>
            <Button type="submit" disabled={submitting || uploadingImage} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  نشر التحديث للجميع
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of updates */}
      <Card>
        <CardHeader>
          <CardTitle>التحديثات السابقة ({updates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد تحديثات منشورة بعد
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map(update => (
                <Card key={update.id} className="border">
                  <CardContent className="p-4">
                    {editingId === update.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="العنوان"
                          dir="rtl"
                        />
                        <Textarea
                          value={editMessage}
                          onChange={e => setEditMessage(e.target.value)}
                          placeholder="الرسالة"
                          dir="rtl"
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(update.id)}
                          >
                            <Check className="h-4 w-4 ml-1" />
                            حفظ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4 ml-1" />
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{update.title}</h3>
                              <Badge
                                variant={update.is_active ? 'default' : 'secondary'}
                              >
                                {update.is_active ? 'مفعل' : 'مخفي'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {update.message}
                            </p>
                            {update.image_url && (
                              <img src={update.image_url} alt={update.title} className="mt-2 max-h-32 rounded-lg border" />
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(update.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`active-${update.id}`} className="text-xs">
                                {update.is_active ? 'مفعل' : 'مخفي'}
                              </Label>
                              <Switch
                                id={`active-${update.id}`}
                                checked={update.is_active}
                                onCheckedChange={() =>
                                  handleToggleActive(update.id, update.is_active)
                                }
                              />
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(update)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDelete(update.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteUpdatesManager;
