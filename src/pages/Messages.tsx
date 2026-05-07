import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEOHead } from '@/components/seo/SEOHead';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Inbox, Check, X, Loader2, Sparkles, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { ConversationsList } from '@/components/messaging/ConversationsList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { optimizeImageUrl } from '@/utils/imageProxy';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  
  const { conversations, loading: convsLoading, totalUnread } = useConversations();
  const { pendingReceived, respondToRequest, loading: requestsLoading } = useMessageRequests();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState('conversations');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'الرسائل - كتبي';
  }, []);

  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === chatId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return null;
    return optimizeImageUrl(avatarUrl, 'avatar');
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    setRespondingTo(requestId);
    await respondToRequest(requestId, accept);
    setRespondingTo(null);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    window.history.replaceState(null, '', `/messages?chat=${conv.id}`);
  };

  const handleBack = () => {
    setSelectedConversation(null);
    window.history.replaceState(null, '', '/messages');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <MessageCircle className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Mobile: full-screen chat
  if (isMobile && selectedConversation) {
    return (
      <>
        <SEOHead
          title={`محادثة مع ${selectedConversation.other_user?.username || 'مستخدم'} - كتبي`}
          description="محادثة خاصة على منصة كتبي."
          noindex={true}
        />
        <div className="h-[100dvh] flex flex-col bg-background pb-16">
          <ChatWindow
            conversationId={selectedConversation.id}
            otherUser={selectedConversation.other_user || { id: '', username: 'مستخدم', avatar_url: null }}
            onBack={handleBack}
            showBackButton
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="الرسائل - منصة كتبي"
        description="رسائلك ومحادثاتك الخاصة على منصة كتبي. تواصل مع القراء والمؤلفين الآخرين."
        noindex={true}
      />

      <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
        <Navbar />

        <main className="flex-grow py-4 md:py-6">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">الرسائل</h1>
                <p className="text-xs text-muted-foreground">تواصل مع القراء والمؤلفين</p>
              </div>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="mr-auto rounded-full px-2.5 py-0.5 text-xs font-bold animate-pulse">
                  {totalUnread} جديدة
                </Badge>
              )}
            </motion.div>

            {/* Main container */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-lg"
            >
              <div className="flex h-[calc(100vh-280px)] md:h-[calc(100vh-220px)] min-h-[450px]">
                
                {/* Sidebar */}
                <div className="w-full md:w-[340px] border-l border-border/50 flex flex-col bg-card/50">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <div className="p-3 border-b border-border/50">
                      <TabsList className="w-full bg-muted/50 rounded-xl p-1 h-auto">
                        <TabsTrigger 
                          value="conversations" 
                          className="flex-1 gap-1.5 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          المحادثات
                          {totalUnread > 0 && (
                            <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-bold">
                              {totalUnread}
                            </span>
                          )}
                        </TabsTrigger>
                        <TabsTrigger 
                          value="requests" 
                          className="flex-1 gap-1.5 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                          <Inbox className="h-3.5 w-3.5" />
                          الطلبات
                          {pendingReceived.length > 0 && (
                            <span className="bg-primary/20 text-primary text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-bold">
                              {pendingReceived.length}
                            </span>
                          )}
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="conversations" className="flex-1 m-0 overflow-hidden">
                      <ConversationsList
                        conversations={conversations}
                        loading={convsLoading}
                        selectedId={selectedConversation?.id || null}
                        onSelect={handleSelectConversation}
                      />
                    </TabsContent>

                    <TabsContent value="requests" className="flex-1 m-0 overflow-auto">
                      {requestsLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : pendingReceived.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                            <Inbox className="h-7 w-7 text-muted-foreground/60" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-1 text-sm">لا توجد طلبات</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            ستظهر هنا طلبات المراسلة الجديدة
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 space-y-2">
                          <AnimatePresence>
                            {pendingReceived.map((request, index) => (
                              <motion.div
                                key={request.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-3 rounded-xl bg-background/80 border border-border/50 hover:border-primary/20 transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                                    <AvatarImage
                                      src={getAvatarUrl(request.sender_profile?.avatar_url) || ''}
                                      alt={request.sender_profile?.username || ''}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {getInitials(request.sender_profile?.username || '؟')}
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-foreground text-sm">
                                        {request.sender_profile?.username || 'مستخدم'}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ar })}
                                      </span>
                                    </div>
                                    
                                    {request.message && (
                                      <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                                        {request.message}
                                      </p>
                                    )}

                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleRespond(request.id, true)}
                                        disabled={respondingTo === request.id}
                                        className="gap-1 flex-1 h-8 rounded-lg text-xs font-medium"
                                      >
                                        {respondingTo === request.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" />
                                        )}
                                        قبول
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRespond(request.id, false)}
                                        disabled={respondingTo === request.id}
                                        className="gap-1 flex-1 h-8 rounded-lg text-xs font-medium"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        رفض
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Chat area (desktop) */}
                <div className="hidden md:flex flex-1 flex-col">
                  {selectedConversation ? (
                    <ChatWindow
                      conversationId={selectedConversation.id}
                      otherUser={selectedConversation.other_user || { id: '', username: 'مستخدم', avatar_url: null }}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="relative mb-6">
                        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <MessageCircle className="h-9 w-9 text-primary/50" />
                        </div>
                        <Sparkles className="h-5 w-5 text-primary/40 absolute -top-1 -right-1 animate-pulse" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1.5">
                        اختر محادثة
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                        اختر محادثة من القائمة لبدء التواصل مع القراء والمؤلفين
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Messages;
