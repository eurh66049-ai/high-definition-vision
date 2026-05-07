import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowRight, Loader2, Check, CheckCheck, Bot, Smile, Mic, Square } from 'lucide-react';
import { useMessages, Message } from '@/hooks/useMessages';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { optimizeImageUrl } from '@/utils/imageProxy';
import { motion, AnimatePresence } from 'framer-motion';
import { KOTOBI_AI_USER_ID, KOTOBI_AI_AVATAR_URL } from '@/utils/kotobiAi';
import { KotobiAiCards, parseKotobiCards } from '@/components/chat/KotobiAiCards';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { toast } from 'sonner';
import { uploadVoiceMessage } from '@/utils/uploadVoiceMessage';
import VoiceMessageBubble from './VoiceMessageBubble';

interface ChatWindowProps {
  conversationId: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url: string | null;
    last_seen?: string | null;
  };
  onBack?: () => void;
  showBackButton?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  otherUser,
  onBack,
  showBackButton = false
}) => {
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage, refetch } = useMessages(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  // ملاحظة: تم حذف ميزة قراءة الردود صوتياً نهائياً.
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);
  // Reset scroll flag when conversation changes
  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [conversationId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    // Radix ScrollArea wraps content in [data-radix-scroll-area-viewport]
    const root = scrollRef.current;
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    } else if (root) {
      root.scrollTop = root.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  const isAiBot = otherUser.id === KOTOBI_AI_USER_ID;

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return null;
    return optimizeImageUrl(avatarUrl, 'avatar');
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return format(date, 'HH:mm', { locale: ar });
    if (isYesterday(date)) return `أمس ${format(date, 'HH:mm', { locale: ar })}`;
    return format(date, 'dd/MM HH:mm', { locale: ar });
  };

  const isOtherUserOnline = useCallback(() => {
    if (isAiBot) return false;
    if (!otherUser.last_seen) return false;
    const lastSeen = new Date(otherUser.last_seen);
    const now = new Date();
    return (now.getTime() - lastSeen.getTime()) / 1000 < 30;
  }, [otherUser.last_seen, isAiBot]);

  const getActivityStatus = useCallback(() => {
    if (isAiBot) return 'مساعد ذكي';
    if (isOtherUserOnline()) return 'متصل الآن';
    if (!otherUser.last_seen) return 'غير متصل';
    return `آخر ظهور ${formatDistanceToNow(new Date(otherUser.last_seen), { addSuffix: true, locale: ar })}`;
  }, [otherUser.last_seen, isOtherUserOnline, isAiBot]);

  const navigateToUserProfile = useCallback(async () => {
    if (!otherUser.id) return;
    if (isAiBot) {
      window.location.href = `/user/${otherUser.username || otherUser.id}`;
      return;
    }
    const { data: author } = await supabase
      .from('authors')
      .select('slug')
      .eq('user_id', otherUser.id)
      .single();
    if (author?.slug) {
      window.location.href = `/author/${author.slug}`;
    } else {
      window.location.href = `/user/${otherUser.username}`;
    }
  }, [otherUser.id, otherUser.username, isAiBot]);

  const handleSend = async (overrideText?: string) => {
    const messageToSend = (overrideText ?? newMessage).trim();
    if (!messageToSend || sending || aiThinking) return;
    if (!overrideText) setNewMessage('');
    const sent = await sendMessage(messageToSend);
    if (sent && isAiBot) {
      setAiThinking(true);
      try {
        const { error } = await supabaseFunctions.functions.invoke('ai-kotobi-chat', {
          body: { conversationId, userMessage: messageToSend }
        });
        if (error) console.error('AI response error:', error);
        await refetch({ force: true, silent: true });
      } catch (err) {
        console.error('AI chat error:', err);
      } finally {
        setAiThinking(false);
      }
    }
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // مسجّل الصوت — يرسل رسالة صوتية حقيقية (مثل واتساب)
  const voiceRecorder = useVoiceRecorder({
    rawAudioMode: true,
    onAudioReady: async ({ blob, mimeType, durationMs }) => {
      if (!user?.id) return;
      try {
        setUploadingVoice(true);
        const { url } = await uploadVoiceMessage(blob, user.id);
        const sent = await sendMessage('🎤 رسالة صوتية', {
          message_type: 'audio',
          audio_url: url,
          audio_mime_type: mimeType,
          audio_duration_ms: durationMs,
        });
        if (sent && isAiBot) {
          setAiThinking(true);
          try {
            const { error } = await supabaseFunctions.functions.invoke('ai-kotobi-chat', {
              body: { conversationId, audioUrl: url, audioMimeType: mimeType, replyAsVoice: true },
            });
            if (error) console.error('AI voice reply error:', error);
            await refetch({ force: true, silent: true });
          } finally {
            setAiThinking(false);
          }
        }
      } catch (err: any) {
        console.error('upload voice error', err);
        toast.error('تعذّر إرسال الرسالة الصوتية');
      } finally {
        setUploadingVoice(false);
      }
    },
    onError: (msg) => {
      setVoiceError(msg);
      toast.error(msg);
      setTimeout(() => setVoiceError(null), 4000);
    },
  });

  const handleMicClick = () => {
    if (sending || aiThinking) return;
    setVoiceError(null);
    if (voiceRecorder.state === 'recording') {
      voiceRecorder.stop();
    } else if (voiceRecorder.state === 'idle') {
      voiceRecorder.start();
    }
  };



  useEffect(() => {
    if (loading || messages.length === 0) return;

    if (!didInitialScrollRef.current) {
      // Jump instantly to last message on first load of this conversation
      didInitialScrollRef.current = true;
      // double rAF to ensure DOM is painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom('auto'));
      });
    } else {
      scrollToBottom('smooth');
    }
  }, [messages, aiThinking, loading, scrollToBottom]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border/50 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
              <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-36" : "w-44")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Group messages by date
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'اليوم';
    if (isYesterday(date)) return 'أمس';
    return format(date, 'dd MMMM yyyy', { locale: ar });
  };

  let lastDateLabel = '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-lg flex items-center gap-3 sticky top-0 z-10 flex-shrink-0">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full h-9 w-9 hover:bg-muted/80"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        
        <div 
          className={cn(
            "relative flex-shrink-0",
            !isAiBot && "cursor-pointer"
          )}
          onClick={navigateToUserProfile}
        >
          <Avatar className={cn(
            "h-10 w-10 transition-all",
            !isAiBot && "hover:ring-2 hover:ring-primary/40"
          )}>
            <AvatarImage src={isAiBot ? KOTOBI_AI_AVATAR_URL : (getAvatarUrl(otherUser.avatar_url) || '')} alt={otherUser.username} />
            <AvatarFallback className={cn(
              isAiBot
                ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                : "bg-primary/10 text-primary text-sm font-medium"
            )}>
              {isAiBot ? <Bot className="h-5 w-5" /> : getInitials(otherUser.username)}
            </AvatarFallback>
          </Avatar>
          {(isAiBot || isOtherUserOnline()) && (
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
              "bg-green-500 shadow-sm"
            )} />
          )}
        </div>
        
        <div 
          className={cn("min-w-0", !isAiBot && "cursor-pointer hover:opacity-80 transition-opacity")}
          onClick={navigateToUserProfile}
        >
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-foreground text-sm truncate">{otherUser.username}</h3>
            {isAiBot && (
              <span className="text-[9px] bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-bold">
                AI
              </span>
            )}
          </div>
          <p className={cn(
            "text-[11px] leading-none mt-0.5",
            isOtherUserOnline() ? "text-green-500 font-medium" : "text-muted-foreground"
          )}>
            {getActivityStatus()}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3 min-h-0 overflow-y-auto" ref={scrollRef as any}>
        <div className="space-y-1">
          {messages.length === 0 && isAiBot ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 flex items-center justify-center mx-auto mb-3">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-foreground">مرحباً! أنا AI KOTOBI 🤖</p>
              <p className="text-xs text-muted-foreground mt-1">مساعدك الذكي في منصة كتبي. اسألني أي شيء!</p>
            </motion.div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Smile className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">ابدأ المحادثة الآن! 👋</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const currentDateLabel = getDateLabel(message.created_at);
              const showDateSeparator = currentDateLabel !== lastDateLabel;
              lastDateLabel = currentDateLabel;
              
              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center py-3">
                      <span className="text-[10px] text-muted-foreground bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full font-medium">
                        {currentDateLabel}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex items-end gap-1.5 py-0.5",
                      isOwn ? "justify-start" : "justify-end"
                    )}
                  >
                    {!isOwn && (
                      <Avatar className="h-6 w-6 flex-shrink-0 order-2 mb-4">
                        <AvatarImage src={isAiBot ? KOTOBI_AI_AVATAR_URL : (getAvatarUrl(otherUser.avatar_url) || '')} alt={otherUser.username} />
                        <AvatarFallback className={cn(
                          isAiBot
                            ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                            : "bg-primary/10 text-primary text-[10px]"
                        )}>
                          {isAiBot ? <Bot className="h-3 w-3" /> : getInitials(otherUser.username)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-bl-md"
                          : isAiBot
                            ? "bg-gradient-to-br from-blue-500/10 to-purple-500/5 text-foreground rounded-br-md order-1 border border-blue-500/15"
                            : "bg-muted/80 text-foreground rounded-br-md order-1"
                      )}
                    >
                      {(() => {
                        const isAudioMsg = message.message_type === 'audio' && message.audio_url;
                        if (isAudioMsg) {
                          return (
                            <VoiceMessageBubble
                              audioUrl={message.audio_url as string}
                              durationMs={message.audio_duration_ms || null}
                              isOwn={isOwn}
                            />
                          );
                        }
                        const { cleanText, cards } = isAiBot && !isOwn
                          ? parseKotobiCards(message.content)
                          : { cleanText: message.content, cards: null };
                        return (
                          <>
                            {cleanText && (
                              <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">
                                {cleanText}
                              </p>
                            )}
                            {cards && <KotobiAiCards cards={cards} />}
                          </>
                        );
                      })()}
                      <div className={cn(
                        "flex items-center gap-1 mt-1",
                        isOwn ? "justify-start" : "justify-end"
                      )}>
                        <span className={cn(
                          "text-[10px]",
                          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          {formatMessageTime(message.created_at)}
                        </span>
                        {isOwn && (
                          <span className="flex items-center mr-0.5">
                            {message.is_read ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                            ) : isOtherUserOnline() ? (
                              <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/50" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {isOwn && <div className="w-6 flex-shrink-0" />}
                  </motion.div>
                </React.Fragment>
              );
            })
          )}
          
          {/* AI thinking indicator */}
          <AnimatePresence>
            {aiThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-end gap-1.5 justify-end py-0.5"
              >
                <Avatar className="h-6 w-6 flex-shrink-0 order-2 mb-4">
                  <AvatarImage src={isAiBot ? KOTOBI_AI_AVATAR_URL : (getAvatarUrl(otherUser.avatar_url) || '')} alt={otherUser.username} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 border border-blue-500/15 rounded-2xl rounded-br-md px-4 py-2.5 order-1 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11px] text-blue-500 font-medium">يفكر...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border/50 bg-card/80 backdrop-blur-lg sticky bottom-0 z-10 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {isAiBot && voiceError && (
          <div className="mb-2 text-xs text-destructive text-right">{voiceError}</div>
        )}
        {isAiBot && voiceRecorder.state === 'recording' && (
          <div className="mb-2 text-xs text-right text-destructive flex items-center justify-end gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
            جاري التسجيل... اضغط الزر مجدداً للإرسال
          </div>
        )}
        {isAiBot && voiceRecorder.state === 'processing' && (
          <div className="mb-2 text-xs text-right text-muted-foreground flex items-center justify-end gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            جاري معالجة الصوت...
          </div>
        )}
        <div className="flex gap-2 items-center">
          {/* زر تسجيل الرسالة الصوتية لكل المحادثات */}
          <Button
            onClick={handleMicClick}
            disabled={sending || aiThinking || voiceRecorder.state === 'processing' || uploadingVoice}
            size="icon"
            variant={voiceRecorder.state === 'recording' ? 'destructive' : 'ghost'}
            className={cn(
              "rounded-full h-10 w-10 transition-all shrink-0",
              voiceRecorder.state === 'idle' && "text-muted-foreground hover:bg-muted/60"
            )}
            title={voiceRecorder.state === 'recording' ? 'إيقاف وإرسال' : 'تسجيل رسالة صوتية'}
            aria-label={voiceRecorder.state === 'recording' ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
          >
            {voiceRecorder.state === 'processing' || uploadingVoice ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : voiceRecorder.state === 'recording' ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isAiBot && voiceRecorder.state === 'recording'
                ? '... جاري التسجيل'
                : isAiBot
                ? 'اسأل AI KOTOBI أو تحدث...'
                : 'اكتب رسالة...'
            }
            className="flex-1 rounded-full h-10 text-sm border-border/50 bg-muted/40 focus:bg-background transition-colors px-4"
            dir="rtl"
            disabled={sending || aiThinking || (isAiBot && voiceRecorder.state !== 'idle')}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!newMessage.trim() || sending || aiThinking || (isAiBot && voiceRecorder.state !== 'idle')}
            size="icon"
            className={cn(
              "rounded-full h-10 w-10 transition-all shadow-sm",
              newMessage.trim() 
                ? "bg-primary hover:bg-primary/90 scale-100" 
                : "bg-muted text-muted-foreground scale-95"
            )}
          >
            {sending || aiThinking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
