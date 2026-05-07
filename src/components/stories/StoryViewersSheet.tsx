import React from 'react';
import { X, Eye, Loader2, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryViewer } from '@/hooks/useStories';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface StoryViewersSheetProps {
  open: boolean;
  onClose: () => void;
  viewers: StoryViewer[];
  loading: boolean;
}

const StoryViewersSheet: React.FC<StoryViewersSheetProps> = ({
  open,
  onClose,
  viewers,
  loading,
}) => {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[70vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-bold">
                المشاهدات ({viewers.length})
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(70vh-80px)]">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-book-primary" />
                </div>
              ) : viewers.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">لا توجد مشاهدات بعد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {viewers.map((viewer) => (
                    <Link
                      key={viewer.id}
                      to={`/user/${viewer.viewer_id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
                      onClick={onClose}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={viewer.viewer.avatar_url || undefined} />
                        <AvatarFallback className="bg-book-primary/10 text-book-primary">
                          {viewer.viewer.username?.charAt(0)?.toUpperCase() || '؟'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {viewer.viewer.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(viewer.viewed_at), {
                            addSuffix: true,
                            locale: ar,
                          })}
                        </p>
                      </div>
                      {viewer.has_liked && (
                        <Heart className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryViewersSheet;
