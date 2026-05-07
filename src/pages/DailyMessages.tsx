import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, BookOpen, Calendar } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useDailyMessage } from '@/hooks/useDailyMessage';
import { toast } from '@/components/ui/use-toast';
import { toLatinDigits } from '@/utils/numberUtils';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import kotobiTeamLogo from '@/assets/kotobi-team-logo.png';

const DailyMessages: React.FC = () => {
  const { message, loading, error, refetch } = useDailyMessage();

  const handleRefresh = () => {
    refetch();
    toast({
      title: "جاري التحديث",
      description: "يتم تحديث الرسالة اليومية...",
    });
  };

  return (
    <>
      <Helmet>
        <title>الرسائل اليومية - كتبي</title>
        <meta name="description" content="رسائل تحفيزية يومية للقراء - مكتبة كتبي الرقمية" />
        <meta property="og:title" content="الرسائل اليومية - كتبي" />
        <meta property="og:description" content="رسائل تحفيزية يومية للقراء - مكتبة كتبي الرقمية" />
      </Helmet>
      
      <Navbar />
      
      <main className="flex-1 bg-books-background">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">الرسائل اليومية</h1>
              </div>
              <p className="text-muted-foreground">
                رسائل تحفيزية يومية لتذكيرك بأهمية القراءة وقوة الكلمة
              </p>
            </div>

            {/* Main Message Card */}
            <Card className="mb-6 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <Calendar className="h-5 w-5 text-primary" />
                  رسالة اليوم
                </CardTitle>
                {message && (
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const date = new Date(message.date);
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
                      
                      return `${dayName}، ${day} ${monthName} ${year}`;
                    })()}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="text-center">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span>جاري تحميل الرسالة...</span>
                  </div>
                ) : error ? (
                  <div className="py-8">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button onClick={handleRefresh} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      إعادة المحاولة
                    </Button>
                  </div>
                ) : message ? (
                  <div className="py-4">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={kotobiTeamLogo} alt="فريق كتبي" />
                        <AvatarFallback>ك</AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <h4 className="font-semibold text-foreground">فريق كتبي</h4>
                        <p className="text-sm text-muted-foreground">مرسل الرسالة</p>
                      </div>
                    </div>
                    
                    <p className="text-lg leading-relaxed text-foreground mb-6 font-medium text-right" dir="rtl">
                      "{message.message}"
                    </p>
                    
                    {message.isDefault && (
                      <div className="text-sm text-muted-foreground mb-4">
                        رسالة افتراضية - سيتم تحديث الرسالة قريباً
                      </div>
                    )}
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        💡 رسالة واحدة يومية موحدة لجميع المستخدمين
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <p className="text-muted-foreground">لا توجد رسالة متاحة حالياً</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-primary/60" />
                  <h3 className="font-semibold mb-2">عن الرسائل اليومية</h3>
                  <p className="text-sm leading-relaxed">
                    نقدم لك كل يوم رسالة تحفيزية جديدة لتذكيرك بجمال القراءة وأهميتها في حياتنا.
                    هذه الرسائل مصممة لتلهمك وتحفزك على مواصلة رحلتك مع الكتب والمعرفة.
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

export default DailyMessages;