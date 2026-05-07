import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock, Check, X, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { useConversations } from '@/hooks/useConversations';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AI_BOT_USER_ID = "00000000-0000-0000-0000-00000000a1a1";

interface ExternalRequestStatus {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_sender: boolean;
}

interface MessageButtonProps {
  targetUserId: string;
  targetUsername: string;
  allowMessaging?: boolean;
  className?: string;
  // دعم تمرير حالة الطلب من الخارج (من useUserInteractionStatus)
  externalRequestStatus?: ExternalRequestStatus | null;
  externalLoading?: boolean;
}

export const MessageButton: React.FC<MessageButtonProps> = ({
  targetUserId,
  targetUsername,
  allowMessaging = true,
  className,
  externalRequestStatus,
  externalLoading = false
}) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getRequestStatus, sendRequest, respondToRequest, cancelRequest, loading, initialLoading } = useMessageRequests();
  const { getConversationWithUser } = useConversations();
  const [actionLoading, setActionLoading] = useState(false);

  // انتظر حتى ينتهي تحميل Auth
  if (authLoading) return null;

  // لا تظهر الزر لنفس المستخدم
  if (!user || user.id === targetUserId) return null;

  // لا تظهر إذا كان المستخدم لا يسمح بالمراسلة
  if (!allowMessaging) return null;

  // بوت Kotobi AI: زر مراسلة مباشرة بدون طلب
  const isAiBot = targetUserId === AI_BOT_USER_ID;

  const openConversationDirect = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_user1_id: user.id,
        p_user2_id: targetUserId,
      });
      if (error) {
        console.error('Error getting/creating conversation:', error);
        return;
      }
      if (data) {
        navigate(`/messages?chat=${data}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (isAiBot) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={openConversationDirect}
        disabled={actionLoading}
        className={cn("gap-2", className)}
      >
        {actionLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        مراسلة AI Kotobi
      </Button>
    );
  }

  // استخدام الحالة الخارجية إذا توفرت، وإلا استخدم الـ hook الداخلي
  const useExternalStatus = externalRequestStatus !== undefined;
  const isLoading = useExternalStatus ? externalLoading : initialLoading;

  // إخفاء الزر أثناء التحميل الأولي لتجنب الوميض
  if (isLoading) return null;

  // تحديد حالة الطلب
  const internalRequestStatus = getRequestStatus(targetUserId);
  
  // تحويل الحالة الخارجية لنفس الشكل
  const requestStatus = useExternalStatus && externalRequestStatus
    ? {
        type: externalRequestStatus.is_sender ? 'sent' as const : 'received' as const,
        request: {
          id: externalRequestStatus.id,
          sender_id: externalRequestStatus.sender_id,
          receiver_id: externalRequestStatus.receiver_id,
          status: externalRequestStatus.status,
          message: null,
          created_at: '',
          responded_at: null
        }
      }
    : internalRequestStatus;
    
  const conversation = getConversationWithUser(targetUserId);

  const openConversation = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      // هذا RPC مُعرّف ومُطبّق في قاعدة البيانات ويضمن جلب/إنشاء محادثة واحدة فقط
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_user1_id: user.id,
        p_user2_id: targetUserId,
      });

      if (error) {
        console.error('Error getting/creating conversation:', error);
        return;
      }

      if (data) {
        navigate(`/messages?chat=${data}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // إذا كانت هناك محادثة نشطة، انتقل إليها
  if (conversation) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/messages?chat=${conversation.id}`)}
        className={cn("gap-2", className)}
      >
        <MessageCircle className="h-4 w-4" />
        محادثة
      </Button>
    );
  }

  // إذا كان الطلب مقبولاً (سواءً أرسلته أو استقبلته) يجب عرض زر محادثة وليس “إرسال طلب”
  if (requestStatus?.request.status === 'accepted') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={openConversation}
        disabled={actionLoading}
        className={cn("gap-2", className)}
      >
        {actionLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        محادثة
      </Button>
    );
  }

  // إذا أرسل طلبًا وينتظر الرد
  if (requestStatus?.type === 'sent') {
    const status = requestStatus.request.status;
    
    if (status === 'pending') {
      const handleCancelRequest = async () => {
        setActionLoading(true);
        await cancelRequest(requestStatus.request.id);
        setActionLoading(false);
      };

      return (
        <div className={cn("flex gap-2", className)}>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-2 cursor-not-allowed"
          >
            <Clock className="h-4 w-4" />
            بانتظار الرد
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelRequest}
            disabled={actionLoading}
            className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            إلغاء
          </Button>
        </div>
      );
    }

    if (status === 'rejected') {
      return (
        <Button
          variant="outline"
          size="sm"
          disabled
          className={cn("gap-2 text-muted-foreground", className)}
        >
          <X className="h-4 w-4" />
          تم رفض الطلب
        </Button>
      );
    }
  }

  // إذا استقبل طلبًا من هذا المستخدم
  if (requestStatus?.type === 'received' && requestStatus.request.status === 'pending') {
    const handleAccept = async () => {
      setActionLoading(true);
      await respondToRequest(requestStatus.request.id, true);
      setActionLoading(false);
    };

    const handleReject = async () => {
      setActionLoading(true);
      await respondToRequest(requestStatus.request.id, false);
      setActionLoading(false);
    };

    return (
      <div className={cn("flex gap-2", className)}>
        <Button
          variant="default"
          size="sm"
          onClick={handleAccept}
          disabled={actionLoading}
          className="gap-1"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          قبول
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReject}
          disabled={actionLoading}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          رفض
        </Button>
      </div>
    );
  }

  // زر إرسال طلب مباشرة
  const handleSendRequest = async () => {
    setActionLoading(true);
    await sendRequest(targetUserId);
    setActionLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendRequest}
      disabled={loading || actionLoading}
      className={cn("gap-2", className)}
    >
      {actionLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      إرسال طلب المراسلة
    </Button>
  );
};
