import React from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsDown } from 'lucide-react';
import { useBookDislikes } from '@/hooks/useBookDislikes';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface BookDislikeButtonProps {
  bookId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'lg';
  showCount?: boolean;
  className?: string;
  onDislikeChange?: (isDisliked: boolean) => void;
}

export const BookDislikeButton: React.FC<BookDislikeButtonProps> = ({
  bookId,
  variant = 'outline',
  size = 'sm',
  showCount = true,
  className = '',
  onDislikeChange
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { dislikesCount, isDisliked, loading, toggleDislike } = useBookDislikes(bookId);

  const handleDislike = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة عدم الإعجاب');
      const redirectPath = location.pathname + location.search;
      localStorage.setItem('auth_redirect_path', redirectPath);
      navigate('/auth');
      return;
    }

    try {
      const newDislikeStatus = await toggleDislike();
      
      if (newDislikeStatus) {
        toast.success('تم إضافة عدم الإعجاب 👎');
      } else {
        toast.success('تم إزالة عدم الإعجاب');
      }

      onDislikeChange?.(newDislikeStatus);
    } catch (error) {
      console.error('خطأ في تبديل عدم الإعجاب:', error);
      toast.error('حدث خطأ، حاول مرة أخرى');
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

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDislike}
      disabled={loading}
      className={`
        ${buttonSizeClasses[size]} 
        ${className}
        ${isDisliked ? 'text-red-500 border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700 bg-red-50 dark:bg-red-950/30' : ''}
        transition-all duration-200 hover:scale-105
      `}
    >
      <ThumbsDown 
        className={`
          ${iconSizeClasses[size]} 
          ${showCount ? 'ml-2' : ''} 
          transition-all duration-200
          ${isDisliked ? 'fill-current text-red-500' : ''}
        `} 
      />
      {showCount && (
        <span className={isDisliked ? 'text-red-500 font-medium' : ''}>
          {loading ? '...' : dislikesCount}
        </span>
      )}
    </Button>
  );
};
