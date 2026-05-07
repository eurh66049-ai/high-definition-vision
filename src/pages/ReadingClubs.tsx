import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, Plus, Crown, Calendar, Search } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReadingClubs } from '@/hooks/useReadingClubs';
import { useAuth } from '@/context/AuthContext';
import CreateClubDialog from '@/components/clubs/CreateClubDialog';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ReadingClubs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubs, myClubs, loading, joinClub } = useReadingClubs();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.book_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinClub = async (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
      return;
    }
    await joinClub(clubId);
  };

  const ClubCard = ({ club, showJoinButton = true }: { club: any; showJoinButton?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="p-4 cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/30 bg-card"
        onClick={() => navigate(`/reading-clubs/${club.id}`)}
      >
        <div className="flex gap-4">
          {/* غلاف الكتاب */}
          <div className="flex-shrink-0">
            <img
              src={club.book_cover_url || '/placeholder.svg'}
              alt={club.book_title}
              className="w-20 h-28 object-cover rounded-lg shadow-md"
            />
          </div>

          {/* معلومات النادي */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-lg line-clamp-1">{club.name}</h3>
              <Badge variant="secondary" className="flex-shrink-0">
                <Users className="h-3 w-3 ml-1" />
                {club.current_members}/{club.max_members}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              📖 {club.book_title}
            </p>

            {club.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                {club.description}
              </p>
            )}

            {/* منشئ النادي */}
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={club.creator_avatar} />
                <AvatarFallback className="text-xs">
                  {club.creator_username?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Crown className="h-3 w-3 text-yellow-500" />
                {club.creator_username}
              </span>
              <span className="text-xs text-muted-foreground mr-auto">
                <Calendar className="h-3 w-3 inline ml-1" />
                {formatDistanceToNow(new Date(club.created_at), { 
                  addSuffix: true, 
                  locale: ar 
                })}
              </span>
            </div>

            {/* زر الانضمام */}
            {showJoinButton && !club.is_member && club.current_members < club.max_members && (
              <Button 
                size="sm" 
                className="mt-3 w-full"
                onClick={(e) => handleJoinClub(club.id, e)}
              >
                انضم للنادي
              </Button>
            )}

            {club.is_member && club.created_by === user?.id && (
              <Badge className="mt-3 bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                👑 أنت منشئ النادي
              </Badge>
            )}

            {club.is_member && club.created_by !== user?.id && (
              <Badge className="mt-3 bg-green-500/20 text-green-600 border-green-500/30">
                أنت عضو ✓
              </Badge>
            )}

            {club.current_members >= club.max_members && !club.is_member && (
              <Badge variant="secondary" className="mt-3">
                النادي ممتلئ
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-40">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        {/* العنوان */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              نوادي القراءة
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              اقرأ مع الآخرين وناقش الكتب معاً 📚
            </p>
          </div>

          {user && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء نادي
            </Button>
          )}
        </div>

        {/* البحث */}
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن نادي أو كتاب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* التبويبات */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="all">جميع النوادي</TabsTrigger>
            <TabsTrigger value="my" disabled={!user}>
              نواديي ({myClubs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-20 h-28 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-full" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredClubs.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد نوادي بعد</h3>
                <p className="text-muted-foreground mb-4">
                  كن أول من ينشئ نادي قراءة!
                </p>
                {user && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    إنشاء أول نادي
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredClubs.map(club => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my">
            {myClubs.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لم تنضم لأي نادي بعد</h3>
                <p className="text-muted-foreground">
                  تصفح النوادي المتاحة وانضم لواحد منها!
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myClubs.map(club => (
                  <ClubCard key={club.id} club={club} showJoinButton={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>


      {createDialogOpen && (
        <CreateClubDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
        />
      )}

      <BottomNavigation />
    </div>
  );
};

export default ReadingClubs;
