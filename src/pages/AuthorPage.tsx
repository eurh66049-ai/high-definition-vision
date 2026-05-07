import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from "react";
import { formatViewCount } from "@/utils/formatUtils";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UnifiedProfileLink } from "@/components/profile/UnifiedProfileLink";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Star,
  Eye,
  LoaderCircle,
  Users,
  Quote as QuoteIcon,
  MessageCircle,
  Clock,
  MapPin,
  Globe,
  Calendar,
} from "lucide-react";
import { SimpleBookCard } from "@/components/books/SimpleBookCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorFollow } from "@/hooks/useAuthorFollow";
import { FollowOptionsPopover } from "@/components/authors/FollowOptionsPopover";
import { useAuth } from "@/context/AuthContext";
import ResponsiveDescription from "@/components/ui/ResponsiveDescription";
import { useBatchBookStats } from "@/hooks/useBatchBookStats";
import { useCategoryImagesPreloader } from "@/hooks/useImagePreloader";
import { useOptimizedAuthorData } from "@/hooks/useOptimizedAuthorData";
import { useAuthorReviewsQuotes } from "@/hooks/useAuthorReviewsQuotes";
import VerifiedIcon from "@/components/icons/VerifiedIcon";
import { getCategoryInArabic } from "@/utils/categoryTranslation";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { ProfileSectionTabs } from "@/components/profile/ProfileSectionTabs";
import { MessageButton } from "@/components/messaging/MessageButton";

const encodePathSegment = (value: string) => {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
};

// Error Boundary لمنع الصفحة البيضاء
class AuthorPageErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AuthorPage Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <div className="flex-grow flex items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                حدث خطأ في تحميل صفحة المؤلف
              </h2>
              <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AuthorData {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  books_count: number;
  total_views: number;
  average_rating: number;
  country_code?: string | null;
  country_name?: string | null;
  slug?: string | null;
  followers_count?: number;
  is_verified?: boolean;
  user_id?: string | null;
  allow_messaging?: boolean;
  website?: string | null;
  created_at?: string;
}

