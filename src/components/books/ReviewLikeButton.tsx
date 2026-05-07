import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReviewLikes } from '@/hooks/useReviewLikes';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import GrowingSeedIndicator from './GrowingSeedIndicator';

interface ReviewLikeButtonProps {
  reviewId: string;
  className?: string;
}

const ReviewLikeButton: React.FC<ReviewLikeButtonProps> = ({ 
  reviewId, 
  className = "flex items-center gap-3" 
}) => {
  const { user } = useAuth();
  const { likesCount, isLiked, loading, toggleLike } = useReviewLikes(reviewId);

  const handleLikeClick = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      await toggleLike();
      
      // رسالة تشجيعية عند الوصول لمراحل معينة
      if (!isLiked) { // إذا كان المستخدم يضيف إعجاب جديد
        const newCount = likesCount + 1;
        if (newCount === 5) {
          toast.success('🌱 رائع! التقييم بدأ ينمو!');
        } else if (newCount === 20) {
          toast.success('🌿 ممتاز! أصبح نبتة صحية!');
        } else if (newCount === 50) {
          toast.success('🌳 مذهل! هذا التقييم أثمر أفكاراً!');
        }
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الإعجاب');
    }
  };

  return (
    <div className={className}>
      {/* مؤشر البذرة النامية */}
      <GrowingSeedIndicator likesCount={likesCount} className="relative" />
      
      {/* زر الإعجاب */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLikeClick}
        disabled={loading || !user}
        className={`flex items-center gap-1 transition-all duration-200 ${
          isLiked 
            ? 'text-red-500 hover:text-red-600' 
            : 'text-muted-foreground hover:text-red-500'
        }`}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Heart 
            className={`h-4 w-4 transition-all ${
              isLiked ? 'fill-current' : ''
            }`}
          />
        </motion.div>
        <span className="text-xs">
          {isLiked ? 'أعجبني' : 'إعجاب'}
        </span>
      </Button>
    </div>
  );
};

export default ReviewLikeButton;