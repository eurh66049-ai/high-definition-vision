import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, ShieldCheck, Search, Users, BookOpen, Heart } from 'lucide-react';
import { useVerifiedAuthors } from '@/hooks/useVerifiedAuthors';
import { optimizeImageUrl } from '@/utils/imageProxy';

const AuthorVerificationManager: React.FC = () => {
  const {
    verifiedAuthors,
    authorCandidates,
    loading,
    actionLoading,
    verifyAuthor,
    unverifyAuthor
  } = useVerifiedAuthors();

  const [searchTerm, setSearchTerm] = useState('');

  const filteredAuthors = authorCandidates.filter(author =>
    author.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVerified = verifiedAuthors.filter(author =>
    author.author_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل بيانات المؤلفين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">إدارة توثيق المؤلفين</h1>
          <p className="text-muted-foreground font-cairo">
            إدارة وتوثيق المؤلفين في النظام
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-cairo">
            <ShieldCheck className="w-4 h-4 ml-2" />
            {verifiedAuthors.length} موثق
          </Badge>
          <Badge variant="secondary" className="font-cairo">
            <Users className="w-4 h-4 ml-2" />
            {authorCandidates.length} مؤلف
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="البحث عن مؤلف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10 font-cairo"
        />
      </div>

      <Tabs defaultValue="candidates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="candidates" className="font-cairo">
            المؤلفون المرشحون ({filteredAuthors.length})
          </TabsTrigger>
          <TabsTrigger value="verified" className="font-cairo">
            المؤلفون الموثقون ({filteredVerified.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAuthors.map((author) => (
              <Card key={author.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={optimizeImageUrl(author.avatar_url || '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png', 'avatar')} />
                      <AvatarFallback className="font-cairo">
                        {author.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-cairo">{author.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {author.books_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {author.followers_count}
                        </span>
                      </div>
                    </div>
                    {author.is_verified && (
                      <ShieldCheck className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {author.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 font-cairo whitespace-pre-wrap">
                      {author.bio}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    {author.is_verified ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unverifyAuthor(author.id, author.name)}
                        disabled={actionLoading === author.id}
                        className="flex-1 font-cairo"
                      >
                        {actionLoading === author.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <>
                            <Shield className="w-4 h-4 ml-2" />
                            إلغاء التوثيق
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          console.log('🔘 تم الضغط على زر توثيق المؤلف:', {
                            authorId: author.id,
                            authorName: author.name,
                            timestamp: new Date().toISOString()
                          });
                          verifyAuthor(author.id, author.name);
                        }}
                        disabled={actionLoading === author.id}
                        className="flex-1 font-cairo"
                      >
                        {actionLoading === author.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 ml-2" />
                            توثيق المؤلف
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAuthors.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-cairo">لا توجد مؤلفون مطابقون للبحث</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVerified.map((verifiedAuthor) => {
              const authorData = authorCandidates.find(a => a.id === verifiedAuthor.author_id);
              
              return (
                <Card key={verifiedAuthor.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={optimizeImageUrl(authorData?.avatar_url || '/lovable-uploads/b67a08a8-60e7-4592-9239-44d592bcd388.png', 'avatar')} />
                        <AvatarFallback className="font-cairo">
                          {verifiedAuthor.author_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-cairo flex items-center gap-2">
                          {verifiedAuthor.author_name}
                          <ShieldCheck className="w-5 h-5 text-blue-500" />
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {authorData && (
                            <>
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {authorData.books_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {authorData.followers_count}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {authorData?.bio && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2 font-cairo">
                        {authorData.bio}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-cairo">
                        تم التوثيق: {new Date(verifiedAuthor.verified_at).toLocaleDateString('ar-SA')}
                      </p>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unverifyAuthor(verifiedAuthor.author_id, verifiedAuthor.author_name)}
                        disabled={actionLoading === verifiedAuthor.author_id}
                        className="w-full font-cairo"
                      >
                        {actionLoading === verifiedAuthor.author_id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <>
                            <Shield className="w-4 h-4 ml-2" />
                            إلغاء التوثيق
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredVerified.length === 0 && (
            <div className="text-center py-8">
              <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-cairo">لا توجد مؤلفون موثقون مطابقون للبحث</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthorVerificationManager;