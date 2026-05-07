import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBookClubChat } from '@/hooks/useBookClubChat';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ReaderChatPanelProps {
  bookId: string | undefined;
  currentPage?: number;
}

const ReaderChatPanel: React.FC<ReaderChatPanelProps> = ({ bookId, currentPage }) => {
  const { user } = useAuth();
  const { hasActiveClub, club, members, messages, isMember, sendMessage, loading } = useBookClubChat(bookId);
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);

  // Track unread messages when panel is closed
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      lastSeenCount.current = messages.length;
    } else if (messages.length > lastSeenCount.current) {
      setUnreadCount(messages.length - lastSeenCount.current);
    }
  }, [messages.length, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!user || !hasActiveClub || loading || !isMember) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(newMessage.trim(), currentPage);
    if (success) setNewMessage('');
    setSending(false);
  };

  return (
    <>
      {/* Floating chat button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 left-4 z-[60]"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
            >
              <MessageCircle className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 z-[60] w-[320px] max-h-[70vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b bg-primary/5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <MessageCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{club?.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{members.length} عضو</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 p-3" style={{ maxHeight: 'calc(70vh - 120px)' }}>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>ابدأ النقاش أثناء القراءة! 💬</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isOwn = msg.user_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={msg.avatar_url || ''} />
                          <AvatarFallback className="text-[10px]">
                            {msg.username?.[0] || '؟'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[75%] ${isOwn ? 'text-left' : 'text-right'}`}>
                          <span className="text-[10px] text-muted-foreground block mb-0.5">
                            {msg.username}
                          </span>
                          <div className={`px-3 py-1.5 rounded-xl text-sm ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-tl-sm'
                              : 'bg-muted rounded-tr-sm'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            {msg.page_reference && (
                              <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                                📄 ص{msg.page_reference}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-0.5 block">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ar })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSend} className="p-2 border-t bg-muted/30 flex-shrink-0">
              <div className="flex gap-1.5">
                <Input
                  placeholder="اكتب تعليقك..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1 h-9 text-sm"
                />
                <Button type="submit" size="icon" className="h-9 w-9" disabled={!newMessage.trim() || sending}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              {currentPage && (
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  📄 أنت في الصفحة {currentPage}
                </p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ReaderChatPanel;
