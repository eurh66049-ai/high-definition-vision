import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import BookImageLoader from './BookImageLoader';
import { FollowButton } from '@/components/authors/FollowButton';
import { useAuthorFollow } from '@/hooks/useAuthorFollow';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import VerifiedIcon from '@/components/icons/VerifiedIcon';
import ResponsiveDescription from '@/components/ui/ResponsiveDescription';
import { useOptimizedAuthorData } from '@/hooks/useOptimizedAuthorData';
import { Skeleton } from '@/components/ui/skeleton';


interface AuthorInfoCardProps {
  authorName: string;
  authorBio?: string;
  authorImageUrl?: string;
}

const AuthorInfoCard: React.FC<AuthorInfoCardProps> = ({
  authorName,
  authorBio,
  authorImageUrl,
}) => {
  const { user } = useAuth();
  
  // استخدام الhook المحسن لجلب بيانات المؤلف
  const {
    authorId: realAuthorId,
    avatarUrl: displayImageUrl,
    bio: displayBio,
    isVerified,
    followersCount,
    loading: authorDataLoading
  } = useOptimizedAuthorData(authorName);

  // إعداد hook للمتابعة باستخدام المعرف الحقيقي
  const { isFollowing, loading: followLoading, initialLoading: followInitialLoading, toggleFollow, shouldShowFollowButton } = useAuthorFollow(realAuthorId, authorName, user?.id);

  return (
    <Card className="bg-card border border-border text-foreground">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-bold font-amiri text-center relative">
          عن المؤلف
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-red-500 mt-2"></div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="text-center">
          {authorDataLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-20 h-20 rounded-full mx-auto" />
              <Skeleton className="h-6 w-32 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            </div>
          ) : (
            <>
              {/* عرض صورة المؤلف دائماً - إما الصورة الحقيقية أو الافتراضية */}
              <div className="w-20 h-20 mx-auto mb-4">
                <AspectRatio ratio={1} className="bg-muted rounded-full overflow-hidden">
                  <BookImageLoader 
                    src={displayImageUrl}
                    fallbackSrc="/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png"
                    alt={`صورة المؤلف ${authorName}`}
                    className="w-full h-full object-cover"
                  />
                </AspectRatio>
              </div>
              
              <h3 className="text-lg font-bold font-cairo mb-3 text-foreground flex items-center justify-center gap-2">
                {authorName}
                {isVerified && (
                  <VerifiedIcon className="w-5 h-5" size={20} />
                )}
              </h3>
              
              {/* أزرار التفاعل وعدد المتابعين */}
              {!followInitialLoading && shouldShowFollowButton && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <FollowButton
                    isFollowing={isFollowing}
                    loading={followLoading}
                    onClick={toggleFollow}
                  />
                  {followersCount > 0 && (
                    <span className="text-sm text-muted-foreground font-cairo">
                      {followersCount} متابع
                    </span>
                  )}
                </div>
              )}
              
              {/* عرض عدد المتابعين للمؤلفين عند عرض كتبهم لمستخدمين آخرين */}
              {!shouldShowFollowButton && followersCount > 0 && (
                <div className="mb-4 text-center">
                  <span className="text-sm text-muted-foreground font-cairo">
                    {followersCount} متابع
                  </span>
                </div>
              )}
              
              {displayBio && displayBio.trim() && (
                <ResponsiveDescription 
                  text={displayBio} 
                  lineClamp={10}
                  className="text-foreground text-base leading-relaxed font-cairo whitespace-pre-wrap"
                  showMoreLabel="عرض المزيد"
                  showLessLabel="عرض أقل"
                />
              )}
              
              {(!displayBio || !displayBio.trim()) && !authorDataLoading && (
                <p className="text-muted-foreground text-sm italic font-cairo">
                  لا توجد معلومات إضافية عن هذا المؤلف
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthorInfoCard;