import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ban, UserX, Eye, EyeOff, Trash2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  ban_type: 'temporary' | 'permanent';
  banned_at: string;
  expires_at?: string;
  is_active: boolean;
  user_username?: string;
  user_email?: string;
}

interface BannedWord {
  id: string;
  word: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  language: string;
  is_active: boolean;
}

const ModerationDashboard: React.FC = () => {
  const { toast } = useToast();
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'banned_users' | 'banned_words'>('banned_users');
  const [newWord, setNewWord] = useState('');
  const [newWordCategory, setNewWordCategory] = useState('inappropriate');
  const [newWordSeverity, setNewWordSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // جلب المستخدمين المحظورين
  const fetchBannedUsers = async () => {
    try {
      const { data: bannedData, error } = await supabase
        .from('banned_users')
        .select('*')
        .eq('is_active', true)
        .order('banned_at', { ascending: false });

      if (error) throw error;

      // جلب معلومات المستخدمين
      const userIds = bannedData?.map(u => u.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const formattedUsers: BannedUser[] = (bannedData || []).map(u => {
        const profile = profilesMap.get(u.user_id);
        return {
          ...u,
          ban_type: u.ban_type as 'temporary' | 'permanent',
          user_username: profile?.username || 'مستخدم غير معروف',
          user_email: profile?.email || ''
        };
      });

      setBannedUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching banned users:', error);
    }
  };

  // جلب الكلمات المحظورة
  const fetchBannedWords = async () => {
    try {
      const { data, error } = await supabase
        .from('banned_words')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedWords: BannedWord[] = (data || []).map(w => ({
        ...w,
        severity: w.severity as 'low' | 'medium' | 'high' | 'critical'
      }));

      setBannedWords(formattedWords);
    } catch (error) {
      console.error('Error fetching banned words:', error);
    }
  };

  // إضافة كلمة محظورة جديدة
  const addBannedWord = async () => {
    if (!newWord.trim()) return;

    try {
      const { error } = await supabase
        .from('banned_words')
        .insert({
          word: newWord.trim().toLowerCase(),
          category: newWordCategory,
          severity: newWordSeverity,
          language: 'ar'
        });

      if (error) throw error;

      setNewWord('');
      toast({
        title: "تم إضافة الكلمة",
        description: "تم إضافة الكلمة إلى قائمة الكلمات المحظورة بنجاح."
      });
      fetchBannedWords();
    } catch (error) {
      console.error('Error adding banned word:', error);
      toast({
        title: "خطأ في إضافة الكلمة",
        description: "تعذر إضافة الكلمة. قد تكون موجودة مسبقاً.",
        variant: "destructive"
      });
    }
  };

  // تغيير حالة الكلمة المحظورة
  const toggleWordStatus = async (wordId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('banned_words')
        .update({ is_active: !isActive })
        .eq('id', wordId);

      if (error) throw error;

      toast({
        title: isActive ? "تم تعطيل الكلمة" : "تم تفعيل الكلمة",
        description: isActive ? "تم تعطيل الكلمة من المراقبة" : "تم تفعيل الكلمة للمراقبة"
      });
      fetchBannedWords();
    } catch (error) {
      console.error('Error toggling word status:', error);
    }
  };

  // حذف كلمة محظورة
  const deleteBannedWord = async (wordId: string) => {
    try {
      const { error } = await supabase
        .from('banned_words')
        .delete()
        .eq('id', wordId);

      if (error) throw error;

      toast({
        title: "تم حذف الكلمة",
        description: "تم حذف الكلمة من قائمة الكلمات المحظورة."
      });
      fetchBannedWords();
    } catch (error) {
      console.error('Error deleting banned word:', error);
    }
  };

  // إلغاء حظر مستخدم
  const unbanUser = async (banId: string) => {
    try {
      const { error } = await supabase
        .from('banned_users')
        .update({ is_active: false })
        .eq('id', banId);

      if (error) throw error;

      toast({
        title: "تم إلغاء الحظر",
        description: "تم إلغاء حظر المستخدم بنجاح."
      });
      fetchBannedUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBannedUsers(),
        fetchBannedWords()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-book-primary mx-auto mb-3"></div>
        <p className="text-muted-foreground font-cairo">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-book-primary" />
        <h1 className="text-3xl font-tajawal font-bold">لوحة الإشراف والمراقبة</h1>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserX className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{bannedUsers.length}</p>
                <p className="text-sm text-muted-foreground font-cairo">المستخدمون المحظورون</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{bannedWords.filter(w => w.is_active).length}</p>
                <p className="text-sm text-muted-foreground font-cairo">الكلمات المحظورة النشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2">
        <Button
          variant={selectedTab === 'banned_users' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('banned_users')}
          className="font-cairo"
        >
          المستخدمون المحظورون
        </Button>
        <Button
          variant={selectedTab === 'banned_words' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('banned_words')}
          className="font-cairo"
        >
          الكلمات المحظورة
        </Button>
      </div>

      {/* محتوى التبويبات */}
      {selectedTab === 'banned_users' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-tajawal">المستخدمون المحظورون</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {bannedUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={user.ban_type === 'permanent' ? 'destructive' : 'secondary'}>
                            {user.ban_type === 'permanent' ? 'حظر دائم' : 'حظر مؤقت'}
                          </Badge>
                        </div>
                        
                        <p className="font-cairo font-semibold mb-1">
                          المستخدم: {user.user_username}
                        </p>
                        <p className="text-sm text-muted-foreground font-cairo mb-2">
                          السبب: {user.reason}
                        </p>
                        <p className="text-xs text-muted-foreground font-cairo">
                          تاريخ الحظر: {formatDistanceToNow(new Date(user.banned_at), {
                            addSuffix: true,
                            locale: ar
                          })}
                        </p>
                        {user.expires_at && (
                          <p className="text-xs text-muted-foreground font-cairo">
                            ينتهي في: {formatDistanceToNow(new Date(user.expires_at), {
                              addSuffix: true,
                              locale: ar
                            })}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unbanUser(user.id)}
                        className="font-cairo"
                      >
                        إلغاء الحظر
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {selectedTab === 'banned_words' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-tajawal">الكلمات المحظورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* إضافة كلمة جديدة */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-tajawal font-semibold mb-3">إضافة كلمة محظورة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <Input
                  placeholder="الكلمة المحظورة"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="font-cairo"
                />
                <Select value={newWordCategory} onValueChange={setNewWordCategory}>
                  <SelectTrigger className="font-cairo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inappropriate">محتوى غير لائق</SelectItem>
                    <SelectItem value="spam">رسائل مزعجة</SelectItem>
                    <SelectItem value="abuse">سب وإهانة</SelectItem>
                    <SelectItem value="hate_speech">خطاب كراهية</SelectItem>
                    <SelectItem value="violence">عنف</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newWordSeverity} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewWordSeverity(value)}>
                  <SelectTrigger className="font-cairo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="critical">حرجة</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addBannedWord} className="font-cairo">
                  إضافة
                </Button>
              </div>
            </div>

            <Separator />

            {/* قائمة الكلمات المحظورة */}
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {bannedWords.map((word) => (
                  <div key={word.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getSeverityColor(word.severity)}>
                        {word.severity}
                      </Badge>
                      <span className="font-cairo font-semibold">{word.word}</span>
                      <Badge variant="outline">{word.category}</Badge>
                      {!word.is_active && (
                        <Badge variant="secondary">معطلة</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWordStatus(word.id, word.is_active)}
                        className="font-cairo"
                      >
                        {word.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {word.is_active ? 'تعطيل' : 'تفعيل'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBannedWord(word.id)}
                        className="text-destructive hover:text-destructive font-cairo"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModerationDashboard;