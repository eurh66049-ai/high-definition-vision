import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, Trash2, Edit, X, Check, Reply } from 'lucide-react';
import { useQuoteReplies, QuoteReply } from '@/hooks/useQuoteReplies';
import { useAuth } from '@/context/AuthContext';
import { optimizeImageUrl } from '@/utils/imageProxy';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { UnifiedProfileLink } from '@/components/profile/UnifiedProfileLink';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface QuoteRepliesProps {
  quoteId: string;
}

export const QuoteReplies: React.FC<QuoteRepliesProps> = ({ quoteId }) => {
  const { user } = useAuth();
  const { replies, loading, repliesCount, fetchReplies, addReply, deleteReply, updateReply } = useQuoteReplies(quoteId);
  const [isOpen, setIsOpen] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState('');

  const handleToggle = () => {
    if (!isOpen) fetchReplies();
    setIsOpen(!isOpen);
  };

  const handleSend = async () => {
    if (!newReply.trim()) return;
    setSending(true);
    const success = await addReply(newReply.trim(), replyingToId || undefined);
    if (success) {
      setNewReply('');
      setReplyingToId(null);
      setReplyingToName('');
    }
    setSending(false);
  };

  const handleEdit = async (replyId: string) => {
    if (!editText.trim()) return;
    const success = await updateReply(replyId, editText.trim());
    if (success) setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteReply(deletingId);
    setDeletingId(null);
  };

  const handleReplyTo = (reply: QuoteReply) => {
    setReplyingToId(reply.id);
    setReplyingToName(reply.username || 'مستخدم');
  };

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-full px-4 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm">
          {repliesCount > 0 ? `مناقشة (${repliesCount})` : 'مناقشة'}
        </span>
      </Button>

      {isOpen && (
        <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">جارٍ التحميل...</div>
          ) : (
            <>
              {replies.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-3">لا توجد ردود بعد، كن أول من يناقش هذا الاقتباس!</p>
              )}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {replies.map((reply) => {
                  const parentReply = reply.parent_reply_id ? replies.find(r => r.id === reply.parent_reply_id) : null;
                  return (
                    <div key={reply.id} className={`flex gap-3 ${reply.parent_reply_id ? 'mr-8 border-r-2 border-primary/20 pr-3' : ''}`}>
                      <UnifiedProfileLink userId={reply.user_id} username={reply.username}>
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage
                            src={reply.avatar_url ? optimizeImageUrl(reply.avatar_url, 'avatar') : ''}
                            alt={reply.username}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {reply.username?.[0] || 'م'}
                          </AvatarFallback>
                        </Avatar>
                      </UnifiedProfileLink>
                      <div className="flex-1 min-w-0">
                        <div className="bg-muted/50 rounded-xl p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <UnifiedProfileLink userId={reply.user_id} username={reply.username}>
                              <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors">{reply.username}</span>
                            </UnifiedProfileLink>
                            
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ar })}
                            </span>
                          </div>
                          {parentReply && (
                            <div className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1 mb-2 border-r-2 border-primary/30">
                              رداً على <span className="font-medium text-primary/80">{parentReply.username}</span>
                            </div>
                          )}
                          {editingId === reply.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[60px] text-sm resize-none"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 px-2">
                                  <X className="h-3 w-3" />
                                </Button>
                                <Button size="sm" onClick={() => handleEdit(reply.id)} className="h-7 px-2">
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{reply.reply_text}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 mr-2">
                          {user && (
                            <button
                              onClick={() => handleReplyTo(reply)}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <Reply className="h-3 w-3" />
                              رد
                            </button>
                          )}
                          {user?.id === reply.user_id && editingId !== reply.id && (
                            <>
                              <button
                                onClick={() => { setEditingId(reply.id); setEditText(reply.reply_text); }}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                تعديل
                              </button>
                              <button
                                onClick={() => setDeletingId(reply.id)}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {user ? (
            <div className="space-y-2">
              {replyingToId && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-1.5">
                  <Reply className="h-3 w-3" />
                  <span>رداً على {replyingToName}</span>
                  <button onClick={() => { setReplyingToId(null); setReplyingToName(''); }} className="mr-auto">
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <Textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="اكتب ردك..."
                  className="min-h-[50px] max-h-[120px] text-sm resize-none flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !newReply.trim()}
                  className="h-10 w-10 p-0 rounded-full flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-2">
              سجل الدخول للمشاركة في المناقشة
            </p>
          )}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرد</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الرد؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
