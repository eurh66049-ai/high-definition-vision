import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Clock, Eye, Trash2, RefreshCw, BookOpen, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotification } from '@/context/NotificationContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  book_title?: string;
  book_author?: string;
  book_category?: string;
  book_submission_id?: string;
  target_url?: string;
  read: boolean;
  created_at: string;
}

interface NotificationsDropdownProps {
  children: React.ReactNode;
}

const EID_NOTIFICATION_ID = 'eid-al-fitr-2026';
const EID_NOTIFICATION_READ_KEY = 'eid_notification_read_2026';
const EID_NOTIFICATION_DELETED_KEY = 'eid_notification_deleted_2026';

const getEidNotification = (): Notification => ({
  id: EID_NOTIFICATION_ID,
  title: 'عيد فطر مبارك! 🎉🌙',
  message: 'كل عام وأنتم بخير بمناسبة عيد الفطر المبارك 🌟\nتقبّل الله صيامكم وطاعاتكم، وأعاده عليكم بالخير واليمن والبركات 🤲',
  type: 'success',
  book_title: 'فريق كتبي 📚',
  read: localStorage.getItem(EID_NOTIFICATION_READ_KEY) === 'true',
  created_at: '2026-03-30T09:00:00.000Z',
});

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOpen, setIsOpen, shouldRefresh } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isOpen) fetchNotifications();
  }, [user, isOpen]);

  useEffect(() => {
    if (user && shouldRefresh) fetchNotifications();
  }, [user, shouldRefresh]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب الإشعارات:', error);
      } else {
        const cleanedNotifications = data?.map(notification => ({
          ...notification,
          book_title: notification.book_title || 'كتاب محذوف',
          book_author: notification.book_author || 'مؤلف غير معروف',
          book_category: notification.book_category || 'تصنيف غير محدد'
        })) || [];

        const shouldShowEidNotification = localStorage.getItem(EID_NOTIFICATION_DELETED_KEY) !== 'true';
        const finalNotifications = shouldShowEidNotification
          ? [getEidNotification(), ...cleanedNotifications]
          : cleanedNotifications;

        setNotifications(finalNotifications);
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    if (notificationId === EID_NOTIFICATION_ID) {
      localStorage.setItem(EID_NOTIFICATION_READ_KEY, 'true');
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة الإشعار:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    if (notificationId === EID_NOTIFICATION_ID) {
      localStorage.setItem(EID_NOTIFICATION_DELETED_KEY, 'true');
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast({
        title: 'تم حذف الإشعار',
        description: 'تم حذف إشعار العيد بنجاح'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('delete_user_notification', {
          p_notification_id: notificationId,
          p_user_id: user.id
        });

      if (error) {
        console.error('خطأ في حذف الإشعار:', error);
      } else if (data) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        toast({
          title: 'تم حذف الإشعار',
          description: 'تم حذف الإشعار بنجاح'
        });
      }
    } catch (error) {
      console.error('خطأ غير متوقع في حذف الإشعار:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!user || notifications.length === 0) return;

    const hasEidNotification = notifications.some(notification => notification.id === EID_NOTIFICATION_ID);

    try {
      const { data, error } = await supabase
        .rpc('delete_all_user_notifications', { p_user_id: user.id });

      if (error) {
        console.error('خطأ في حذف جميع الإشعارات:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء حذف الإشعارات',
          variant: 'destructive'
        });
      } else {
        if (hasEidNotification) {
          localStorage.setItem(EID_NOTIFICATION_DELETED_KEY, 'true');
        }
        setNotifications([]);
        toast({
          title: 'تم حذف جميع الإشعارات',
          description: `تم حذف ${Number(data || 0) + (hasEidNotification ? 1 : 0)} إشعار بنجاح`
        });
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'new_book': return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'review_like': return <Heart className="h-4 w-4 text-red-500" />;
      case 'ai_suggestion': return <Bell className="h-4 w-4 text-emerald-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.target_url) {
      setIsOpen(false);
      navigate(notification.target_url);
    }
  };

  const getNotificationBadge = (type: string, title: string) => {
    if (title.includes('أهلاً بك في') || title.includes('كتبي')) {
      return (
        <img
          src="/lovable-uploads/5882b036-f2e2-4fec-bc07-9ee97960056a.png"
          alt="كتبي"
          className="w-10 h-10 object-contain"
        />
      );
    }
    if (type === 'new_book') {
      return (
        <Badge variant="default" className="bg-purple-500 hover:bg-purple-600 text-white border-purple-600 text-xs">كتاب جديد</Badge>
      );
    }
    if (type === 'review_like') {
      return (
        <Badge variant="default" className="bg-red-400 hover:bg-red-500 text-white border-red-500 text-xs">إعجاب</Badge>
      );
    }
    if (type === 'success' && (title.includes('تحديث') || title.includes('صورة') || title.includes('اسم'))) {
      return (
        <Badge
          variant="default"
          className="bg-blue-500 hover:bg-blue-600 text-white border-blue-600 text-xs"
        >
          تحديث
        </Badge>
      );
    }
    if (type === 'success' && title.includes('تمت الموافقة')) {
      return (
        <Badge
          variant="default"
          className="bg-green-500 hover:bg-green-600 text-white border-green-600 text-xs"
        >
          موافقة
        </Badge>
      );
    }
    if (type === 'ai_suggestion') {
      return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 text-xs">🤖 ذكي</Badge>;
    }
    switch (type) {
      case 'error':
        return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white border-red-600 text-xs">رفض</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-xs">تحذير</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">كتبي</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} د`;
    if (diffInHours < 24) return `منذ ${diffInHours} س`;
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          {children}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[calc(100vw-1rem)] max-w-96 p-0 rounded-2xl bg-card/90 backdrop-blur-md border border-border shadow-lg"
        align="end"
        sideOffset={8}
        collisionPadding={8}
      >
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                الإشعارات
                {notifications.length > 0 && <Badge variant="secondary" className="text-xs">{notifications.length}</Badge>}
              </CardTitle>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteAllNotifications}
                    className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                    title="حذف جميع الإشعارات"
                  >
                    <Trash2 className="h-3 w-3 ml-1" />
                    حذف الكل
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchNotifications}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {loading ? (
                <div className="text-center p-4 text-sm text-muted-foreground">جاري تحميل الإشعارات...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center p-4 text-sm text-muted-foreground">لا توجد إشعارات</div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 border-b border-border hover:bg-muted/50 transition-colors text-right ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      } ${notification.target_url ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                            {getNotificationBadge(notification.type, notification.title)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</span>
                            <div className="flex items-center gap-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                  className="h-6 w-6 p-0"
                                  title="وضع علامة مقروء"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                title="حذف الإشعار"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {notification.book_title && notification.book_title !== 'كتاب محذوف' && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">📚 {notification.book_title}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsDropdown;