const AuthorPage: React.FC = () => {
  const { authorIdentifier } = useParams<{ authorIdentifier: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authorData, setAuthorData] = useState<AuthorData | null>(null);
  const [authorLastSeen, setAuthorLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorBooks, setAuthorBooks] = useState<any[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const BOOKS_PER_PAGE = 24;
  const loadingRef = useRef<HTMLDivElement>(null);

  useCategoryImagesPreloader(authorBooks);

  const [authorName, setAuthorName] = useState<string>("");
  const [isVerifiedAuthor, setIsVerifiedAuthor] = useState(false);
  const [activeTab, setActiveTab] = useState("books");
  const optimizedAuthorData = useOptimizedAuthorData(authorName);
  const { reviews, quotes, loading: reviewsQuotesLoading } = useAuthorReviewsQuotes(authorName);

  const {
    isFollowing,
    loading: followLoading,
    initialLoading: followInitialLoading,
    followersCount,
    toggleFollow,
    shouldShowFollowButton,
    authorSocialLinks,
  } = useAuthorFollow(authorData?.id || null, authorName, user?.id);

  // تم نقل useMessageRequests داخل MessageButton فقط لتجنب تعارض القنوات

  const bookIds = authorBooks.map((book) => book.id);
  const { getBookStats } = useBatchBookStats(bookIds);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getLastSeenText = (lastSeen: string | null) => {
    if (!lastSeen) return "لا يوجد نشاط";
    try {
      const diffMs = Date.now() - new Date(lastSeen).getTime();
      if (diffMs >= 0 && diffMs < 45_000) return "متصل الآن";
      return `آخر نشاط ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ar })}`;
    } catch {
      return "لا يوجد نشاط";
    }
  };

  useEffect(() => {
    const fetchAuthorData = async () => {
      if (!authorIdentifier) return;

      setAuthorLastSeen(null);

      try {
        const { data, error } = await supabase.rpc("get_author_by_slug_or_name", {
          p_identifier: authorIdentifier,
        });

        if (data && data.length > 0) {
          const author = data[0];
          setAuthorName(author.name);

          let allowMessaging = true;

          if (author.user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("allow_messaging, last_seen")
              .eq("id", author.user_id)
              .single();

            if (profileData) {
              allowMessaging =
                profileData.allow_messaging !== null ? profileData.allow_messaging : true;
              setAuthorLastSeen(profileData.last_seen ?? null);
            }
          }

          setAuthorData({
            ...author,
            total_views: 0,
            average_rating: 0,
            followers_count: author.followers_count || 0,
            user_id: author.user_id || null,
            allow_messaging: allowMessaging,
            website: author.website || null,
            created_at: author.created_at || null,
          });
        } else {
          setAuthorData(null);
        }
      } catch (error) {
        console.error("Error fetching author data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorData();
  }, [authorIdentifier]);

  useEffect(() => {
    const checkVerification = async () => {
      if (!authorData?.id) return;
      try {
        const { data, error } = await supabase.rpc("is_author_verified", {
          p_author_id: authorData.id,
        });

        if (error) return;
        setIsVerifiedAuthor(Boolean(data));
      } catch {
        // ignore
      }
    };

    checkVerification();
  }, [authorData?.id]);

  const fetchAuthorBooks = async (pageNum = 0, isLoadMore = false) => {
    if (!authorName) return;

    if (!isLoadMore) {
      setBooksLoading(true);
      setAuthorBooks([]);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let { data, error } = await supabase
        .from("book_submissions")
        .select("*, display_type")
        .eq("status", "approved")
        .eq("author", authorName)
        .range(pageNum * BOOKS_PER_PAGE, (pageNum + 1) * BOOKS_PER_PAGE - 1)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        const authorParts = authorName.split(" ").filter((part) => part.length > 2);
        if (authorParts.length > 0) {
          let query = supabase
            .from("book_submissions")
            .select("*, display_type")
            .eq("status", "approved");

          authorParts.forEach((part) => {
            query = query.ilike("author", `%${part}%`);
          });

          const partialResult = await query
            .range(pageNum * BOOKS_PER_PAGE, (pageNum + 1) * BOOKS_PER_PAGE - 1)
            .order("created_at", { ascending: false });

          data = partialResult.data;
          error = partialResult.error;
        }
      }

      if (error) {
        console.error("Error fetching author books:", error);
        return;
      }

      const processedBooks = (data || []).map((book) => ({
        ...book,
        display_only: book.display_type === "display_only",
      }));

      if (isLoadMore) {
        setAuthorBooks((prev) => [...prev, ...processedBooks]);
      } else {
        setAuthorBooks(processedBooks);
      }

      setHasMore(processedBooks.length === BOOKS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching author books:", error);
    } finally {
      setBooksLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (authorData && authorBooks.length >= 0) {
      setAuthorData((prev) =>
        prev
          ? {
              ...prev,
              books_count: authorBooks.length,
              total_views: authorBooks.reduce((sum, book) => sum + (book.views || 0), 0),
              average_rating:
                authorBooks.length > 0
                  ? authorBooks.reduce((sum, book) => sum + (book.rating || 0), 0) /
                    authorBooks.length
                  : 0,
            }
          : null,
      );
    }
  }, [authorBooks, authorData?.id]);

  useEffect(() => {
    if (authorName) fetchAuthorBooks();
  }, [authorName]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !booksLoading) {
          setLoadingMore(true);
          setTimeout(() => fetchAuthorBooks(page + 1, true), 2000);
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    if (loadingRef.current) observer.observe(loadingRef.current);

    return () => {
      if (loadingRef.current) observer.unobserve(loadingRef.current);
    };
  }, [hasMore, loadingMore, booksLoading, page]);

  const handleBookNavigate = (bookPath: string) => {
    window.location.href = bookPath;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل بيانات المؤلف...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!authorData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Card className="max-w-md mx-4 bg-card/90 backdrop-blur-md rounded-2xl border border-border/40 shadow-md">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Avatar className="h-20 w-20 mx-auto mb-4 bg-muted/50 backdrop-blur-sm">
                  <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                    ؟
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold text-foreground mb-2">المؤلف غير موجود</h1>
                <p className="text-muted-foreground mb-6">
                  عذراً، المؤلف الذي تبحث عنه غير موجود في موقع كتبي
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={() => navigate("/authors")} className="w-full">
                  تصفح جميع المؤلفين
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  العودة إلى الصفحة الرئيسية
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const metaDescription = optimizedAuthorData.bio
    ? optimizedAuthorData.bio.substring(0, 160)
    : `${authorData.books_count} كتاب متاح للقراءة والتحميل المجاني`;

  const canonicalAuthorUrl = `https://kotobi.xyz/author/${encodePathSegment(authorData.slug || authorData.name || authorIdentifier || "")}`;
  const authorImage = optimizedAuthorData.avatarUrl || "/default-author-avatar.png";

  const showVerifiedBadge =
    optimizedAuthorData.isVerified || isVerifiedAuthor || Boolean(authorData.is_verified);

  return (
    <>
      <Helmet>
        <title>{`كتب ${authorData.name} - ${authorBooks.length} كتاب | منصة كتبي`}</title>
        <meta
          name="description"
          content={`اكتشف ${authorBooks.length} كتاب للمؤلف ${authorData.name} على منصة كتبي. ${metaDescription}`}
        />
        <meta name="author" content={authorData.name} />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={canonicalAuthorUrl} />
        <meta property="og:title" content={`كتب ${authorData.name} | منصة كتبي`} />
        <meta
          property="og:description"
          content={`اكتشف كتب ومؤلفات ${authorData.name} على منصة كتبي.`}
        />
        <meta property="og:image" content={authorImage} />
        <meta property="og:url" content={canonicalAuthorUrl} />
        <meta property="og:type" content="profile" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background pb-safe-bottom">
        <Navbar />

        <main className="flex-grow py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* بطاقة معلومات المؤلف - بنفس تصميم صفحة المستخدم */}
            <Card className="mb-8 overflow-hidden bg-card/90 backdrop-blur-md border-border/40 rounded-2xl shadow-md">
              <CardContent className="p-5 md:p-6 text-center">
                <div className="mb-4">
                  <Avatar className="w-24 h-24 md:w-28 md:h-28 mx-auto bg-card/70 backdrop-blur-sm ring-4 ring-primary/20">
                    <AvatarImage
                      src={optimizedAuthorData.avatarUrl}
                      alt={`صورة المؤلف ${authorData.name}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {getInitials(authorData.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    {authorData.name}
                  </h1>
                  {showVerifiedBadge && (
                    <VerifiedIcon size={22} className="flex-shrink-0 w-5 h-5" />
                  )}
                </div>

                {/* آخر نشاط */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-4">
                  <Clock className="w-4 h-4" />
                  <span>{getLastSeenText(authorLastSeen)}</span>
                </div>

                {/* الموقع والتاريخ */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-sm mb-5">
                  {authorData.country_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{authorData.country_name}</span>
                    </div>
                  )}
                  {authorData.created_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        انضم {format(new Date(authorData.created_at), "MMMM yyyy", { locale: ar })}
                      </span>
                    </div>
                  )}
                </div>

                {/* الإحصائيات */}
                <div className="flex justify-center items-center gap-6 text-muted-foreground text-sm mb-5">
                  <div className="text-center">
                    <span className="block font-bold text-lg text-foreground">
                      {authorBooks.length}
                    </span>
                    <span>كتاب</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-lg text-foreground">
                      {formatViewCount(authorData.total_views)}
                    </span>
                    <span>مشاهدة</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-lg text-foreground">
                      {followersCount?.toLocaleString("ar") || 0}
                    </span>
                    <span>متابع</span>
                  </div>
                </div>

                {/* أزرار المتابعة والمراسلة */}
                {!followInitialLoading &&
                  (shouldShowFollowButton ||
                    (user && authorData.user_id && user.id !== authorData.user_id)) && (
                    <div className="flex items-center justify-center gap-3 mb-5">
                      {shouldShowFollowButton && (
                        <FollowOptionsPopover
                          isFollowing={isFollowing}
                          loading={followLoading}
                          onFollowOnSite={toggleFollow}
                          authorName={authorData.name}
                          socialLinks={authorSocialLinks}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-8 rounded-full text-base shadow-md"
                          hideText={false}
                        />
                      )}

                      {/* زر المراسلة */}
                      {authorData.user_id && (
                        <MessageButton
                          targetUserId={authorData.user_id}
                          targetUsername={authorData.name}
                          allowMessaging={authorData.allow_messaging !== false}
                          className="font-bold py-2 px-6 rounded-full text-base shadow-md"
                        />
                      )}
                    </div>
                  )}

                {/* البايو */}
                {optimizedAuthorData.bio ? (
                  <p className="text-foreground text-sm leading-relaxed max-w-xl mx-auto">
                    <ResponsiveDescription
                      text={optimizedAuthorData.bio}
                      lineClamp={15}
                      className="text-foreground text-sm leading-relaxed"
                      showMoreLabel="عرض المزيد"
                      showLessLabel="عرض أقل"
                    />
                  </p>
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    لا توجد معلومات إضافية عن هذا المؤلف
                  </p>
                )}

                {/* رابط الموقع */}
                {authorData.website && (
                  <a
                    href={
                      authorData.website.startsWith("http")
                        ? authorData.website
                        : `https://${authorData.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-3 text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    {authorData.website}
                  </a>
                )}
              </CardContent>
            </Card>

            {/* التبويبات */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <ProfileSectionTabs
                booksCount={authorBooks.length}
                quotesCount={quotes.length}
                reviewsCount={reviews.length}
              />

              {/* قسم الكتب */}
              <TabsContent value="books">
                {booksLoading ? (
                  <div
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 justify-items-end"
                    dir="rtl"
                  >
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="bg-card/70 backdrop-blur-sm border border-border/30 rounded-lg overflow-hidden animate-pulse w-full"
                      >
                        <div className="aspect-[3/4] bg-muted/50"></div>
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-3/4 mr-auto"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : authorBooks.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6" dir="rtl">
                    {authorBooks.map((book) => (
                      <SimpleBookCard
                        key={book.id}
                        id={book.id}
                        title={book.title}
                        author={book.author}
                        cover_image={book.cover_image_url}
                        category={book.category}
                        created_at={book.created_at}
                        display_only={book.display_only}
                        onNavigate={handleBookNavigate}
                        rating={book.rating}
                        bookStats={getBookStats(book.id)}
                      />
                    ))}
                    {hasMore && (
                      <div
                        ref={loadingRef}
                        className="col-span-2 md:col-span-4 flex justify-center items-center py-8"
                      >
                        <LoaderCircle className="h-8 w-8 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-lg">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      لا توجد كتب متاحة حالياً
                    </h3>
                    <p className="text-muted-foreground">
                      لم يتم العثور على كتب لهذا المؤلف في الوقت الحالي
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* قسم المراجعات */}
              <TabsContent value="reviews">
                {reviews.length > 0 ? (
                  <div className="space-y-4" dir="rtl">
                    {reviews.map((review) => (
                      <Card
                        key={review.id}
                        className="bg-card/90 backdrop-blur-sm border-border/40"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-row-reverse gap-4">
                            {review.book_cover_url && (
                              <Link
                                to={`/book/${review.book_slug || review.book_id}`}
                                className="flex-shrink-0"
                              >
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
                              <UnifiedProfileLink
                                userId={review.user_id}
                                username={review.reviewer_username}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                              >
                                بواسطة: {review.reviewer_username}
                              </UnifiedProfileLink>
                              <div className="flex items-center gap-2 my-2 justify-end flex-row-reverse">
                                <div className="flex flex-row-reverse">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${star <= review.rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-medium text-primary">
                                  {review.rating}/5
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(review.created_at), {
                                    addSuffix: true,
                                    locale: ar,
                                  })}
                                </span>
                              </div>
                              {review.comment && (
                                <p className="text-foreground text-sm">{review.comment}</p>
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
                    <p className="text-muted-foreground">
                      لم يتم كتابة أي مراجعات لكتب هذا المؤلف بعد
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* قسم الاقتباسات */}
              <TabsContent value="quotes">
                {quotes.length > 0 ? (
                  <div className="space-y-4" dir="rtl">
                    {quotes.map((quote) => (
                      <Card
                        key={quote.id}
                        className="bg-card/90 backdrop-blur-sm border-border/40 overflow-hidden"
                      >
                        <CardContent className="p-5">
                          <div className="relative mb-4">
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-transparent rounded-full" />
                            <blockquote className="pr-5 text-right">
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
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl flex-row-reverse">
                            <div className="flex items-center gap-3 flex-row-reverse">
                              {quote.book_cover_url && (
                                <Link to={`/book/${quote.book_slug || quote.book_id}`}>
                                  <img
                                    src={quote.book_cover_url}
                                    alt={quote.book_title}
                                    className="w-10 h-14 object-cover rounded-lg shadow-md hover:scale-105 transition-transform"
                                  />
                                </Link>
                              )}
                              <div className="text-right">
                                <Link
                                  to={`/book/${quote.book_slug || quote.book_id}`}
                                  className="font-semibold text-foreground hover:text-primary transition-colors text-sm"
                                >
                                  {quote.book_title}
                                </Link>
                                {quote.book_category && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs mt-1 block w-fit mr-auto"
                                  >
                                    {getCategoryInArabic(quote.book_category)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <UnifiedProfileLink
                              userId={quote.user_id}
                              username={quote.quoter_username}
                              className="text-xs text-muted-foreground hover:text-primary"
                            >
                              {quote.quoter_username}
                            </UnifiedProfileLink>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-lg">
                    <QuoteIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد اقتباسات</h3>
                    <p className="text-muted-foreground">
                      لم يتم إضافة أي اقتباسات من كتب هذا المؤلف بعد
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

const AuthorPageWithErrorBoundary = () => (
  <AuthorPageErrorBoundary>
    <AuthorPage />
  </AuthorPageErrorBoundary>
);

export default AuthorPageWithErrorBoundary;
