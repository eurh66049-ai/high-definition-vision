import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStories, GroupedStories } from '@/hooks/useStories';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import StoryViewer from './StoryViewer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const StoriesBar: React.FC = () => {
  const { user } = useAuth();
  const { stories, loading, uploading, hasMyStory, addStory } = useStories();
  const [selectedGroup, setSelectedGroup] = useState<GroupedStories | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب صورة الملف الشخصي
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', user.id)
        .single();
      if (data) {
        setMyAvatarUrl(data.avatar_url);
        setMyUsername(data.username || '');
      }
    };
    fetchProfile();
  }, [user]);

  const handleStoryClick = (group: GroupedStories, index: number = 0) => {
    setSelectedGroup(group);
    setSelectedStoryIndex(index);
  };

  // عند الضغط على الدائرة: إذا كانت لديك قصة اعرضها، وإلا افتح منتقي الملفات
  const handleMyStoryClick = () => {
    if (uploading) return;
    if (hasMyStory) {
      const myGroup = stories.find(g => g.user.id === user?.id);
      if (myGroup) {
        handleStoryClick(myGroup);
        return;
      }
    }
    fileInputRef.current?.click();
  };

  // فتح منتقي الملفات مباشرة عبر زر +
  const handleAddStoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uploading) return;
    fileInputRef.current?.click();
  };

  // معالجة اختيار الملف ورفعه مباشرة
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('يرجى اختيار صورة أو فيديو');
      return;
    }

    // التحقق من حجم الملف (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 50 ميجابايت');
      return;
    }

    // رفع مباشر
    await addStory(file);
    
    // إعادة تعيين input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNextGroup = () => {
    const currentIndex = stories.findIndex(g => g.user.id === selectedGroup?.user.id);
    if (currentIndex < stories.length - 1) {
      setSelectedGroup(stories[currentIndex + 1]);
      setSelectedStoryIndex(0);
    } else {
      setSelectedGroup(null);
    }
  };

  const handlePreviousGroup = () => {
    const currentIndex = stories.findIndex(g => g.user.id === selectedGroup?.user.id);
    if (currentIndex > 0) {
      setSelectedGroup(stories[currentIndex - 1]);
      setSelectedStoryIndex(stories[currentIndex - 1].stories.length - 1);
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 px-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="w-[72px] h-[72px] rounded-full" />
                <Skeleton className="w-12 h-3" />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  // لا تعرض شيئاً إذا لم تكن هناك قصص ولم يكن المستخدم مسجلاً
  if (stories.length === 0 && !user) {
    return null;
  }

  return (
    <>
      {/* input مخفي لاختيار الملف */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="py-4 bg-background/50 backdrop-blur-sm border-b border-border/50">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 px-4">
            {/* دائرة قصتي - تعرض صورة الملف الشخصي */}
            {user && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-1 min-w-[76px]"
              >
                <div className="relative">
                  {/* الدائرة الرئيسية - قابلة للضغط */}
                  <button
                    onClick={handleMyStoryClick}
                    disabled={uploading}
                    className="block"
                  >
                    <div className={cn(
                      "w-[72px] h-[72px] rounded-full p-[3px]",
                      hasMyStory
                        ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                        : "bg-muted-foreground/30",
                      uploading && "opacity-50"
                    )}>
                      <div className="w-full h-full rounded-full bg-background p-[2px]">
                        <Avatar className="w-full h-full">
                          <AvatarImage
                            src={myAvatarUrl || undefined}
                            alt={myUsername}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-muted text-xl font-bold">
                            {myUsername?.charAt(0)?.toUpperCase() || '؟'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </button>

                  {/* زر + لإضافة قصة جديدة */}
                  <button
                    onClick={handleAddStoryClick}
                    disabled={uploading}
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background",
                      "bg-primary text-primary-foreground",
                      uploading && "opacity-50"
                    )}
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <span className="text-xs font-medium text-foreground truncate max-w-[76px]">
                  {uploading ? 'جاري الرفع...' : 'قصتك'}
                </span>
              </motion.div>
            )}

            {/* قصص المستخدمين */}
            {stories.map((group, index) => (
              <motion.button
                key={group.user.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleStoryClick(group)}
                className="flex flex-col items-center gap-1 min-w-[76px]"
              >
                {/* الحلقة المتدرجة مثل Instagram */}
                <div className={cn(
                  "w-[72px] h-[72px] rounded-full p-[3px]",
                  group.has_unviewed
                    ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                    : "bg-muted-foreground/30"
                )}>
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <Avatar className="w-full h-full">
                      <AvatarImage 
                        src={group.user.avatar_url || undefined} 
                        alt={group.user.username}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-xl font-bold">
                        {group.user.username?.charAt(0)?.toUpperCase() || '؟'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className={cn(
                  "text-xs truncate max-w-[76px]",
                  group.has_unviewed ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                )}>
                  {group.user.id === user?.id ? 'قصتك' : group.user.username}
                </span>
              </motion.button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* عارض القصص - يُعرض عبر Portal لتجنب مشاكل backdrop-blur و transform */}
      {selectedGroup && createPortal(
        <StoryViewer
          group={selectedGroup}
          initialIndex={selectedStoryIndex}
          onClose={() => setSelectedGroup(null)}
          onNextGroup={handleNextGroup}
          onPreviousGroup={handlePreviousGroup}
          hasNextGroup={stories.findIndex(g => g.user.id === selectedGroup.user.id) < stories.length - 1}
          hasPreviousGroup={stories.findIndex(g => g.user.id === selectedGroup.user.id) > 0}
        />,
        document.body
      )}
    </>
  );
};

export default StoriesBar;

