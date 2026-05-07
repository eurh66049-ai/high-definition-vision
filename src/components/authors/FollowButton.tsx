import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, LoaderCircle } from 'lucide-react';

interface FollowButtonProps {
  isFollowing: boolean;
  loading: boolean;
  onClick: () => void;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  isFollowing,
  loading,
  onClick,
  className = ""
}) => {
  const handleClick = () => {
    console.log('FollowButton clicked! isFollowing:', isFollowing, 'loading:', loading);
    onClick();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="secondary"
      size="sm"
      className={`gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600 whitespace-nowrap ${className}`}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">إلغاء المتابعة</span>
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">متابعة</span>
        </>
      )}
    </Button>
  );
};