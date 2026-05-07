import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, AlertCircle, Clock, UserCheck, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import BookSubmissionForm from '@/components/books/BookSubmissionForm';
import { useAuth } from '@/context/AuthContext';


const UploadBook: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();




  const handleLoginRedirect = () => {
    navigate('/auth');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEOHead
          title="انشر كتابك - منصة كتبي"
          description="ارفع كتابك وشاركه مع مجتمع القراء. تتم مراجعة الكتاب والموافقة عليه قبل النشر."
          keywords="انشر كتابك, رفع كتاب, نشر كتاب, مشاركة كتاب, منصة كتبي"
          canonical="https://kotobi.xyz/upload-book"
        />
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-6">
          <div className="container mx-auto px-3">
            <Card className="max-w-sm mx-auto border-0 shadow-xl bg-card backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="mb-4">
                  <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-black mb-1 text-foreground">رفع كتاب جديد</h2>
                  <p className="text-sm text-foreground font-black mb-4">
                    شارك كتابك مع مجتمع القراء واجعله متاحاً للجميع
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border">
                    <UserCheck className="h-4 w-4 text-foreground" />
                    <span className="text-xs text-foreground font-black">
                      مراجعة مهنية للكتب
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border">
                    <Clock className="h-4 w-4 text-foreground" />
                    <span className="text-xs text-foreground font-black">
                      نشر سريع خلال 72 ساعة
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border">
                    <AlertCircle className="h-4 w-4 text-foreground" />
                    <span className="text-xs text-foreground font-black">
                      متابعة حالة الكتاب
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-muted border border-border rounded-lg mb-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <LogIn className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-black text-foreground">
                      يتطلب تسجيل الدخول
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-black">
                    يجب تسجيل الدخول أولاً لتتمكن من رفع كتابك ومتابعة حالة المراجعة
                  </p>
                </div>

                <Button 
                  onClick={handleLoginRedirect}
                  className="w-full bg-primary hover:bg-primary/90 text-foreground font-black"
                  size="sm"
                >
                  <LogIn className="ml-2 h-4 w-4" />
                  سجل الدخول لرفع كتاب
                </Button>

                <p className="text-xs text-foreground font-black mt-3">
                  ليس لديك حساب؟ يمكنك إنشاء حساب جديد من صفحة تسجيل الدخول
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="انشر كتابك - منصة كتبي"
        description="ارفع كتابك وشاركه مع مجتمع القراء. تتم مراجعة الكتاب والموافقة عليه قبل النشر."
        keywords="انشر كتابك, رفع كتاب, نشر كتاب, مشاركة كتاب, منصة كتبي"
        canonical="https://kotobi.xyz/upload-book"
      />
      <Navbar />

      <main className="flex-grow py-3">
        <div className="container mx-auto px-2">
          <div className="text-center mb-3">
            <h1 className="text-base font-black mb-1 text-foreground">رفع الكتب</h1>
            <p className="text-xs text-foreground font-black max-w-lg mx-auto">
              ارفع كتابك وشاركه مع المجتمع
            </p>
          </div>

          {/* بانر مصمم الأغلفة */}
          <div className="max-w-3xl mx-auto mb-3">
            <div
              onClick={() => navigate('/cover-designer')}
              className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-lg">🎨</span>
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm font-black text-foreground">صمّم غلاف كتابك بنفسك!</p>
                <p className="text-xs text-muted-foreground">استخدم مصمم الأغلفة المتقدم لإنشاء غلاف احترافي لكتابك قبل رفعه</p>
              </div>
              <span className="text-primary text-lg">←</span>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="upload-form-card border-border" data-form-type="book-submission">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-1.5 text-foreground font-black text-sm">
                  <Upload className="h-3.5 w-3.5" />
                  رفع كتاب جديد
                </CardTitle>
                <CardDescription className="text-foreground font-black text-xs">
                  املأ البيانات المطلوبة. سيتم مراجعة الكتاب قبل النشر.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 py-2">
                <BookSubmissionForm onSuccess={() => {
                  // تم رفع الكتاب بنجاح
                }} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UploadBook;