import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageJumpDialogProps {
  currentPage: number;
  totalPages: number;
  onJumpToPage: (page: number) => void;
}

const PageJumpDialog = ({ currentPage, totalPages, onJumpToPage }: PageJumpDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput, 10);
    
    if (isNaN(pageNumber)) {
      setError('الرجاء إدخال رقم صحيح');
      return;
    }
    
    if (pageNumber < 1) {
      setError('رقم الصفحة يجب أن يكون 1 أو أكثر');
      return;
    }
    
    if (pageNumber > totalPages) {
      setError(`أقصى رقم صفحة هو ${totalPages}`);
      return;
    }
    
    onJumpToPage(pageNumber);
    setIsOpen(false);
    setPageInput('');
    setError('');
  };

  const handleQuickJump = (page: number) => {
    onJumpToPage(page);
    setIsOpen(false);
    setPageInput('');
    setError('');
  };

  const quickJumpOptions = [
    { label: 'البداية', page: 1 },
    { label: 'الربع', page: Math.ceil(totalPages / 4) },
    { label: 'النصف', page: Math.ceil(totalPages / 2) },
    { label: 'ثلاثة أرباع', page: Math.ceil((totalPages * 3) / 4) },
    { label: 'النهاية', page: totalPages },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setPageInput('');
        setError('');
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border-book-primary/30 hover:bg-book-primary/10 hover:border-book-primary/50 transition-all duration-300"
        >
          <BookOpen className="h-4 w-4 text-book-primary" />
          <span className="font-cairo text-sm text-book-primary font-medium">
            {currentPage} / {totalPages}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rtl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo text-xl text-center">
            الانتقال إلى صفحة
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              type="number"
              min={1}
              max={totalPages}
              placeholder={`أدخل رقم الصفحة (1-${totalPages})`}
              value={pageInput}
              onChange={(e) => {
                setPageInput(e.target.value);
                setError('');
              }}
              className="font-cairo text-center text-lg"
            />
            <Button type="submit" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              انتقال
            </Button>
          </div>
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-sm text-center font-cairo"
            >
              {error}
            </motion.p>
          )}
        </form>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3 font-cairo text-center">
            انتقال سريع
          </p>
          <div className="grid grid-cols-5 gap-2">
            {quickJumpOptions.map((option) => (
              <motion.button
                key={option.label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickJump(option.page)}
                className={`p-2 rounded-lg text-center transition-all duration-200 ${
                  currentPage === option.page
                    ? 'bg-book-primary text-white'
                    : 'bg-muted hover:bg-book-primary/20'
                }`}
              >
                <div className="text-xs font-cairo font-medium">{option.label}</div>
                <div className="text-lg font-bold font-cairo">{option.page}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center text-sm font-cairo">
            <span className="text-muted-foreground">الصفحة الحالية:</span>
            <span className="font-bold text-book-primary">{currentPage}</span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-book-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(currentPage / totalPages) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1 font-cairo">
            <span>1</span>
            <span>{Math.round((currentPage / totalPages) * 100)}%</span>
            <span>{totalPages}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PageJumpDialog;
