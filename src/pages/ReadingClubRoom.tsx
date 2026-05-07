import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, Send, ArrowRight, Crown, 
  MessageCircle, BookMarked, LogOut, MoreVertical, Trash2
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClubDetails } from '@/hooks/useReadingClubs';
import { useReadingClubs } from '@/hooks/useReadingClubs';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ReadingClubRoom: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { club, members, messages, loading, isMember, sendMessage } = useClubDetails(clubId || '');
  const { joinClub, leaveClub, deleteClub } = useReadingClubs();
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(newMessage.trim());
    if (success) {
      setNewMessage('');
    }
    setSending(false);
  };

  const handleJoin = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    await joinClub(clubId || '');
  };

  const handleLeave = async () => {
    await leaveClub(clubId || '');
    navigate('/reading-clubs');
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا النادي؟ سيتم حذف جميع الرسائل والأعضاء.')) return;
    const success = await deleteClub(clubId || '');
    if (success) navigate('/reading-clubs');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">النادي غير موجود</h2>
          <Button onClick={() => navigate('/reading-clubs')}>
            العودة للنوادي
          </Button>
        </div>
      </div>
    );
  }

  const adminMember = members.find(m => m.role === 'admin');

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container mx-auto px-4 py-4">
        {/* الرجوع */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/reading-clubs')}
          className="mb-4"
        >
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للنوادي
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* القسم الرئيسي - الدردشة */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              {/* رأس النادي */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={club.book_cover_url || '/placeholder.svg'}
                      alt={club.book_title}
                      className="w-12 h-16 object-cover rounded shadow"
                    />
                    <div>
                      <h1 className="font-bold text-lg">{club.name}</h1>
                      <p className="text-sm text-muted-foreground">
                        📖 {club.book_title}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/book/${club.book_slug || club.book_id}`}>
                          <BookMarked className="h-4 w-4 ml-2" />
                          عرض الكتاب
                        </Link>
                      </DropdownMenuItem>
                      {isMember && (
                        <DropdownMenuItem 
                          onClick={handleLeave}
                          className="text-destructive"
                        >
                          <LogOut className="h-4 w-4 ml-2" />
                          مغادرة النادي
                        </DropdownMenuItem>
                      )}
                      {user?.id === club.created_by && (
                        <DropdownMenuItem 
                          onClick={handleDelete}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف النادي
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* منطقة الرسائل */}
              {isMember ? (
                <>
                  <ScrollArea className="h-[400px] p-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center">
                        <div>
                          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">
                            لا توجد رسائل بعد<br />
                            كن أول من يبدأ النقاش! 💬
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {messages.map((msg, index) => {
                            const isOwnMessage = msg.user_id === user?.id;
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                              >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={msg.avatar_url || ''} />
                                  <AvatarFallback className="text-xs">
                                    {msg.username?.[0] || '؟'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`max-w-[70%] ${isOwnMessage ? 'text-left' : 'text-right'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium">{msg.username}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(msg.created_at), { 
                                        addSuffix: true, 
                                        locale: ar 
                                      })}
                                    </span>
                                  </div>
                                  <div className={`p-3 rounded-2xl ${
                                    isOwnMessage 
                                      ? 'bg-primary text-primary-foreground rounded-tl-sm' 
                                      : 'bg-muted rounded-tr-sm'
                                  }`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    {msg.page_reference && (
                                      <Badge variant="secondary" className="mt-2 text-xs">
                                        📄 صفحة {msg.page_reference}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* إدخال الرسالة */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t bg-muted/30">
                    <div className="flex gap-2">
                      <Input
                        placeholder="اكتب رسالتك..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        size="icon"
                        disabled={!newMessage.trim() || sending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">انضم للنادي للمشاركة</h3>
                  <p className="text-muted-foreground mb-4">
                    انضم لهذا النادي لتتمكن من قراءة الرسائل والمشاركة في النقاش
                  </p>
                  <Button onClick={handleJoin} size="lg">
                    انضم الآن
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* الشريط الجانبي */}
          <div className="space-y-4">
            {/* معلومات الكتاب */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                الكتاب
              </h3>
              <Link to={`/book/${club.book_slug || club.book_id}`} className="block hover:opacity-80 transition">
                <img
                  src={club.book_cover_url || '/placeholder.svg'}
                  alt={club.book_title}
                  className="w-full h-48 object-cover rounded-lg shadow mb-3"
                />
                <h4 className="font-medium line-clamp-2">{club.book_title}</h4>
                <p className="text-sm text-muted-foreground">{club.book_author}</p>
              </Link>
            </Card>

            {/* الأعضاء */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                الأعضاء ({members.length}/{club.max_members})
              </h3>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {member.username?.[0] || '؟'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1 flex items-center gap-1">
                          {member.username}
                          {member.role === 'admin' && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          صفحة {member.current_page}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* وصف النادي */}
            {club.description && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">عن النادي</h3>
                <p className="text-sm text-muted-foreground">{club.description}</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ReadingClubRoom;
