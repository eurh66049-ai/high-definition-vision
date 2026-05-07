import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Bot } from 'lucide-react';
import { Conversation } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { optimizeImageUrl } from '@/utils/imageProxy';
import { motion } from 'framer-motion';
import { KOTOBI_AI_USER_ID, KOTOBI_AI_AVATAR_URL } from '@/utils/kotobiAi';

interface ConversationsListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  loading,
  selectedId,
  onSelect
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return null;
    return optimizeImageUrl(avatarUrl, 'avatar');
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ar });
    } catch {
      return '';
    }
  };

  const allConversations = React.useMemo(() => {
    const botConv = conversations.filter(c => c.other_user?.id === KOTOBI_AI_USER_ID);
    const regularConvs = conversations.filter(c => c.other_user?.id !== KOTOBI_AI_USER_ID);
    return [...botConv, ...regularConvs];
  }, [conversations]);

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (allConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <MessageCircle className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <h3 className="font-semibold text-foreground mb-1 text-sm">لا توجد محادثات</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          ابدأ محادثة جديدة من صفحة المستخدم
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-0.5">
        {allConversations.map((conv, index) => {
          const isBotConv = conv.other_user?.id === KOTOBI_AI_USER_ID;
          const isSelected = selectedId === conv.id;
          const hasUnread = conv.unread_count > 0;
          
          return (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-right group relative",
                isSelected
                  ? "bg-primary/10 shadow-sm"
                  : "hover:bg-muted/60",
                isBotConv && !isSelected && "bg-gradient-to-l from-blue-500/[0.04] to-transparent"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="conversation-indicator"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-primary rounded-l-full"
                />
              )}

              <div className="relative flex-shrink-0">
                <Avatar className={cn(
                  "h-11 w-11 transition-all",
                  isSelected && "ring-2 ring-primary/30",
                  isBotConv && "ring-2 ring-blue-500/20"
                )}>
                  <AvatarImage
                      src={isBotConv ? KOTOBI_AI_AVATAR_URL : (getAvatarUrl(conv.other_user?.avatar_url) || '')}
                    alt={conv.other_user?.username || ''}
                  />
                  <AvatarFallback className={cn(
                    isBotConv
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                      : "bg-primary/10 text-primary text-sm font-medium"
                  )}>
                    {isBotConv ? <Bot className="h-5 w-5" /> : getInitials(conv.other_user?.username || '؟')}
                  </AvatarFallback>
                </Avatar>
                {isBotConv && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-card shadow-sm" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn(
                      "text-sm truncate",
                      hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/85"
                    )}>
                      {conv.other_user?.username || 'مستخدم'}
                    </span>
                    {isBotConv && (
                      <span className="text-[9px] bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-bold flex-shrink-0">
                        AI
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] flex-shrink-0 mr-1",
                    hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    {conv.last_message ? (
                      <p className={cn(
                        "text-xs truncate leading-relaxed",
                        hasUnread 
                          ? "text-foreground/90 font-medium" 
                          : "text-muted-foreground"
                      )}>
                        {conv.last_message.content}
                      </p>
                    ) : isBotConv ? (
                      <p className="text-xs text-muted-foreground truncate">
                        اسألني أي شيء عن منصة كتبي! 🤖
                      </p>
                    ) : null}
                  </div>
                  
                  {hasUnread && !isBotConv && (
                    <span className="bg-primary text-primary-foreground text-[10px] rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-bold flex-shrink-0 mr-1 shadow-sm">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </ScrollArea>
  );
};
