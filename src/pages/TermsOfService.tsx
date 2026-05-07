
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Shield, AlertTriangle, BookOpen, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';

const TermsOfService = () => {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="شروط الاستخدام - منصة كتبي"
        description="اطلع على شروط وأحكام استخدام منصة كتبي. القواعد والشروط التي تحكم استخدام موقعنا وخدماتنا."
        keywords="شروط الاستخدام, أحكام الموقع, قوانين التسجيل, منصة كتبي, سياسة الموقع"
        canonical="https://kotobi.xyz/terms-of-service"
      />
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-safe-bottom">
        <div className="text-center mb-8">
          <FileText className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {language === 'ar' ? 'شروط الاستخدام' : 'Terms of Service'}
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            {language === 'ar'
              ? 'القواعد والشروط التي تحكم استخدام منصة كتبي'
              : 'The rules and terms governing the use of Kotobi platform'
            }
          </p>

          {/* Language Toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant={language === 'ar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('ar')}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              العربية
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('en')}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              English
            </Button>
          </div>
        </div>

        <Card className="mb-32 md:mb-8 bg-card text-card-foreground border-border">
          <CardContent className="prose max-w-none text-foreground p-8">
            {language === 'ar' ? (
              <div className="space-y-6 text-sm leading-relaxed" dir="rtl">
                <h1 className="text-2xl font-bold text-foreground">شروط الاستخدام</h1>
                <p>آخر تحديث: {new Date().toLocaleDateString('ar-SA')}</p>

                <h2 className="text-xl font-semibold text-foreground mt-6">مقدمة</h2>
                <p>
                  مرحباً بك في منصة "كتبي". هذه الشروط والأحكام تحكم استخدامك لموقعنا الإلكتروني وخدماتنا. 
                  باستخدام موقعنا، فإنك توافق على الالتزام بهذه الشروط.
                </p>
                <p>إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام موقعنا.</p>

                <h2 className="text-xl font-semibold text-foreground mt-6">التسجيل والحسابات</h2>
                <h3 className="text-lg font-medium text-foreground">شروط التسجيل:</h3>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يجب أن تكون 13 عاماً أو أكثر للتسجيل</li>
                  <li>يجب تقديم معلومات دقيقة وصحيحة</li>
                  <li>أنت مسؤول عن الحفاظ على أمان حسابك</li>
                  <li>حساب واحد فقط لكل مستخدم</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-4">مسؤوليات المستخدم:</h3>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>الحفاظ على سرية كلمة المرور</li>
                  <li>إخطارنا فوراً في حالة اختراق الحساب</li>
                  <li>تحديث المعلومات الشخصية عند الحاجة</li>
                  <li>عدم مشاركة الحساب مع آخرين</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">الاستخدام المقبول</h2>
                <h3 className="text-lg font-medium text-foreground">يُسمح لك بـ:</h3>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>تصفح وقراءة الكتب المتاحة</li>
                  <li>إنشاء مكتبة شخصية وقوائم القراءة</li>
                  <li>كتابة مراجعات وتقييمات للكتب</li>
                  <li>مشاركة التوصيات مع المستخدمين الآخرين</li>
                  <li>تحميل الكتب للقراءة الشخصية</li>
                </ul>

                <h3 className="text-lg font-medium text-destructive mt-4">يُمنع عليك:</h3>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>انتهاك حقوق الطبع والنشر</li>
                  <li>رفع محتوى مسيء أو غير قانوني</li>
                  <li>محاولة اختراق أو إلحاق الضرر بالموقع</li>
                  <li>استخدام الموقع لأغراض تجارية دون إذن</li>
                  <li>إنشاء حسابات وهمية أو متعددة</li>
                  <li>نسخ أو توزيع المحتوى دون إذن</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">المحتوى والملكية الفكرية</h2>
                <h3 className="text-lg font-medium text-foreground">حقوق الطبع والنشر:</h3>
                <p>
                  جميع الكتب والمحتوى المتاح على منصتنا محمي بحقوق الطبع والنشر. 
                  نحن نحترم حقوق المؤلفين والناشرين ونلتزم بقوانين الملكية الفكرية.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4">المحتوى الذي ينشئه المستخدم:</h3>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>تحتفظ بحقوق المحتوى الذي تنشئه (مراجعات، تعليقات)</li>
                  <li>تمنحنا ترخيصاً لاستخدام وعرض محتواك على المنصة</li>
                  <li>أنت مسؤول عن المحتوى الذي تنشره</li>
                  <li>نحتفظ بالحق في إزالة المحتوى المخالف</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">إخلاء المسؤولية</h2>
                <p>نقدم خدماتنا "كما هي" دون أي ضمانات صريحة أو ضمنية. نحن لا نضمن:</p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>استمرارية الخدمة دون انقطاع</li>
                  <li>دقة أو اكتمال المعلومات</li>
                  <li>خلو الموقع من الأخطاء أو الفيروسات</li>
                  <li>ملاءمة الخدمة لاحتياجاتك الخاصة</li>
                </ul>
                <p className="mt-4">لن نكون مسؤولين عن أي أضرار مباشرة أو غير مباشرة قد تنتج عن استخدام موقعنا.</p>

                <h2 className="text-xl font-semibold text-foreground mt-6">التعديل والإنهاء</h2>
                <h3 className="text-lg font-medium text-foreground">تعديل الشروط:</h3>
                <p>
                  نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إشعارك بالتغييرات الجوهرية 
                  عبر البريد الإلكتروني أو إشعار على الموقع.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4">إنهاء الحساب:</h3>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يمكنك إغلاق حسابك في أي وقت</li>
                  <li>نحتفظ بالحق في تعليق أو إغلاق الحسابات المخالفة</li>
                  <li>ستبقى هذه الشروط سارية حتى بعد إنهاء الحساب</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">اتصل بنا</h2>
                <p>إذا كان لديك أي أسئلة حول هذه الشروط، يمكنك الاتصال بنا:</p>
                <ul className="list-disc list-inside mr-4">
                  <li>عبر البريد الإلكتروني: suportkotobi@gmail.com</li>
                  <li>الموقع الإلكتروني: <a href="https://kotobi.xyz/" target="_blank" className="text-primary hover:underline">kotobi.xyz</a></li>
                </ul>
              </div>
            ) : (
              <div className="space-y-6 text-sm leading-relaxed">
                <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
                <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                <h2 className="text-xl font-semibold text-foreground mt-6">Introduction</h2>
                <p>
                  Welcome to "Kotobi". These terms and conditions govern your use of our website and services. 
                  By using our website, you agree to comply with these terms.
                </p>
                <p>If you do not agree with these terms, please do not use our website.</p>

                <h2 className="text-xl font-semibold text-foreground mt-6">Registration and Accounts</h2>
                <h3 className="text-lg font-medium text-foreground">Registration Requirements:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You must be 13 years or older to register</li>
                  <li>You must provide accurate and correct information</li>
                  <li>You are responsible for maintaining your account security</li>
                  <li>Only one account per user</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-4">User Responsibilities:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Maintaining password confidentiality</li>
                  <li>Notifying us immediately in case of account breach</li>
                  <li>Updating personal information when needed</li>
                  <li>Not sharing the account with others</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">Acceptable Use</h2>
                <h3 className="text-lg font-medium text-foreground">You are allowed to:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Browse and read available books</li>
                  <li>Create a personal library and reading lists</li>
                  <li>Write reviews and rate books</li>
                  <li>Share recommendations with other users</li>
                  <li>Download books for personal reading</li>
                </ul>

                <h3 className="text-lg font-medium text-destructive mt-4">You are prohibited from:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Violating copyright laws</li>
                  <li>Uploading offensive or illegal content</li>
                  <li>Attempting to hack or damage the website</li>
                  <li>Using the site for commercial purposes without permission</li>
                  <li>Creating fake or multiple accounts</li>
                  <li>Copying or distributing content without permission</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">Content and Intellectual Property</h2>
                <h3 className="text-lg font-medium text-foreground">Copyright:</h3>
                <p>
                  All books and content available on our platform are protected by copyright. 
                  We respect the rights of authors and publishers and comply with intellectual property laws.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4">User-Generated Content:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You retain rights to the content you create (reviews, comments)</li>
                  <li>You grant us a license to use and display your content on the platform</li>
                  <li>You are responsible for the content you publish</li>
                  <li>We reserve the right to remove violating content</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">Disclaimer</h2>
                <p>We provide our services "as is" without any express or implied warranties. We do not guarantee:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Uninterrupted service continuity</li>
                  <li>Accuracy or completeness of information</li>
                  <li>The website is free from errors or viruses</li>
                  <li>Suitability of the service for your specific needs</li>
                </ul>
                <p className="mt-4">We will not be liable for any direct or indirect damages that may result from using our website.</p>

                <h2 className="text-xl font-semibold text-foreground mt-6">Modification and Termination</h2>
                <h3 className="text-lg font-medium text-foreground">Terms Modification:</h3>
                <p>
                  We reserve the right to modify these terms at any time. You will be notified of material changes 
                  via email or a notification on the website.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4">Account Termination:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You can close your account at any time</li>
                  <li>We reserve the right to suspend or close violating accounts</li>
                  <li>These terms will remain effective even after account termination</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">Contact Us</h2>
                <p>If you have any questions about these terms, you can contact us:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>Email: suportkotobi@gmail.com</li>
                  <li>Website: <a href="https://kotobi.xyz/" target="_blank" className="text-primary hover:underline">kotobi.xyz</a></li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
