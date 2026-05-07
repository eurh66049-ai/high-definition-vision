
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Heart } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="من نحن - منصة كتبي"
        description="تعرف على منصة كتبي - المكتبة الرقمية العربية المجانية. رسالتنا هي جعل القراءة متاحة ومتعة للجميع من خلال منصة رقمية سهلة الاستخدام."
        keywords="من نحن, منصة كتبي, مكتبة رقمية عربية, رسالة الموقع, فريق كتبي"
        canonical="https://kotobi.xyz/about-us"
      />
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-safe-bottom">
        <div className="text-center mb-8">
          <BookOpen className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">من نحن</h1>
          <p className="text-muted-foreground text-lg">منصة كتبي - رحلتك نحو عالم القراءة والمعرفة</p>
        </div>


        <div className="space-y-6 mb-32 md:mb-8">
          <Card className="bg-card text-card-foreground border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Heart className="h-5 w-5 text-primary" />
                رسالتنا
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground leading-relaxed text-lg">
                نحن في منصة "كتبي" نؤمن بقوة الكتب في تغيير الحياة وإثراء العقول. رسالتنا هي جعل القراءة 
                متاحة ومتعة للجميع من خلال منصة رقمية سهلة الاستخدام تجمع أفضل الكتب العربية والعالمية.
              </p>
              <p className="text-foreground leading-relaxed text-lg">
                نسعى لبناء مجتمع قارئ يتشارك المعرفة والخبرات، ويساهم في نشر ثقافة القراءة في الوطن العربي.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground border-border">
            <CardHeader>
              <CardTitle className="text-foreground">قصتنا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground leading-relaxed">
                بدأت فكرة منصة "كتبي" من إيمان عميق بأن القراءة هي مفتاح التقدم والنهضة. 
                في عصر التكنولوجيا الرقمية، أردنا أن نجمع بين سحر الكتب التقليدية وسهولة التكنولوجيا الحديثة.
              </p>
              <p className="text-foreground leading-relaxed">
                تأسست منصتنا على يد مجموعة من المطورين والمثقفين الذين يشتركون في حب القراءة والرغبة في 
                نشر المعرفة. نعمل بجد لنكون الوجهة الأولى للقراء العرب في كل مكان.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground border-border">
            <CardHeader>
              <CardTitle className="text-foreground">رؤيتنا للمستقبل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground leading-relaxed">
                نطمح لأن نصبح المنصة الرقمية الأولى للقراءة في الوطن العربي، ونسعى لتطوير تقنيات جديدة 
                تجعل تجربة القراءة أكثر تفاعلية وإثراءً.
              </p>
              <p className="text-foreground leading-relaxed">
                نخطط لإضافة المزيد من الميزات مثل الكتب الصوتية، والقراءة التفاعلية، والنوادي الأدبية الافتراضية، 
                لنخلق تجربة قراءة شاملة ومتكاملة.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">انضم إلى رحلتنا</h2>
              <p className="text-lg opacity-90 mb-4">
                كن جزءاً من مجتمع القراء وساهم في نشر ثقافة القراءة
              </p>
              <p className="opacity-80">
                معاً نبني مستقبلاً أكثر ثقافة ومعرفة
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AboutUs;
