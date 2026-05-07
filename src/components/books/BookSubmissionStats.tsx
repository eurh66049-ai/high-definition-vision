
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface StatsData {
  total_notifications: number;
  unread_notifications: number;
  pending_books: number;
  approved_books: number;
  rejected_books: number;
}

const BookSubmissionStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_notifications_stats', { p_user_id: user.id });

      if (!error && data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">إجمالي كتبي</p>
              <p className="text-2xl font-bold">
                {stats.pending_books + stats.approved_books + stats.rejected_books}
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">في الانتظار</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_books}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">مقبولة</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved_books}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">الإشعارات</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.total_notifications}</p>
                {stats.unread_notifications > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {stats.unread_notifications} جديد
                  </Badge>
                )}
              </div>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookSubmissionStats;