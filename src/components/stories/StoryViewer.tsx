import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Pause, Play, Volume2, VolumeX, Heart, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupedStories, StoryWithUser, StoryViewer as StoryViewerType, useStories } from '@/hooks/useStories';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import StoryViewersSheet from './StoryViewersSheet';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface StoryViewerProps {
  group: GroupedStories;
  initialIndex?: number;
  onClose: () => void;
  onNextGroup: () => void;
  onPreviousGroup: () => void;
  hasNextGroup: boolean;
  hasPreviousGroup: boolean;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  group,
  initialIndex = 0,
  onClose,
  onNextGroup,
  onPreviousGroup,
  hasNextGroup,
  hasPreviousGroup,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { recordView, deleteStory, getStoryViewers, toggleLike, isStoryLiked, getStoryLikesCount } = useStories();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerType[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [heartAnimation, setHeartAnimation] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const currentStory = group.stories[currentIndex];
  const isMyStory = currentStory?.user_id === user?.id;
  const duration = (currentStory?.duration || 5) * 1000;

  // تحميل حالة الإعجاب وعدد الإعجابات
  useEffect(() => {
    if (currentStory) {
      isStoryLiked(currentStory.id).then(setLiked);
      getStoryLikesCount(currentStory.id).then(setLikesCount);
    }
  }, [currentStory?.id]);

  // تسجيل المشاهدة
  useEffect(() => {
    if (currentStory && !isMyStory) {
      recordView(currentStory.id);
    }
  }, [currentStory?.id, isMyStory, recordView]);

  // تحميل المشاهدين تلقائياً لصاحب القصة
  useEffect(() => {
    if (currentStory && isMyStory) {
      getStoryViewers(currentStory.id).then(setViewers);
    }
  }, [currentStory?.id, isMyStory]);

  // إدارة التقدم والانتقال التلقائي
  const startProgress = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    setProgress(0);
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < group.stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else if (hasNextGroup) {
            onNextGroup();
          } else {
            onClose();
          }
          return 0;
        }
        return prev + increment;
      });
    }, interval);
  }, [duration, currentIndex, group.stories.length, hasNextGroup, onNextGroup, onClose]);

  useEffect(() => {
    if (!isPaused) {
      startProgress();
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPaused, currentIndex, startProgress]);

  // التحكم في الفيديو
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, isMuted, currentIndex]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else if (hasPreviousGroup) {
      onPreviousGroup();
    }
  };

  const handleNext = () => {
    if (currentIndex < group.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else if (hasNextGroup) {
      onNextGroup();
    } else {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!currentStory) return;
    const success = await deleteStory(currentStory.id);
    if (success) {
      if (group.stories.length === 1) {
        onClose();
      } else {
        handleNext();
      }
    }
  };

  const handleShowViewers = async () => {
    if (!currentStory) return;
    setLoadingViewers(true);
    setShowViewers(true);
    const data = await getStoryViewers(currentStory.id);
    setViewers(data);
    setLoadingViewers(false);
  };

  const handleLike = async () => {
    if (!currentStory || !user) return;
    const result = await toggleLike(currentStory.id);
    if (result !== null) {
      setLiked(result);
      setLikesCount(prev => result ? prev + 1 : Math.max(0, prev - 1));
      if (result) {
        setHeartAnimation(true);
        setTimeout(() => setHeartAnimation(false), 1000);
      }
    }
  };

  const handleDoubleTap = (() => {
    let lastTap = 0;
    return (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double tap → like
        e.stopPropagation();
        if (!isMyStory) {
          handleLike();
        }
        lastTap = 0;
        return true;
      }
      lastTap = now;
      return false;
    };
  })();

  const handleTap = (e: React.MouseEvent) => {
    // تجاهل النقرة إذا كانت double tap
    if (handleDoubleTap(e)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    setTimeout(() => {
      if (x < width / 3) {
        handlePrevious();
      } else if (x > (width * 2) / 3) {
        handleNext();
      } else {
        setIsPaused(!isPaused);
      }
    }, 300);
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-black flex items-center justify-center overflow-hidden"
        onClick={handleTap}
        style={{ touchAction: 'none' }}
      >
        {/* شريط التقدم */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          {group.stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-white rounded-full"
                style={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* رأس القصة */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 bg-gradient-to-b from-black/60 to-transparent pb-4" style={{ paddingTop: 'calc(max(0.5rem, env(safe-area-inset-top)) + 20px)' }}>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={group.user.avatar_url || undefined} />
              <AvatarFallback>{group.user.username?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm">
                {isMyStory ? 'قصتك' : group.user.username}
              </span>
              <span className="text-white/70 text-xs">
                {formatDistanceToNow(new Date(currentStory.created_at), {
                  addSuffix: true,
                  locale: ar,
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {currentStory.media_type === 'video' && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-9 w-9"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(!isPaused);
              }}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* محتوى القصة - عرض بحجم طبيعي مع خلفية سوداء */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
          {currentStory.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              className="max-w-full max-h-full object-contain"
              autoPlay
              muted={isMuted}
              playsInline
              loop={false}
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="max-w-full max-h-full object-contain"
              loading="eager"
              decoding="sync"
            />
          )}
        </div>

        {/* أنيميشن القلب عند Double Tap */}
        <AnimatePresence>
          {heartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-red-500 fill-red-500" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* منطقة الضغط على الغلاف للانتقال إلى صفحة الكتاب */}
        {currentStory.book_slug && (
          <button
            type="button"
            aria-label="فتح صفحة الكتاب"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              navigate(`/book/${currentStory.book_slug}`);
            }}
            className="absolute z-20 cursor-pointer bg-transparent border-0 p-0 m-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-2xl"
            style={{
              left: '24%',
              right: '24%',
              top: '14%',
              height: '46%',
            }}
          />
        )}

        {/* شريط التحكم السفلي لصاحب القصة */}
        {isMyStory && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-12" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {/* اسم الموقع */}
            <p className="text-white/40 text-xs font-medium text-center mb-2">📚 kotobi.xyz</p>
            {/* عدد المشاهدات */}
            <div className="flex items-center justify-center gap-6 px-4 pb-3">
              <Button
                variant="ghost"
                size="lg"
                className="text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full px-6 h-12"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowViewers();
                }}
              >
                <Eye className="w-5 h-5 ml-2" />
                <span className="font-bold text-base">{currentStory.views_count} مشاهدة</span>
              </Button>

              {likesCount > 0 && (
                <div className="flex items-center gap-1.5 text-white/80">
                  <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                  <span className="font-bold text-base">{likesCount}</span>
                </div>
              )}

              <Button
                variant="ghost"
                size="lg"
                className="text-red-400 bg-white/15 hover:bg-red-500/30 backdrop-blur-sm rounded-full px-6 h-12"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <Trash2 className="w-5 h-5 ml-2" />
                <span className="font-bold text-base">حذف</span>
              </Button>
            </div>
          </div>
        )}

        {/* زر الإعجاب للمشاهدين (غير صاحب القصة) */}
        {!isMyStory && user && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/50 to-transparent pt-8" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <p className="text-white/40 text-xs font-medium text-center mb-2">📚 kotobi.xyz</p>
            <div className="flex items-center justify-center gap-4 px-4 pb-3">
              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "rounded-full h-14 w-14 p-0 backdrop-blur-sm",
                  liked 
                    ? "text-red-500 bg-red-500/20 hover:bg-red-500/30" 
                    : "text-white bg-white/15 hover:bg-white/25"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
              >
                <Heart className={cn("w-7 h-7", liked && "fill-red-500")} />
              </Button>
              {likesCount > 0 && (
                <span className="text-white/80 font-bold text-sm">{likesCount}</span>
              )}
            </div>
          </div>
        )}

        {/* أزرار التنقل */}
        {(hasPreviousGroup || currentIndex > 0) && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
        {(hasNextGroup || currentIndex < group.stories.length - 1) && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* قائمة المشاهدين */}
        <StoryViewersSheet
          open={showViewers}
          onClose={() => setShowViewers(false)}
          viewers={viewers}
          loading={loadingViewers}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryViewer;
