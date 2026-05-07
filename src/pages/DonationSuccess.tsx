import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, CheckCircle, ArrowRight, Home, Book } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

const DonationSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // التحقق من صحة الوصول للصفحة
  useEffect(() => {
    // التحقق من وجود معاملات PayPal أو رمز التبرع في sessionStorage
    const paypalTxnId = searchParams.get('tx') || searchParams.get('txn_id');
    const paypalStatus = searchParams.get('st') || searchParams.get('payment_status');
    const donationToken = sessionStorage.getItem('donation_initiated');
    
    // إذا لم توجد أي من علامات التبرع الصحيحة، إعادة توجيه للصفحة الرئيسية
    if (!paypalTxnId && !paypalStatus && !donationToken) {
      navigate('/', { replace: true });
      return;
    }
    
    // مسح رمز التبرع من sessionStorage بعد الاستخدام
    if (donationToken) {
      sessionStorage.removeItem('donation_initiated');
    }

    // تشغيل صوت النجاح فقط للمتبرعين الحقيقيين
    const audio = new Audio('/click-sound.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // تجاهل الأخطاء إذا لم يستطع تشغيل الصوت
    });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-background to-primary/5">
      <SEOHead 
        title="نجح التبرع - شكراً لدعمك | مكتبة كتبي"
        description="شكراً لك على تبرعك الكريم. تبرعك يساعد في الحفاظ على مكتبة الكتب المجانية وتوفير المحتوى التعليمي للجميع."
        canonical="/donation-success"
      />
      
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        {/* أيقونة النجاح الرئيسية */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="p-6 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-6 animate-pulse">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto" />
            </div>
            {/* تأثير الدوائر المتحركة */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
              <div className="absolute inset-2 bg-green-400/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-4"
              style={{ 
                fontFamily: 'Tajawal, sans-serif',
                fontWeight: '400',
                fontSize: 'clamp(28px, 5vw, 40px)'
              }}>
            🎉 تم استلام تبرعك بنجاح!
          </h1>
          
          <p className="text-xl text-muted-foreground mb-6"
             style={{ 
               fontFamily: 'Tajawal, sans-serif',
               fontWeight: '400',
               fontSize: '20px',
               lineHeight: '1.8'
             }}>
            شكراً لك من أعماق قلوبنا على دعمك الكريم
          </p>
        </div>

        {/* بطاقة الشكر الرئيسية */}
        <Card className="mb-8 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-3 text-green-700 dark:text-green-300"
                       style={{ 
                         fontFamily: 'Tajawal, sans-serif',
                         fontWeight: '400',
                         fontSize: '24px'
                       }}>
              <Heart className="h-6 w-6 text-red-500 animate-bounce" />
              رسالة شكر وتقدير
              <Heart className="h-6 w-6 text-red-500 animate-bounce" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-foreground leading-relaxed"
               style={{ 
                 fontFamily: 'Tajawal, sans-serif',
                 fontWeight: '400',
                 fontSize: '18px',
                 lineHeight: '1.8'
               }}>
              تبرعك الكريم يساعدنا في:
            </p>
            
            <div className="grid gap-4 mt-6">
              <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/50">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Book className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-foreground" style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: '400' }}>
                  الحفاظ على مكتبة الكتب مجانية للجميع
                </span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/50">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-foreground" style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: '400' }}>
                  تطوير الموقع وإضافة مميزات جديدة
                </span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/50">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Heart className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-foreground" style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: '400' }}>
                  دعم المحتوى التعليمي المجاني
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* رسالة تشجيعية */}
        <div className="text-center p-6 bg-primary/10 rounded-lg border border-primary/20 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-3"
              style={{ 
                fontFamily: 'Tajawal, sans-serif',
                fontWeight: '400',
                fontSize: '22px'
              }}>
            🌟 أنت جزء من قصة نجاحنا
          </h2>
          <p className="text-foreground leading-relaxed"
             style={{ 
               fontFamily: 'Tajawal, sans-serif',
               fontWeight: '400',
               fontSize: '16px',
               lineHeight: '1.7'
             }}>
            بفضل أمثالك من المتبرعين الكرام، نستطيع الاستمرار في تقديم خدمة تعليمية مجانية عالية الجودة.
            تبرعك اليوم سيفيد آلاف القراء والباحثين عن المعرفة.
          </p>
        </div>

        {/* أزرار التنقل */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="default" size="lg" className="flex items-center gap-2">
            <Link to="/">
              <Home className="h-5 w-5" />
              العودة للصفحة الرئيسية
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="flex items-center gap-2">
            <Link to="/categories">
              <Book className="h-5 w-5" />
              تصفح المكتبة
            </Link>
          </Button>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: '400' }}>
            إذا كان لديك أي استفسارات، يمكنك <Link to="/contact" className="text-primary hover:underline">التواصل معنا</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DonationSuccess;