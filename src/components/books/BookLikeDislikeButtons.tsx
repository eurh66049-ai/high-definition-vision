import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Heart, Sparkles } from 'lucide-react';
import { useBookLikes } from '@/hooks/useBookLikes';
import { useBookDislikes } from '@/hooks/useBookDislikes';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface BookLikeDislikeButtonsProps {
  bookId: string;
  size?: 'sm' | 'lg';
  showCount?: boolean;
  className?: string;
  likeClassName?: string;
  dislikeClassName?: string;
  layout?: 'row' | 'column';
}

// مكون لجسيمات اللايك المتطايرة
const LikeParticles: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (!isActive) return null;
  
  return (
    <AnimatePresence>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 1, 
            scale: 0,
            x: 0, 
            y: 0 
          }}
          animate={{ 
            opacity: 0, 
            scale: 1,
            x: (Math.random() - 0.5) * 60,
            y: (Math.random() - 0.5) * 60 - 20
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.6, 
            delay: i * 0.05,
            ease: "easeOut"
          }}
          className="absolute pointer-events-none"
        >
          {i % 2 === 0 ? (
            <Heart className="w-3 h-3 text-green-500 fill-green-500" />
          ) : (
            <Sparkles className="w-3 h-3 text-yellow-400" />
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

// مكون لجسيمات الديزلايك
const DislikeParticles: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (!isActive) return null;
  
  return (
    <AnimatePresence>
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 1, 
            scale: 0,
            y: 0 
          }}
          animate={{ 
            opacity: 0, 
            scale: 1.2,
            y: 30 + i * 5
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: i * 0.08,
            ease: "easeOut"
          }}
          className="absolute pointer-events-none"
        >
          <div className="w-2 h-2 rounded-full bg-red-400/60" />
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export const BookLikeDislikeButtons: React.FC<BookLikeDislikeButtonsProps> = ({
  bookId,
  size = 'sm',
  showCount = true,
  className = '',
  likeClassName = '',
  dislikeClassName = '',
  layout = 'row'
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { likesCount, isLiked, loading: likeLoading, toggleLike, refetch: refetchLikes } = useBookLikes(bookId);
  const { dislikesCount, isDisliked, loading: dislikeLoading, toggleDislike, refetch: refetchDislikes } = useBookDislikes(bookId);
  
  const [showLikeParticles, setShowLikeParticles] = useState(false);
  const [showDislikeParticles, setShowDislikeParticles] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [dislikeAnimating, setDislikeAnimating] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة الإعجاب');
      const redirectPath = location.pathname + location.search;
      localStorage.setItem('auth_redirect_path', redirectPath);
      navigate('/auth');
      return;
    }

    try {
      setLikeAnimating(true);
      const newLikeStatus = await toggleLike();
      
      if (newLikeStatus) {
        setShowLikeParticles(true);
        setTimeout(() => setShowLikeParticles(false), 700);
        toast.success('تم إضافة الإعجاب 👍');
      } else {
        toast.success('تم إزالة الإعجاب');
      }

      await refetchDislikes();
      setTimeout(() => setLikeAnimating(false), 300);
    } catch (error) {
      console.error('خطأ في تبديل الإعجاب:', error);
      toast.error('حدث خطأ، حاول مرة أخرى');
      setLikeAnimating(false);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة عدم الإعجاب');
      const redirectPath = location.pathname + location.search;
      localStorage.setItem('auth_redirect_path', redirectPath);
      navigate('/auth');
      return;
    }

    try {
      setDislikeAnimating(true);
      const newDislikeStatus = await toggleDislike();
      
      if (newDislikeStatus) {
        setShowDislikeParticles(true);
        setTimeout(() => setShowDislikeParticles(false), 600);
        toast.success('تم إضافة عدم الإعجاب 👎');
      } else {
        toast.success('تم إزالة عدم الإعجاب');
      }

      await refetchLikes();
      setTimeout(() => setDislikeAnimating(false), 300);
    } catch (error) {
      console.error('خطأ في تبديل عدم الإعجاب:', error);
      toast.error('حدث خطأ، حاول مرة أخرى');
      setDislikeAnimating(false);
    }
  };

  const buttonSizeClasses = {
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-6 text-lg'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const containerClass = layout === 'row' ? 'flex items-center gap-2' : 'flex flex-col gap-2';

  return (
    <div className={`${containerClass} ${className}`}>
      {/* زر الإعجاب مع إنميشن */}
      <motion.div className="relative flex items-center justify-center">
        <LikeParticles isActive={showLikeParticles} />
        
        <motion.div
          whileTap={{ scale: 0.9 }}
          animate={likeAnimating ? {
            scale: [1, 1.2, 1],
            rotate: [0, -10, 10, 0]
          } : {}}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="outline"
            size={size}
            onClick={handleLike}
            disabled={likeLoading || dislikeLoading}
            className={`
              ${buttonSizeClasses[size]} 
              ${likeClassName}
              relative overflow-visible
              ${isLiked 
                ? 'text-green-500 border-green-300 hover:border-green-400 bg-green-50 dark:bg-green-950/30 dark:border-green-700 dark:hover:border-green-600 shadow-[0_0_12px_rgba(34,197,94,0.3)]' 
                : 'hover:border-green-200 dark:hover:border-green-800'
              }
              transition-all duration-300 hover:scale-105
            `}
          >
            <motion.div
              animate={isLiked ? {
                scale: [1, 1.3, 1],
              } : {}}
              transition={{ duration: 0.3 }}
            >
              <ThumbsUp 
                className={`
                  ${iconSizeClasses[size]} 
                  ${showCount ? 'ml-2' : ''} 
                  transition-all duration-300
                  ${isLiked ? 'fill-current text-green-500' : ''}
                `} 
              />
            </motion.div>
            
            {showCount && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={likesCount}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`font-medium ${isLiked ? 'text-green-500' : ''}`}
                >
                  {likeLoading ? '...' : likesCount}
                </motion.span>
              </AnimatePresence>
            )}
          </Button>
        </motion.div>
      </motion.div>

      {/* زر عدم الإعجاب مع إنميشن */}
      <motion.div className="relative flex items-center justify-center">
        <DislikeParticles isActive={showDislikeParticles} />
        
        <motion.div
          whileTap={{ scale: 0.9 }}
          animate={dislikeAnimating ? {
            scale: [1, 0.8, 1.1, 1],
            y: [0, 3, -2, 0]
          } : {}}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="outline"
            size={size}
            onClick={handleDislike}
            disabled={likeLoading || dislikeLoading}
            className={`
              ${buttonSizeClasses[size]} 
              ${dislikeClassName}
              relative overflow-visible
              ${isDisliked 
                ? 'text-red-500 border-red-300 hover:border-red-400 bg-red-50 dark:bg-red-950/30 dark:border-red-700 dark:hover:border-red-600 shadow-[0_0_12px_rgba(239,68,68,0.3)]' 
                : 'hover:border-red-200 dark:hover:border-red-800'
              }
              transition-all duration-300 hover:scale-105
            `}
          >
            <motion.div
              animate={isDisliked ? {
                scale: [1, 1.3, 0.9, 1.1, 1],
                y: [0, 2, -1, 0],
              } : {}}
              transition={{ duration: 0.4 }}
            >
              <ThumbsDown 
                className={`
                  ${iconSizeClasses[size]} 
                  ${showCount ? 'ml-2' : ''} 
                  transition-all duration-300
                  ${isDisliked ? 'fill-current text-red-500' : ''}
                `} 
              />
            </motion.div>
            
            {showCount && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={dislikesCount}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`font-medium ${isDisliked ? 'text-red-500' : ''}`}
                >
                  {dislikeLoading ? '...' : dislikesCount}
                </motion.span>
              </AnimatePresence>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
