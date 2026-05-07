import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, BookOpen, Users, X } from 'lucide-react';

interface PageHint {
  paragraph_index: number;
  hint_type: string;
  hint_message: string;
  relevance_score: number;
}

interface ReaderHintsProps {
  hints: PageHint[];
  currentPage: number;
  className?: string;
}

const ReaderHints: React.FC<ReaderHintsProps> = ({ hints, currentPage, className = '' }) => {
  const [visibleHints, setVisibleHints] = useState<PageHint[]>([]);
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [showHints, setShowHints] = useState(false);

  // عرض التلميحات تدريجياً بعد بضع ثوانٍ
  useEffect(() => {
    if (hints.length === 0) {
      setVisibleHints([]);
      setShowHints(false);
      return;
    }

    // انتظار 3 ثوانٍ قبل عرض التلميحات
    const timer = setTimeout(() => {
      const filteredHints = hints.filter(
        hint => !dismissedHints.has(`${currentPage}-${hint.paragraph_index}`)
      );
      setVisibleHints(filteredHints);
      if (filteredHints.length > 0) {
        setShowHints(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [hints, currentPage, dismissedHints]);

  // إخفاء تلميح معين
  const dismissHint = (hint: PageHint) => {
    const key = `${currentPage}-${hint.paragraph_index}`;
    setDismissedHints(prev => new Set([...prev, key]));
    setVisibleHints(prev => prev.filter(h => h.paragraph_index !== hint.paragraph_index));
  };

  // إخفاء الكل
  const dismissAll = () => {
    hints.forEach(hint => {
      const key = `${currentPage}-${hint.paragraph_index}`;
      setDismissedHints(prev => new Set([...prev, key]));
    });
    setVisibleHints([]);
    setShowHints(false);
  };

  // اختيار الأيقونة حسب نوع التلميح
  const getHintIcon = (hintType: string) => {
    switch (hintType) {
      case 'popular_pause':
        return <Users className="h-4 w-4" />;
      case 'common_confusion':
        return <BookOpen className="h-4 w-4" />;
      case 'important_content':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  // لون التلميح حسب النوع
  const getHintStyle = (hintType: string) => {
    switch (hintType) {
      case 'popular_pause':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'common_confusion':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
      case 'important_content':
        return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  if (!showHints || visibleHints.length === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 ${className}`}
        dir="rtl"
      >
        <div className="space-y-2">
          {visibleHints.slice(0, 2).map((hint, index) => (
            <motion.div
              key={`${currentPage}-${hint.paragraph_index}-${index}`}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.15,
                ease: 'easeOut' 
              }}
              className={`
                relative p-3 rounded-xl border shadow-lg backdrop-blur-sm
                ${getHintStyle(hint.hint_type)}
              `}
            >
              {/* زر الإغلاق */}
              <button
                onClick={() => dismissHint(hint)}
                className="absolute top-2 left-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="إغلاق التلميح"
              >
                <X className="h-3 w-3 opacity-60" />
              </button>
              
              <div className="flex items-start gap-3 pr-1">
                <div className="flex-shrink-0 mt-0.5 opacity-70">
                  {getHintIcon(hint.hint_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-cairo leading-relaxed">
                    {hint.hint_message}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* زر إخفاء الكل إذا كان هناك أكثر من تلميح */}
          {visibleHints.length > 1 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={dismissAll}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              إخفاء جميع التلميحات
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReaderHints;
