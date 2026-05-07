import React from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';
import { useBookLikes } from '@/hooks/useBookLikes';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface BookLikeButtonProps {
  bookId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'lg';
  showCount?: boolean;
  className?: string;
  onLikeChange?: (isLiked: boolean) => void;
}

export const BookLikeButton: React.FC<BookLikeButtonProps> = ({
  bookId,
  variant = 'outline',
  size = 'sm',
  showCount = true,
  className = '',
  onLikeChange
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { likesCount, isLiked, loading, toggleLike } = useBookLikes(bookId);

  const handleLike = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة الإعجاب');
      const redirectPath = location.pathname + location.search;
      localStorage.setItem('auth_redirect_path', redirectPath);
      navigate('/auth');
      return;
    }

    try {
      const newLikeStatus = await toggleLike();
      
      if (newLikeStatus) {
        toast.success('تم إضافة الإعجاب 👍');
      } else {
        toast.success('تم إزالة الإعجاب');
      }

      onLikeChange?.(newLikeStatus);
    } catch (error) {
      console.error('خطأ في تبديل الإعجاب:', error);
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
      onClick={handleLike}
      disabled={loading}
      className={`
        ${buttonSizeClasses[size]} 
        ${className}
        ${isLiked ? 'text-green-500 border-green-200 hover:border-green-300 dark:border-green-800 dark:hover:border-green-700' : ''}
        transition-all duration-200 hover:scale-105
      `}
    >
      <ThumbsUp 
        className={`
          ${iconSizeClasses[size]} 
          ${showCount ? 'ml-2' : ''} 
          transition-all duration-200
          ${isLiked ? 'fill-current text-green-500' : ''}
        `} 
      />
      {showCount && (
        <span className={isLiked ? 'text-green-500 font-medium' : ''}>
          {loading ? '...' : likesCount}
        </span>
      )}
    </Button>
  );
};