import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, Search, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Author {
  id: string;
  name: string;
  bio: string;
  avatar_url: string;
  followers_count: number;
  books_count: number;
}

const AuthorFollowersManager: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [filteredAuthors, setFilteredAuthors] = useState<Author[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [followersToAdd, setFollowersToAdd] = useState<number>(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchAuthors();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredAuthors(
        authors.filter(author =>
          author.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredAuthors(authors);
    }
  }, [searchTerm, authors]);

  const fetchAuthors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('authors')
        .select('id, name, bio, avatar_url, followers_count, books_count')
        .order('followers_count', { ascending: false });

      if (error) {
        console.error('Error fetching authors:', error);
        toast({
          title: "خطأ في جلب المؤلفين",
          description: "حدث خطأ أثناء جلب قائمة المؤلفين",
          variant: "destructive"
        });
        return;
      }

      setAuthors(data || []);
      setFilteredAuthors(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء جلب البيانات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFollowers = async () => {
    if (!selectedAuthor || followersToAdd <= 0) {
      toast({
        title: "بيانات غير صحيحة",
        description: "يرجى التأكد من اختيار المؤلف وإدخال عدد صحيح من المتابعين",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing(true);
      
      const newFollowersCount = selectedAuthor.followers_count + followersToAdd;

      const { error } = await supabase
        .from('authors')
        .update({ followers_count: newFollowersCount })
        .eq('id', selectedAuthor.id);

      if (error) {
        console.error('Error updating followers count:', error);
        toast({
          title: "خطأ في التحديث",
          description: "حدث خطأ أثناء تحديث عدد المتابعين",
          variant: "destructive"
        });
        return;
      }

      // تحديث البيانات المحلية
      setAuthors(prev => 
        prev.map(author => 
          author.id === selectedAuthor.id 
            ? { ...author, followers_count: newFollowersCount }
            : author
        )
      );

      toast({
        title: "تم التحديث بنجاح",
        description: `تم إضافة ${followersToAdd} متابع للمؤلف ${selectedAuthor.name}. العدد الجديد: ${newFollowersCount}`,
        variant: "default"
      });

      // إعادة تعيين النموذج
      setSelectedAuthor(null);
      setFollowersToAdd(0);
      setIsDialogOpen(false);

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء التحديث",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDialog = (author: Author) => {
    setSelectedAuthor(author);
    setFollowersToAdd(0);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة متابعي المؤلفين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري تحميل المؤلفين...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          إدارة متابعي المؤلفين
        </CardTitle>
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث عن مؤلف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">
            {filteredAuthors.length} مؤلف
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAuthors.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'لم يتم العثور على مؤلفين مطابقين للبحث' : 'لا يوجد مؤلفين'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAuthors.map((author) => (
              <div key={author.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={author.avatar_url} alt={author.name} />
                    <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{author.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {author.bio || 'لا يوجد وصف'}
                    </p>
                    <div className="flex gap-4 mt-1">
                      <Badge variant="outline">
                        {author.followers_count} متابع
                      </Badge>
                      <Badge variant="outline">
                        {author.books_count} كتاب
                      </Badge>
                    </div>
                  </div>
                </div>
                <Dialog open={isDialogOpen && selectedAuthor?.id === author.id} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(author)}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      إضافة متابعين
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة متابعين للمؤلف: {selectedAuthor?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedAuthor?.avatar_url} alt={selectedAuthor?.name} />
                          <AvatarFallback>{selectedAuthor?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{selectedAuthor?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            العدد الحالي: {selectedAuthor?.followers_count} متابع
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="followers-count">عدد المتابعين المراد إضافتهم</Label>
                        <Input
                          id="followers-count"
                          type="number"
                          min="1"
                          max="10000"
                          value={followersToAdd}
                          onChange={(e) => setFollowersToAdd(parseInt(e.target.value) || 0)}
                          placeholder="أدخل العدد..."
                        />
                        {followersToAdd > 0 && selectedAuthor && (
                          <p className="text-sm text-muted-foreground">
                            العدد الجديد سيكون: {selectedAuthor.followers_count + followersToAdd} متابع
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          disabled={processing}
                        >
                          إلغاء
                        </Button>
                        <Button
                          onClick={handleAddFollowers}
                          disabled={processing || followersToAdd <= 0}
                          className="flex items-center gap-2"
                        >
                          {processing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              جاري الإضافة...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              إضافة المتابعين
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthorFollowersManager;