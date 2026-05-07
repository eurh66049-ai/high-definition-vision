import React from 'react';
import { motion } from 'framer-motion';

interface GrowingSeedIndicatorProps {
  likesCount: number;
  className?: string;
}

const GrowingSeedIndicator: React.FC<GrowingSeedIndicatorProps> = ({ 
  likesCount, 
  className = "flex items-center gap-2" 
}) => {
  // تحديد مرحلة النمو
  const getGrowthStage = (likes: number) => {
    if (likes >= 50) return 'tree';
    if (likes >= 20) return 'plant';
    if (likes >= 5) return 'sprout';
    return 'seed';
  };

  const stage = getGrowthStage(likesCount);
  
  // تحديد الرمز التعبيري والرسالة
  const getStageDisplay = () => {
    switch (stage) {
      case 'seed':
        return { emoji: '🌰', color: 'text-amber-600', message: '' };
      case 'sprout':
        return { emoji: '🌱', color: 'text-green-500', message: 'ينمو التقييم!' };
      case 'plant':
        return { emoji: '🌿', color: 'text-green-600', message: 'نبتة صحية!' };
      case 'tree':
        return { emoji: '🌳', color: 'text-green-700', message: 'هذا التقييم أثمر أفكاراً!' };
      default:
        return { emoji: '🌰', color: 'text-amber-600', message: '' };
    }
  };

  const { emoji, color, message } = getStageDisplay();

  return (
    <motion.div 
      className={className}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* البذرة/النبتة/الشجرة */}
      <motion.span 
        className={`text-2xl ${color}`}
        key={stage}
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 20 
        }}
      >
        {emoji}
      </motion.span>
      
      {/* عداد الإعجابات */}
      <span className="text-sm text-muted-foreground font-medium">
        {likesCount}
      </span>
      
      {/* رسالة خاصة للمراحل المتقدمة */}
      {message && likesCount >= 5 && (
        <motion.span 
          className={`text-xs font-semibold ${color} bg-background/80 px-2 py-1 rounded-full border border-current/20`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.span>
      )}
      
    </motion.div>
  );
};

export default GrowingSeedIndicator;