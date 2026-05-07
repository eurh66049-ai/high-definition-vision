import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, Search, RefreshCw, UserX, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toLatinDigits } from '@/utils/numberUtils';
interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  ban_type: 'temporary' | 'permanent';
  expires_at: string | null;
  is_active: boolean;
  banned_at: string;
  banned_by: string | null;
  profiles?: {
    username: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  banned_by_profile?: {
    username: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

const BannedUsersManager: React.FC = () => {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unbanning, setUnbanning] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBannedUsers = async () => {
    try {
      setLoading(true);
      
      // جلب المستخدمين المحظورين مع معلومات الملف الشخصي
      const { data: bannedData, error } = await supabase
        .from('banned_users')
        .select('*')
        .eq('is_active', true)
        .order('banned_at', { ascending: false });

      if (error) {
        console.error('Error fetching banned users:', error);
        toast({
          title: "خطأ في جلب البيانات",
          description: "تعذر جلب قائمة المستخدمين المحظورين",
          variant: "destructive"
        });
        return;
      }

      // جلب معلومات الملفات الشخصية للمستخدمين المحظورين ومن قام بحظرهم
      const userIds = (bannedData?.map(user => user.user_id) || []).filter(Boolean);
      const adminIds = (bannedData?.map(user => user.banned_by).filter(Boolean) as string[]) || [];
      const uniqueIds = Array.from(new Set([...(userIds as string[]), ...adminIds]));

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url')
        .in('id', uniqueIds);

      const getProfileById = (id: string | null | undefined) =>
        (profilesData || []).find((p) => p.id === id) || null;

      // دمج البيانات
      const usersWithProfiles: BannedUser[] = (bannedData || []).map(user => ({
        ...user,
        ban_type: user.ban_type as 'temporary' | 'permanent',
        profiles: getProfileById(user.user_id),
        banned_by_profile: getProfileById(user.banned_by)
      }));

      setBannedUsers(usersWithProfiles);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء جلب البيانات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const unbanUser = async (bannedUserId: string) => {
    try {
      setUnbanning(bannedUserId);
      
      console.log('إلغاء حظر المستخدم:', bannedUserId);
      
      // استخدام Edge Function لإلغاء الحظر بصلاحيات الـ service role
      const { data, error } = await supabaseFunctions.functions.invoke('unban-user', {
        body: { bannedUserId }
      });

      if (error) {
        console.error('Error unbanning user:', error);
        toast({
          title: "خطأ في إلغاء الحظر",
          description: error.message || "تعذر إلغاء حظر المستخدم",
          variant: "destructive"
        });
        return;
      }

      console.log('تم إلغاء الحظر بنجاح');

      // إزالة المستخدم من القائمة فوراً
      setBannedUsers(prev => prev.filter(user => user.id !== bannedUserId));
      
      toast({
        title: "تم إلغاء الحظر بنجاح",
        description: "تم إلغاء حظر المستخدم وأصبح بإمكانه الوصول للنظام مرة أخرى",
      });
      
      // تحديث القائمة بعد ثانيتين للتأكد
      setTimeout(() => {
        console.log('تحديث قائمة المستخدمين المحظورين...');
        fetchBannedUsers();
      }, 2000);
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء إلغاء الحظر",
        variant: "destructive"
      });
    } finally {
      setUnbanning(null);
    }
  };

  const isExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getBanTypeLabel = (banType: string): string => {
    return banType === 'permanent' ? 'دائم' : 'مؤقت';
  };

  const getBanTypeVariant = (banType: string): "default" | "destructive" => {
    return banType === 'permanent' ? 'destructive' : 'default';
  };

  const formatDate = (dateString: string): string => {
    const formatted = new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return toLatinDigits(formatted);
  };

  const getTimeRemaining = (expiresAt: string | null): string => {
    if (!expiresAt) return '';
    
    const expireDate = new Date(expiresAt);
    const now = new Date();
    
    if (expireDate < now) return 'منتهي الصلاحية';
    
    return toLatinDigits(formatDistanceToNow(expireDate, { 
      addSuffix: true, 
      locale: ar 
    }));
  };

  const filteredUsers = bannedUsers.filter(user => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      user.profiles?.username?.toLowerCase().includes(searchLower) ||
      user.profiles?.email?.toLowerCase().includes(searchLower) ||
      user.reason.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="mr-2 text-muted-foreground">جاري تحميل المستخدمين المحظورين...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <CardTitle>إدارة المستخدمين المحظورين</CardTitle>
              <Badge variant="destructive">{bannedUsers.length}</Badge>
            </div>
            <Button
              onClick={fetchBannedUsers}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المستخدمين المحظورين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <UserX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-muted-foreground mb-2">
                {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمين محظورين'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'جرب كلمات بحث مختلفة' : 'جميع المستخدمين يتمتعون بوصول كامل للنظام'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-l-4 border-l-destructive">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {user.profiles?.username || user.profiles?.email || 'مستخدم مجهول'}
                            </h3>
                            <Badge variant={getBanTypeVariant(user.ban_type)}>
                              {getBanTypeLabel(user.ban_type)}
                            </Badge>
                            {isExpired(user.expires_at) && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                منتهي الصلاحية
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <span className="font-medium">سبب الحظر:</span>
                              <span className="text-muted-foreground">{user.reason}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">تاريخ الحظر:</span>
                              <span className="text-muted-foreground">{formatDate(user.banned_at)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">محظور بواسطة:</span>
                              <span className="text-muted-foreground">
                                {user.banned_by_profile?.username || user.banned_by_profile?.email || 'غير معروف'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {user.ban_type === 'temporary' && user.expires_at && (
                              <>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">ينتهي في:</span>
                                  <span className="text-muted-foreground">{formatDate(user.expires_at)}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium">الوقت المتبقي:</span>
                                  <span className="text-muted-foreground">{getTimeRemaining(user.expires_at)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {user.profiles?.email && (
                          <div className="text-sm text-muted-foreground mb-4">
                            البريد الإلكتروني: {user.profiles.email}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unbanUser(user.id)}
                          disabled={unbanning === user.id}
                          className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                        >
                          {unbanning === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <Shield className="h-4 w-4 ml-2" />
                          )}
                          إلغاء الحظر
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BannedUsersManager;