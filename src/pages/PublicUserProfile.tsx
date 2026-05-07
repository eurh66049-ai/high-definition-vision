import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { optimizeImageUrl } from '@/utils/imageProxy';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Star, 
  Quote as QuoteIcon, 
  MessageCircle, 
  Clock, 
  MapPin,
  Globe,
  Calendar,
  Users
} from 'lucide-react';
import { SimpleBookCard } from '@/components/books/SimpleBookCard';
import { useUserPublicProfile } from '@/hooks/useUserPublicProfile';
import { useUserInteractionStatus } from '@/hooks/useUserInteractionStatus';
import { useAuth } from '@/context/AuthContext';
import { FollowOptionsPopover } from '@/components/authors/FollowOptionsPopover';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import VerifiedIcon from '@/components/icons/VerifiedIcon';
import { getCategoryInArabic } from '@/utils/categoryTranslation';
import { ProfileSectionTabs } from '@/components/profile/ProfileSectionTabs';
import { VirtualReadingRoom } from '@/components/profile/VirtualReadingRoom';
import { MessageButton } from '@/components/messaging/MessageButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KOTOBI_AI_USER_ID, KOTOBI_AI_AVATAR_URL } from '@/utils/kotobiAi';

const PublicUserProfile: React.FC = () => {
  const { userIdentifier } = useParams<{ userIdentifier: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('books');

  const { 
    profile, 
    reviews, 
    quotes, 
    books, 
    stats, 
    loading, 
    error, 
    getLastActivity 
  } = useUserPublicProfile(userIdentifier);

  // هل هذا المستخدم هو بوت Kotobi AI؟ (لا يُعرض كمؤلف ولا تظهر له أزرار طلب الصداقة/المراسلة)
  const isKotobiBot = profile?.id === KOTOBI_AI_USER_ID;

  const pageTitle = profile?.username 
    ? `${profile.username} - ملف المستخدم | منصة كتبي`
    : userIdentifier 
      ? `${decodeURIComponent(userIdentifier)} - ملف المستخدم | منصة كتبي`
      : 'ملف المستخدم | منصة كتبي';

  // المستخدم يعتبر مؤلف إذا كان لديه كتاب واحد على الأقل (ولكن ليس البوت)
  const isAuthor = !isKotobiBot && stats.booksCount > 0;

  useEffect(() => {
    if (!loading && isAuthor && profile?.username) {
      navigate(`/author/${encodeURIComponent(profile.username)}`, { replace: true });
    }
  }, [loading, isAuthor, profile?.username, navigate]);

  // استخدام hook موحد لجلب كل البيانات (متابعة + طلب مراسلة) في استعلام واحد
  const { 
    isFollowing, 
    followersCount,
    messageRequest,
    loading: interactionLoading,
    refetch: refetchInteraction
  } = useUserInteractionStatus(profile?.id || null);
  
  const { toast } = useToast();
  const [followLoading, setFollowLoading] = useState(false);
  
  // دالة تبديل المتابعة
  const toggleFollow = async () => {
    if (!user) {
      localStorage.setItem('auth_redirect_path', window.location.pathname);
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول أولاً لمتابعة المستخدمين",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!profile?.id || user.id === profile.id) return;

    setFollowLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_user_follow', {
        p_following_id: profile.id
      });

      if (error) {
        console.error('Error toggling follow:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث المتابعة",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: data ? `تم متابعة ${profile.username}!` : `تم إلغاء متابعة ${profile.username}`,
        variant: "success",
      });
      
      // تحديث البيانات
      refetchInteraction();
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // التحقق إذا كان المستخدم يشاهد ملفه الشخصي
  const isOwnProfile = user?.id === profile?.id;
  // لا تظهر أزرار المتابعة على بروفايل البوت، لكن نعرض زر المراسلة دائماً
  const shouldShowFollowButton = !isOwnProfile && !!profile?.id && !isKotobiBot;
  const shouldShowMessageButton = !isOwnProfile && !!profile?.id;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return null;
    return optimizeImageUrl(avatarUrl, 'avatar');
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ar });
    } catch {
      return 'وقت غير معروف';
    }
  };

  const lastActivity = getLastActivity();

  const getActivityText = () => {
    if (!lastActivity) return 'لا يوجد نشاط';
    if (isKotobiBot) {
      const diffMs = Date.now() - new Date(lastActivity.date).getTime();
      if (diffMs >= 0 && diffMs < 5 * 60 * 1000) return 'متصل الآن';
      return lastActivity.type === 'message' ? `آخر رد ${formatRelativeTime(lastActivity.date)}` : `آخر اقتباس ${formatRelativeTime(lastActivity.date)}`;
    }
    // "متصل الآن" إذا كان آخر ping قريب جدًا
    if (lastActivity.type === 'seen') {
      const diffMs = Date.now() - new Date(lastActivity.date).getTime();
      if (diffMs >= 0 && diffMs < 45_000) return 'متصل الآن';
    }

    const time = formatRelativeTime(lastActivity.date);
    switch (lastActivity.type) {
      case 'review': return `آخر مراجعة ${time}`;
      case 'quote': return `آخر اقتباس ${time}`;
      case 'book': return `آخر كتاب ${time}`;
      case 'seen': return `آخر نشاط ${time}`;
      default: return time;
    }
  };

  if (loading) {
    return (
      <HelmetProvider>
        <Helmet>
          <title>{pageTitle}</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Navbar />
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري تحميل بيانات المستخدم...</p>
            </div>
          </div>
          <Footer />
        </div>
      </HelmetProvider>
    );
  }

  if (error || !profile) {
    return (
      <HelmetProvider>
        <Helmet>
          <title>{pageTitle}</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Navbar />
          <div className="flex-grow flex items-center justify-center">
            <Card className="max-w-md mx-4 bg-card/90 backdrop-blur-md rounded-2xl border border-border/40 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <Avatar className="h-20 w-20 mx-auto mb-4 bg-muted/50 backdrop-blur-sm">
                    <AvatarFallback className="bg-muted text-muted-foreground text-2xl">؟</AvatarFallback>
                  </Avatar>
                  <h1 className="text-2xl font-bold text-foreground mb-2">المستخدم غير موجود</h1>
                  <p className="text-muted-foreground mb-6">
                    عذراً، المستخدم الذي تبحث عنه غير موجود
                  </p>
                </div>
                <div className="space-y-3">
                  <Button onClick={() => navigate('/')} className="w-full">العودة إلى الصفحة الرئيسية</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <Footer />
        </div>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>{`${profile.username} - ملف المستخدم | منصة كتبي`}</title>
        <meta name="description" content={`ملف المستخدم ${profile.username} على منصة كتبي - ${stats.booksCount} كتاب، ${stats.reviewsCount} مراجعة، ${stats.quotesCount} اقتباس`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background pb-safe-bottom">
        <Navbar />

        <main className="flex-grow py-8">
          <div className="container mx-auto px-4 max-w-4xl">

            {/* بطاقة معلومات المستخدم */}
            <Card className="mb-8 overflow-hidden bg-card/90 backdrop-blur-md border-border/40 rounded-2xl shadow-md">
              <CardContent className="p-5 md:p-6 text-center">
                <div className="mb-4">
                  <Avatar className="w-24 h-24 md:w-28 md:h-28 mx-auto bg-card/70 backdrop-blur-sm ring-4 ring-primary/20">
                    <AvatarImage 
                      src={isKotobiBot ? KOTOBI_AI_AVATAR_URL : (getAvatarUrl(profile.avatar_url) || '')} 
                      alt={profile.username} 
                      className="object-cover" 
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {getInitials(profile.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">{profile.username}</h1>
                  {profile.is_verified && (
                    <VerifiedIcon size={22} className="flex-shrink-0 w-5 h-5" />
                  )}
                  
                </div>

                {/* آخر نشاط */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-4">
                  <Clock className="w-4 h-4" />
                  <span>{getActivityText()}</span>
                </div>

                {/* الموقع والتاريخ */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-sm mb-5">
                  {profile.country_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.country_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>انضم {format(new Date(profile.created_at), 'MMMM yyyy', { locale: ar })}</span>
                  </div>
                </div>

                {/* الإحصائيات */}
                <div className="flex justify-center items-center gap-6 text-muted-foreground text-sm mb-5">
                  <div className="text-center">
                    <span className="block font-bold text-lg text-foreground">{stats.booksCount}</span>
                    <span>كتاب</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-lg text-foreground">{stats.reviewsCount}</span>
                    <span>مراجعة</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-lg text-foreground">{stats.quotesCount}</span>
                    <span>اقتباس</span>
                  </div>
                  {/* عدد المتابعين */}
                  <div className="text-center">
                    <span className="block font-bold text-lg text-foreground">{followersCount?.toLocaleString('ar') || 0}</span>
                    <span>متابع</span>
                  </div>
                </div>

                {/* أزرار المتابعة والمراسلة */}
                {(isKotobiBot || !interactionLoading) && (shouldShowFollowButton || shouldShowMessageButton) && (
                  <div className="flex items-center justify-center gap-3 mb-5">
                    {shouldShowFollowButton && (
                      <FollowOptionsPopover
                        isFollowing={isFollowing}
                        loading={followLoading}
                        onFollowOnSite={toggleFollow}
                        authorName={profile.username}
                        socialLinks={{
                          instagram: profile.social_instagram,
                          twitter: profile.social_twitter,
                          facebook: profile.social_facebook,
                          whatsapp: profile.social_whatsapp,
                          youtube: profile.social_youtube,
                          linkedin: profile.social_linkedin,
                          tiktok: profile.social_tiktok
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-8 rounded-full text-base shadow-md"
                        hideText={messageRequest?.status === 'pending' && messageRequest?.is_sender}
                      />
                    )}
                    
                    {shouldShowMessageButton && (
                      <MessageButton
                        targetUserId={profile.id}
                        targetUsername={profile.username}
                        allowMessaging={profile.allow_messaging !== false}
                        className="font-bold py-2 px-6 rounded-full text-base shadow-md"
                        externalRequestStatus={messageRequest}
                        externalLoading={interactionLoading}
                      />
                    )}
                  </div>
                )}

                {/* البايو */}
                {profile.bio && (
                  <p className="text-foreground text-sm leading-relaxed max-w-xl mx-auto">
                    {profile.bio}
                  </p>
                )}

                {/* رابط الموقع */}
                {profile.website && (
                  <a 
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-3 text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    {profile.website}
                  </a>
                )}
              </CardContent>
            </Card>

            {/* التبويبات */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <ProfileSectionTabs 
                booksCount={stats.booksCount}
                quotesCount={stats.quotesCount}
                reviewsCount={stats.reviewsCount}
              />

              {/* غرفة القراءة الافتراضية */}
              <TabsContent value="reading-room">
                <VirtualReadingRoom userId={profile.id} username={profile.username} />
              </TabsContent>

              {/* قسم الكتب */}
              <TabsContent value="books">
                {books.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {books.map((book) => (
                      <SimpleBookCard
                        key={book.id}
                        id={book.id}
                        title={book.title}
                        author={book.author}
                        cover_image={book.cover_image_url || ''}
                        category={book.category}
                        created_at={book.created_at}
                        display_only={book.display_type === 'display_only'}
                        rating={book.rating}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-lg">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد كتب</h3>
                    <p className="text-muted-foreground">لم يقم هذا المستخدم برفع أي كتب بعد</p>
                  </div>
                )}
              </TabsContent>

              {/* قسم المراجعات - مراجعات كتبها المستخدم */}
              <TabsContent value="reviews">
                {reviews.length > 0 ? (
                  <div className="space-y-4" dir="rtl">
                    {reviews.map((review) => (
                      <Card key={review.id} className="bg-card/90 backdrop-blur-sm border-border/40">
                        <CardContent className="p-4">
                          <div className="flex flex-row-reverse gap-4">
                            {review.book_cover_url && (
                              <Link to={`/book/${review.book_slug || review.book_id}`} className="flex-shrink-0">
                                <img
                                  src={review.book_cover_url}
                                  alt={review.book_title}
                                  className="w-16 h-24 object-cover rounded-lg shadow-md hover:scale-105 transition-transform"
                                />
                              </Link>
                            )}
                            <div className="flex-1 min-w-0 text-right">
                              <Link 
                                to={`/book/${review.book_slug || review.book_id}`}
                                className="font-bold text-foreground hover:text-primary transition-colors block truncate"
                              >
                                {review.book_title}
                              </Link>
                              <p className="text-sm text-muted-foreground mb-2">{review.book_author}</p>
                              
                              <div className="flex items-center gap-2 mb-2 justify-end flex-row-reverse">
                                <div className="flex flex-row-reverse">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= review.rating
                                          ? 'text-primary fill-primary'
                                          : 'text-muted-foreground/30'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-medium text-primary">{review.rating}/5</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(review.created_at)}
                                </span>
                              </div>

                              {review.comment && (
                                <p className="text-foreground text-sm leading-relaxed">
                                  {review.comment}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-lg">
                    <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد مراجعات</h3>
                    <p className="text-muted-foreground">لم يقم هذا المستخدم بكتابة أي مراجعات بعد</p>
                  </div>
                )}
              </TabsContent>

              {/* قسم الاقتباسات */}
              <TabsContent value="quotes">
                {quotes.length > 0 ? (
                  <div className="space-y-4">
                    {quotes.map((quote) => (
                      <Card key={quote.id} className="bg-card/90 backdrop-blur-sm border-border/40 overflow-hidden">
                        <CardContent className="p-5">
                          <div className="relative mb-4">
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-transparent rounded-full" />
                            <blockquote className="pr-5">
                              <p 
                                className="text-base leading-loose text-foreground"
                                style={{ fontFamily: "'Noto Naskh Arabic', 'Amiri', serif" }}
                              >
                                <span className="text-xl text-primary/60 font-serif">"</span>
                                {quote.quote_text}
                                <span className="text-xl text-primary/60 font-serif">"</span>
                              </p>
                            </blockquote>
                          </div>

                          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl">
                            {quote.book_cover_url && (
                              <Link to={`/book/${quote.book_slug || quote.book_id}`} className="flex-shrink-0">
                                <img
                                  src={quote.book_cover_url}
                                  alt={quote.book_title}
                                  className="w-12 h-16 object-cover rounded-lg shadow-md hover:scale-105 transition-transform"
                                />
                              </Link>
                            )}
                            <div className="flex-1 min-w-0">
                              <Link 
                                to={`/book/${quote.book_slug || quote.book_id}`}
                                className="font-semibold text-foreground hover:text-primary transition-colors block truncate"
                              >
                                {quote.book_title}
                              </Link>
                              <p className="text-sm text-muted-foreground">— {quote.author_name}</p>
                              {quote.book_category && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {getCategoryInArabic(quote.book_category)}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(quote.created_at)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-lg">
                    <QuoteIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد اقتباسات</h3>
                    <p className="text-muted-foreground">لم يقم هذا المستخدم بإضافة أي اقتباسات بعد</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

          </div>
        </main>

        <Footer />
      </div>
    </HelmetProvider>
  );
};

export default PublicUserProfile;
