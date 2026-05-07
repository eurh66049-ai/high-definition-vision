import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, XCircle, Clock, Eye, RefreshCw, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  book_title?: string;
  book_author?: string;
  book_category?: string;
  book_submission_id?: string;
  read: boolean;
  created_at: string;
}

interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
  pending_books: number;
  approved_books: number;
  rejected_books: number;
}

const UserNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      initializeNotifications();
    }
  }, [user]);

  const initializeNotifications = async () => {
    setLoading(true);
    
    // تنظيف الإشعارات المكررة أولاً
    try {
      await supabase.rpc('clean_duplicate_notifications');
      console.log('تم تنظيف الإشعارات المكررة');
    } catch (error) {
      console.error('خطأ في تنظيف الإشعارات:', error);
    }
    
    // ثم جلب البيانات المحدثة
    await Promise.all([fetchNotifications(), fetchNotificationStats()]);
    setLoading(false);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      // جلب كل الإشعارات بدون limit
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب الإشعارات:', error);
        toast({
          title: "خطأ في جلب الإشعارات",
          description: "حدث خطأ أثناء جلب الإشعارات",
          variant: "destructive"
        });
      } else {
        console.log(`تم جلب ${data?.length || 0} إشعار`);
        
        const cleanedNotifications = data?.map(notification => ({
          ...notification,
          book_title: notification.book_title || 'كتاب محذوف',
          book_author: notification.book_author || 'مؤلف غير معروف',
          book_category: notification.book_category || 'تصنيف غير محدد'
        })) || [];
        
        setNotifications(cleanedNotifications);
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    }
  };

  const fetchNotificationStats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_notifications_stats', { p_user_id: user.id });

      if (!error && data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الإشعارات:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await initializeNotifications();
    setRefreshing(false);
    
    toast({
      title: "تم تحديث البيانات",
      description: "تم تحديث الإشعارات والإحصائيات بنجاح"
    });
  };

  const markAsRead = async (notificationId: string) => {
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
        
        // تحديث الإحصائيات محلياً
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            unread_notifications: Math.max(0, prev.unread_notifications - 1)
          } : null);
        }
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة الإشعار:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('delete_user_notification', { 
          p_notification_id: notificationId, 
          p_user_id: user.id 
        });

      if (error) {
        console.error('خطأ في حذف الإشعار:', error);
        toast({
          title: "خطأ في حذف الإشعار",
          description: "حدث خطأ أثناء حذف الإشعار",
          variant: "destructive"
        });
      } else if (data) {
        // إزالة الإشعار من القائمة المحلية
        const deletedNotif = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        
        // تحديث الإحصائيات محلياً
        if (stats && deletedNotif) {
          setStats(prev => prev ? {
            ...prev,
            total_notifications: Math.max(0, prev.total_notifications - 1),
            unread_notifications: !deletedNotif.read ? 
              Math.max(0, prev.unread_notifications - 1) : prev.unread_notifications
          } : null);
        }
        
        toast({
          title: "تم حذف الإشعار",
          description: "تم حذف الإشعار بنجاح"
        });
      } else {
        toast({
          title: "خطأ في الحذف",
          description: "لم يتم العثور على الإشعار أو ليس لديك صلاحية لحذفه",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('خطأ غير متوقع في حذف الإشعار:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء حذف الإشعار",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .rpc('mark_all_notifications_read', { p_user_id: user.id });

      if (!error) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        );
        
        if (stats) {
          setStats(prev => prev ? { ...prev, unread_notifications: 0 } : null);
        }
        
        toast({
          title: "تم تحديث الإشعارات",
          description: "تم وضع علامة مقروء على جميع الإشعارات"
        });
      }
    } catch (error) {
      console.error('خطأ في تحديث جميع الإشعارات:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .rpc('delete_all_user_notifications', { p_user_id: user.id });

      if (error) {
        console.error('خطأ في حذف جميع الإشعارات:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء حذف الإشعارات",
          variant: "destructive"
        });
      } else {
        setNotifications([]);
        if (stats) {
          setStats(prev => prev ? { 
            ...prev, 
            total_notifications: 0, 
            unread_notifications: 0 
          } : null);
        }
        
        toast({
          title: "تم حذف جميع الإشعارات",
          description: `تم حذف ${data} إشعار بنجاح`
        });
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'new_book':
        return <BookOpen className="h-5 w-5 text-purple-500" />;
      case 'ai_suggestion':
        return <Bell className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBadge = (type: string, title: string = '') => {
    // إشعارات الترحيب - تظهر شعار كتبي فقط
    if (title.includes('أهلاً بك في') || title.includes('كتبي')) {
      return (
        <Badge 
          variant="outline" 
          className="font-black bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
        >
          ترحيب
        </Badge>
      );
    }
    
    // إشعارات الكتب الجديدة من المؤلفين المتابعين
    if (type === 'new_book') {
      return (
        <Badge 
          variant="default" 
          className="bg-purple-500 hover:bg-purple-600 text-white border-purple-600 font-black"
        >
          <BookOpen className="w-3 h-3 ml-1" />
          كتاب جديد
        </Badge>
      );
    }
    
    // إشعارات الموافقة على الكتب فقط
    if (type === 'success' && title.includes('تمت الموافقة')) {
      return (
        <Badge 
          variant="default" 
          className="bg-green-500 hover:bg-green-600 text-white border-green-600 font-black"
        >
          <CheckCircle className="w-3 h-3 ml-1" />
          تمت الموافقة
        </Badge>
      );
    }
    
    if (type === 'ai_suggestion') {
      return (
        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 font-black">
          🤖 إشعار ذكي
        </Badge>
      );
    }

    switch (type) {
      case 'error':
        return (
          <Badge 
            variant="destructive" 
            className="bg-red-500 hover:bg-red-600 text-white border-red-600 font-black"
          >
            <XCircle className="w-3 h-3 ml-1" />
            مرفوض
          </Badge>
        );
      case 'warning':
        return (
          <Badge 
            variant="outline" 
            className="border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 font-black"
          >
            <Clock className="w-3 h-3 ml-1" />
            تحذير
          </Badge>
        );
      default:
        return (
          <Badge 
            variant="outline" 
            className="font-black"
          >
            إشعار
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return 'الآن';
    } else if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInHours < 24) {
      return `منذ ${diffInHours} ساعة`;
    } else if (diffInDays < 7) {
      return `منذ ${diffInDays} يوم`;
    } else {
      // عرض التاريخ الكامل للإشعارات القديمة
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getCategoryLabel = (categoryKey?: string): string => {
    if (!categoryKey) return '';
    
    const categories: Record<string, string> = {
      'novels': 'الروايات',
      'poetry': 'الشعر',
      'prose': 'النثر',
      'scientific': 'كتب علمية',
      'religious': 'كتب دينية',
      'historical': 'كتب تاريخية',
      'philosophy': 'فلسفة',
      'self-help': 'تنمية ذاتية',
      'technology': 'تكنولوجيا',
      'other': 'أخرى'
    };
    
    return categories[categoryKey] || categoryKey;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">جاري تحميل الإشعارات...</div>
        </CardContent>
      </Card>
    );
  }

  // حساب الإحصائيات من الإشعارات الفعلية
  const actualUnreadCount = notifications.filter(n => !n.read).length;
  const actualTotalCount = notifications.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground font-black">
            <Bell className="h-5 w-5" />
            الإشعارات
            {actualUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 font-black bg-red-500 text-white">
                {actualUnreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshData}
              disabled={refreshing}
              className="font-black"
            >
              <RefreshCw className={`h-4 w-4 ml-1 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            {actualUnreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead}
                className="font-black"
              >
                وضع علامة مقروء على الجميع
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={deleteAllNotifications}
                className="font-black"
              >
                <Trash2 className="h-4 w-4 ml-1" />
                حذف جميع الإشعارات
              </Button>
            )}
          </div>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{actualTotalCount}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400 font-black">إجمالي الإشعارات</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{stats.pending_books}</div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400 font-black">كتب في الانتظار</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-black text-green-600 dark:text-green-400">{stats.approved_books}</div>
              <div className="text-sm text-green-600 dark:text-green-400 font-black">كتب مقبولة</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-black text-red-600 dark:text-red-400">{stats.rejected_books}</div>
              <div className="text-sm text-red-600 dark:text-red-400 font-black">كتب مرفوضة</div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 font-black">
            لا توجد إشعارات حالياً
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  !notification.read
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-black text-foreground text-sm truncate">
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getNotificationBadge(notification.type, notification.title)}
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                              title="وضع علامة مقروء"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="حذف الإشعار"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-foreground font-black mb-2">
                      {notification.message}
                    </p>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="font-black">{formatDate(notification.created_at)}</span>
                        {/* عرض "الكتاب محذوف من النظام" فقط للإشعارات المتعلقة بالكتب المحذوفة */}
                        {!notification.book_submission_id && 
                         notification.book_title && 
                         notification.book_title !== '' &&
                         (notification.title?.includes('تمت الموافقة') || notification.title?.includes('تم رفض')) && (
                          <span className="text-orange-500 text-xs font-black">
                            (الكتاب محذوف من النظام)
                          </span>
                        )}
                      </div>
                      {notification.book_title && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="font-black text-foreground">
                            الكتاب: {notification.book_title}
                          </span>
                          {notification.book_author && notification.book_author !== 'مؤلف غير معروف' && (
                            <span className="text-muted-foreground font-black">
                              • المؤلف: {notification.book_author}
                            </span>
                          )}
                          {notification.book_category && notification.book_category !== 'تصنيف غير محدد' && (
                            <span className="text-muted-foreground font-black">
                              • التصنيف: {getCategoryLabel(notification.book_category)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserNotifications;
