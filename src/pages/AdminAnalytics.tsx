import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen, Users, Eye, Download, Star, TrendingUp,
  BarChart3, PieChart, Activity, RefreshCw, ArrowLeft,
  Clock, Heart, MessageSquare, Globe, Layers, Shield
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const COLORS = [
  'hsl(142, 71%, 45%)', 'hsl(217, 91%, 60%)', 'hsl(280, 68%, 60%)',
  'hsl(24, 95%, 53%)', 'hsl(346, 77%, 50%)', 'hsl(48, 96%, 53%)',
  'hsl(173, 58%, 39%)', 'hsl(199, 89%, 48%)'
];

interface OverviewStats {
  totalBooks: number;
  totalUsers: number;
  totalViews: number;
  totalDownloads: number;
  totalReviews: number;
  totalAuthors: number;
  totalQuotes: number;
  totalLikes: number;
  pendingSubmissions: number;
  approvedBooks: number;
  rejectedBooks: number;
}

interface CategoryData { name: string; count: number; }
interface TimelineData { date: string; books: number; users: number; }
interface LanguageData { name: string; count: number; }
interface TopBook { title: string; author: string; views: number; rating: number; }

const AdminAnalytics: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckDone, setAdminCheckDone] = useState(false);

  const [overview, setOverview] = useState<OverviewStats>({
    totalBooks: 0, totalUsers: 0, totalViews: 0, totalDownloads: 0,
    totalReviews: 0, totalAuthors: 0, totalQuotes: 0, totalLikes: 0,
    pendingSubmissions: 0, approvedBooks: 0, rejectedBooks: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [languageData, setLanguageData] = useState<LanguageData[]>([]);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [submissionStatusData, setSubmissionStatusData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    checkAdmin();
  }, [user, authLoading]);

  const checkAdmin = async () => {
    if (!user?.email) return;
    const { data } = await supabase.rpc('is_admin_user', { user_email: user.email });
    if (data) {
      setIsAdmin(true);
      setAdminCheckDone(true);
      fetchAllData();
    } else {
      setAdminCheckDone(true);
      navigate('/');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchCategoryData(),
      fetchLanguageData(),
      fetchTopBooks(),
      fetchTimeline(),
    ]);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const fetchOverview = async () => {
    const [
      booksRes, usersRes, authorsRes, reviewsRes,
      likesRes, pendingRes, approvedRes, rejectedRes,
    ] = await Promise.all([
      supabase.from('book_submissions').select('id, views', { count: 'exact' }).eq('status', 'approved'),
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('authors').select('id', { count: 'exact' }),
      supabase.from('book_reviews').select('id', { count: 'exact' }),
      supabase.from('book_likes').select('id', { count: 'exact' }),
      supabase.from('book_submissions').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('book_submissions').select('id', { count: 'exact' }).eq('status', 'approved'),
      supabase.from('book_submissions').select('id', { count: 'exact' }).eq('status', 'rejected'),
    ]);

    const totalViews = (booksRes.data || []).reduce((sum, b) => sum + (b.views || 0), 0);

    setOverview({
      totalBooks: booksRes.count || 0,
      totalUsers: usersRes.count || 0,
      totalViews,
      totalDownloads: 0,
      totalReviews: reviewsRes.count || 0,
      totalAuthors: authorsRes.count || 0,
      totalQuotes: 0,
      totalLikes: likesRes.count || 0,
      pendingSubmissions: pendingRes.count || 0,
      approvedBooks: approvedRes.count || 0,
      rejectedBooks: rejectedRes.count || 0,
    });

    setSubmissionStatusData([
      { name: 'مقبولة', value: approvedRes.count || 0 },
      { name: 'مرفوضة', value: rejectedRes.count || 0 },
      { name: 'قيد الانتظار', value: pendingRes.count || 0 },
    ]);
  };

  const fetchCategoryData = async () => {
    const { data } = await supabase
      .from('book_submissions')
      .select('category')
      .eq('status', 'approved');

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(b => { counts[b.category] = (counts[b.category] || 0) + 1; });
      const categoryMap: Record<string, string> = {
        novels: 'روايات', poetry: 'شعر', religious: 'دينية', scientific: 'علمية',
        historical: 'تاريخية', philosophy: 'فلسفة', 'self-help': 'تنمية ذاتية',
        technology: 'تكنولوجيا', prose: 'نثر', other: 'أخرى',
      };
      setCategoryData(
        Object.entries(counts)
          .map(([k, v]) => ({ name: categoryMap[k] || k, count: v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      );
    }
  };

  const fetchLanguageData = async () => {
    const { data } = await supabase
      .from('book_submissions')
      .select('language')
      .eq('status', 'approved');

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(b => { counts[b.language] = (counts[b.language] || 0) + 1; });
      const langMap: Record<string, string> = {
        arabic: 'العربية', english: 'الإنجليزية', french: 'الفرنسية',
        spanish: 'الإسبانية', german: 'الألمانية',
      };
      setLanguageData(
        Object.entries(counts)
          .map(([k, v]) => ({ name: langMap[k] || k, count: v }))
          .sort((a, b) => b.count - a.count)
      );
    }
  };

  const fetchTopBooks = async () => {
    const { data } = await supabase
      .from('book_submissions')
      .select('title, author, views, rating')
      .eq('status', 'approved')
      .order('views', { ascending: false })
      .limit(10);

    if (data) {
      setTopBooks(data.map(b => ({
        title: b.title,
        author: b.author,
        views: b.views || 0,
        rating: Number(b.rating) || 0,
      })));
    }
  };

  const fetchTimeline = async () => {
    const { data: booksData } = await supabase
      .from('book_submissions')
      .select('created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    const { data: usersData } = await supabase
      .from('profiles')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (booksData && usersData) {
      const monthMap: Record<string, { books: number; users: number }> = {};
      booksData.forEach(b => {
        const m = b.created_at.substring(0, 7);
        if (!monthMap[m]) monthMap[m] = { books: 0, users: 0 };
        monthMap[m].books++;
      });
      usersData.forEach(u => {
        const m = u.created_at.substring(0, 7);
        if (!monthMap[m]) monthMap[m] = { books: 0, users: 0 };
        monthMap[m].users++;
      });
      setTimelineData(
        Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([date, v]) => ({
            date: new Date(date + '-01').toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' }),
            ...v,
          }))
      );
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size="lg" color="red" />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'إجمالي الكتب', value: overview.totalBooks, icon: BookOpen, color: 'text-blue-500' },
    { label: 'المستخدمون', value: overview.totalUsers, icon: Users, color: 'text-emerald-500' },
    { label: 'المشاهدات', value: overview.totalViews, icon: Eye, color: 'text-purple-500' },
    { label: 'المراجعات', value: overview.totalReviews, icon: Star, color: 'text-yellow-500' },
    { label: 'الإعجابات', value: overview.totalLikes, icon: Heart, color: 'text-red-500' },
    { label: 'المؤلفون', value: overview.totalAuthors, icon: Globe, color: 'text-cyan-500' },
    { label: 'قيد الانتظار', value: overview.pendingSubmissions, icon: Clock, color: 'text-orange-500' },
    { label: 'مرفوضة', value: overview.rejectedBooks, icon: Shield, color: 'text-rose-500' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/books')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                لوحة التحليلات
              </h1>
              <p className="text-sm text-muted-foreground">إحصائيات شاملة عن المنصة</p>
            </div>
          </div>
          <Button onClick={refresh} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ml-1 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <Badge variant="secondary" className="text-xs">{stat.label}</Badge>
                </div>
                <p className="text-2xl font-black text-foreground">
                  {stat.value.toLocaleString('ar-SA')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="charts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="charts" className="font-bold">
              <BarChart3 className="h-4 w-4 ml-1" /> الرسوم البيانية
            </TabsTrigger>
            <TabsTrigger value="top" className="font-bold">
              <TrendingUp className="h-4 w-4 ml-1" /> الأكثر مشاهدة
            </TabsTrigger>
            <TabsTrigger value="timeline" className="font-bold">
              <Activity className="h-4 w-4 ml-1" /> النمو الزمني
            </TabsTrigger>
          </TabsList>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category Distribution */}
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    توزيع التصنيفات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryData} layout="vertical" margin={{ right: 20, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="count" name="عدد الكتب" radius={[0, 6, 6, 0]}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Submission Status Pie */}
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" />
                    حالة الطلبات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPie>
                      <Pie
                        data={submissionStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="hsl(142, 71%, 45%)" />
                        <Cell fill="hsl(346, 77%, 50%)" />
                        <Cell fill="hsl(48, 96%, 53%)" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Language Distribution */}
              <Card className="border border-border lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    توزيع اللغات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={languageData} margin={{ right: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      />
                      <Bar dataKey="count" name="عدد الكتب" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Top Books Tab */}
          <TabsContent value="top">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  أكثر 10 كتب مشاهدة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topBooks.map((book, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{book.views.toLocaleString('ar-SA')}</span>
                        </div>
                        {book.rating > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-3.5 w-3.5 fill-yellow-500" />
                            <span>{book.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {topBooks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  نمو الكتب والمستخدمين (آخر 12 شهراً)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={timelineData} margin={{ right: 20, left: 20 }}>
                    <defs>
                      <linearGradient id="colorBooks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="books"
                      name="كتب جديدة"
                      stroke="hsl(217, 91%, 60%)"
                      fillOpacity={1}
                      fill="url(#colorBooks)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="مستخدمون جدد"
                      stroke="hsl(142, 71%, 45%)"
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
