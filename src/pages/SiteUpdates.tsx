import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Calendar } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSiteUpdates } from '@/hooks/useSiteUpdates';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import kotobiTeamLogo from '@/assets/kotobi-team-logo.png';

const SiteUpdates: React.FC = () => {
  const { updates, loading, error } = useSiteUpdates();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysOfWeek = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];
    const monthsOfYear = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const dayName = daysOfWeek[date.getDay()];
    const monthName = monthsOfYear[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${dayName}، ${day} ${monthName} ${year} - ${hours}:${minutes}`;
  };

  return (
    <>
      <Helmet>
        <title>تحديثات الموقع - كتبي</title>
        <meta name="description" content="آخر تحديثات وأخبار موقع كتبي - مكتبة كتبي الرقمية" />
        <meta property="og:title" content="تحديثات الموقع - كتبي" />
        <meta property="og:description" content="آخر تحديثات وأخبار موقع كتبي - مكتبة كتبي الرقمية" />
      </Helmet>
      
      <Navbar />
      
      <main className="flex-1 bg-books-background">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Megaphone className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">تحديثات الموقع</h1>
              </div>
              <p className="text-muted-foreground">
                آخر الأخبار والتحديثات من فريق كتبي
              </p>
            </div>

            {/* Updates List */}
            {loading ? (
              <Card className="mb-6">
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-pulse space-y-4 w-full">
                      <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="mb-6">
                <CardContent className="py-8 text-center">
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            ) : updates.length === 0 ? (
              <Card className="mb-6">
                <CardContent className="py-8 text-center">
                  <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">لا توجد تحديثات حالياً</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {updates.map((update) => (
                  <Card key={update.id} className="shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(update.created_at)}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={kotobiTeamLogo} alt="فريق كتبي" />
                          <AvatarFallback>ك</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-foreground">فريق كتبي</h4>
                          <p className="text-sm text-primary">📢 {update.title}</p>
                        </div>
                      </div>
                      
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap text-right" dir="rtl">
                        {update.message}
                      </p>
                      {(update as any).image_url && (
                        <img src={(update as any).image_url} alt={update.title} className="mt-3 w-full rounded-lg border" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Info Card */}
            <Card className="border-primary/20 mt-6">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-3 text-primary/60" />
                  <h3 className="font-semibold mb-2">عن تحديثات الموقع</h3>
                  <p className="text-sm leading-relaxed">
                    نبقيك على اطلاع بآخر التحديثات والميزات الجديدة في موقع كتبي.
                    تابع هذه الصفحة لمعرفة كل جديد.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="page-with-bottom-nav">
          <Footer />
        </div>
      </main>
    </>
  );
};

export default SiteUpdates;
