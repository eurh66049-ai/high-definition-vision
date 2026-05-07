import React, { useState, useRef } from 'react';
import { X, Image, Video, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AddStoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File, caption?: string) => Promise<void>;
  uploading: boolean;
}

const AddStoryDialog: React.FC<AddStoryDialogProps> = ({
  open,
  onClose,
  onSubmit,
  uploading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('يرجى اختيار صورة أو فيديو');
      return;
    }

    // التحقق من حجم الملف (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 50 ميجابايت');
      return;
    }

    setSelectedFile(file);
    setIsVideo(file.type.startsWith('video/'));
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('يرجى اختيار صورة أو فيديو');
      return;
    }

    await onSubmit(selectedFile, caption || undefined);
    handleReset();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setIsVideo(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-background rounded-2xl w-full max-w-lg overflow-hidden"
        >
          {/* الرأس */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold">إضافة قصة جديدة</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* المحتوى */}
          <div className="p-4 space-y-4">
            {!preview ? (
              // منطقة اختيار الملف
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-book-primary/50 transition-colors"
              >
                <div className="flex justify-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-book-primary/10 flex items-center justify-center">
                    <Image className="w-8 h-8 text-book-primary" />
                  </div>
                  <div className="w-16 h-16 rounded-full bg-book-secondary/10 flex items-center justify-center">
                    <Video className="w-8 h-8 text-book-secondary" />
                  </div>
                </div>
                <p className="text-foreground font-medium mb-2">
                  اختر صورة أو فيديو
                </p>
                <p className="text-muted-foreground text-sm">
                  الحد الأقصى للحجم: 50 ميجابايت
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              // معاينة الملف
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[400px] mx-auto">
                  {isVideo ? (
                    <video
                      src={preview}
                      className="w-full h-full object-contain"
                      controls
                      muted
                    />
                  ) : (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleReset}
                    disabled={uploading}
                  >
                    تغيير
                  </Button>
                </div>

                {/* التعليق */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    أضف تعليقاً (اختياري)
                  </label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="اكتب تعليقاً..."
                    maxLength={200}
                    rows={2}
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-left">
                    {caption.length}/200
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* الأزرار */}
          <div className="flex gap-3 p-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={uploading}
            >
              إلغاء
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-book-primary to-book-secondary"
              onClick={handleSubmit}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري النشر...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  نشر القصة
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddStoryDialog;
