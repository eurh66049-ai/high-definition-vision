import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';

const PrivacyPolicy = () => {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="سياسة الخصوصية - منصة كتبي"
        description="اطلع على سياسة الخصوصية لمنصة كتبي. نحن ملتزمون بحماية خصوصيتك وبياناتك الشخصية وفقاً لأعلى معايير الأمان."
        keywords="سياسة الخصوصية, حماية البيانات, أمان المعلومات, منصة كتبي, خصوصية المستخدم"
        canonical="https://kotobi.xyz/privacy-policy"
      />
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-safe-bottom">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            {language === 'ar' 
              ? 'نحن ملتزمون بحماية خصوصيتك وبياناتك الشخصية'
              : 'We are committed to protecting your privacy and personal data'
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
                <h1 className="text-2xl font-bold text-foreground">سياسة الخصوصية</h1>
                <p>آخر تحديث: 5 يونيو 2025</p>
                <p>تصف سياسة الخصوصية هذه سياساتنا وإجراءاتنا حول جمع واستخدام والكشف عن معلوماتك عند استخدام الخدمة وتخبرك عن حقوق الخصوصية الخاصة بك وكيف يحميك القانون.</p>
                <p>نحن نستخدم بياناتك الشخصية لتوفير وتحسين الخدمة. باستخدام الخدمة، فإنك توافق على جمع واستخدام المعلومات وفقاً لسياسة الخصوصية هذه.</p>
                
                <h2 className="text-xl font-semibold text-foreground mt-6">التفسير والتعريفات</h2>
                <h3 className="text-lg font-medium text-foreground">التفسير</h3>
                <p>الكلمات التي يكون حرفها الأول كبيراً لها معاني محددة في الشروط التالية. التعريفات التالية سيكون لها نفس المعنى بغض النظر عما إذا كانت تظهر بصيغة المفرد أو الجمع.</p>
                
                <h3 className="text-lg font-medium text-foreground">التعريفات</h3>
                <p>لأغراض سياسة الخصوصية هذه:</p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li><strong>الحساب</strong> يعني حساباً فريداً تم إنشاؤه لك للوصول إلى خدمتنا أو أجزاء من خدمتنا.</li>
                  <li><strong>الشركة التابعة</strong> تعني كياناً يتحكم في أو يتم التحكم فيه أو تحت سيطرة مشتركة مع طرف، حيث تعني "السيطرة" ملكية 50% أو أكثر من الأسهم.</li>
                  <li><strong>الشركة</strong> (المشار إليها باسم "الشركة" أو "نحن" أو "نا" في هذا الاتفاق) تشير إلى كتبي.</li>
                  <li><strong>ملفات تعريف الارتباط</strong> هي ملفات صغيرة يتم وضعها على جهاز الكمبيوتر أو الجهاز المحمول الخاص بك بواسطة موقع ويب.</li>
                  <li><strong>البلد</strong> يشير إلى: المغرب</li>
                  <li><strong>الجهاز</strong> يعني أي جهاز يمكنه الوصول إلى الخدمة مثل جهاز كمبيوتر أو هاتف محمول أو جهاز لوحي رقمي.</li>
                  <li><strong>البيانات الشخصية</strong> هي أي معلومات تتعلق بفرد محدد أو قابل للتحديد.</li>
                  <li><strong>الخدمة</strong> تشير إلى الموقع الإلكتروني.</li>
                  <li><strong>مقدم الخدمة</strong> يعني أي شخص طبيعي أو اعتباري يعالج البيانات نيابة عن الشركة.</li>
                  <li><strong>بيانات الاستخدام</strong> تشير إلى البيانات المجمعة تلقائياً، إما الناتجة عن استخدام الخدمة أو من البنية التحتية للخدمة نفسها.</li>
                  <li><strong>الموقع الإلكتروني</strong> يشير إلى كتبي، الذي يمكن الوصول إليه من <a href="https://kotobi.xyz/" rel="external nofollow noopener" target="_blank" className="text-blue-600 hover:underline">https://kotobi.xyz/</a></li>
                  <li><strong>أنت</strong> يعني الفرد الذي يصل إلى أو يستخدم الخدمة، أو الشركة أو الكيان القانوني الآخر نيابة عن هذا الفرد.</li>
                </ul>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">جمع واستخدام بياناتك الشخصية</h2>
                <h3 className="text-lg font-medium text-gray-800">أنواع البيانات المجمعة</h3>
                <h4 className="text-base font-medium text-gray-800">البيانات الشخصية</h4>
                <p>أثناء استخدام خدمتنا، قد نطلب منك تزويدنا بمعلومات شخصية معينة يمكن استخدامها للاتصال بك أو التعرف عليك. قد تشمل المعلومات الشخصية، على سبيل المثال لا الحصر:</p>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>عنوان البريد الإلكتروني</li>
                  <li>الاسم الأول والأخير</li>
                  <li>بيانات الاستخدام</li>
                </ul>
                
                <h4 className="text-base font-medium text-gray-800">بيانات الاستخدام</h4>
                <p>يتم جمع بيانات الاستخدام تلقائياً عند استخدام الخدمة.</p>
                <p>قد تتضمن بيانات الاستخدام معلومات مثل عنوان بروتوكول الإنترنت لجهازك، نوع المتصفح، إصدار المتصفح، صفحات خدمتنا التي تزورها، وقت وتاريخ زيارتك، الوقت المستغرق في تلك الصفحات، معرفات الجهاز الفريدة وبيانات التشخيص الأخرى.</p>
                
                <h3 className="text-lg font-medium text-gray-800">استخدام بياناتك الشخصية</h3>
                <p>قد تستخدم الشركة البيانات الشخصية للأغراض التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li><strong>لتوفير والحفاظ على خدمتنا</strong>، بما في ذلك مراقبة استخدام خدمتنا.</li>
                  <li><strong>لإدارة حسابك:</strong> لإدارة تسجيلك كمستخدم للخدمة.</li>
                  <li><strong>لالتصال بك:</strong> للاتصال بك عبر البريد الإلكتروني أو المكالمات الهاتفية أو الرسائل النصية.</li>
                  <li><strong>لتزويدك</strong> بالأخبار والعروض الخاصة والمعلومات العامة حول السلع والخدمات والأحداث الأخرى.</li>
                  <li><strong>لإدارة طلباتك:</strong> لحضور وإدارة طلباتك إلينا.</li>
                </ul>
                
                <h3 className="text-lg font-medium text-gray-800">الاحتفاظ ببياناتك الشخصية</h3>
                <p>ستحتفظ الشركة ببياناتك الشخصية فقط طالما كان ذلك ضرورياً للأغراض المنصوص عليها في سياسة الخصوصية هذه.</p>
                
                <h3 className="text-lg font-medium text-gray-800">حذف بياناتك الشخصية</h3>
                <p>لديك الحق في حذف أو طلب مساعدتنا في حذف البيانات الشخصية التي جمعناها عنك.</p>
                
                <h3 className="text-lg font-medium text-gray-800">أمان بياناتك الشخصية</h3>
                <p>أمان بياناتك الشخصية مهم بالنسبة لنا، لكن تذكر أنه لا توجد طريقة نقل عبر الإنترنت أو طريقة تخزين إلكتروني آمنة بنسبة 100%.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">خصوصية الأطفال</h2>
                <p>خدمتنا لا تتوجه لأي شخص تحت سن 13 عاماً. نحن لا نجمع عن قصد معلومات شخصية من أي شخص تحت سن 13 عاماً.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">روابط لمواقع ويب أخرى</h2>
                <p>قد تحتوي خدمتنا على روابط لمواقع ويب أخرى لا نديرها. ننصحك بشدة بمراجعة سياسة الخصوصية لكل موقع تزوره.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">تغييرات على سياسة الخصوصية هذه</h2>
                <p>قد نقوم بتحديث سياسة الخصوصية الخاصة بنا من وقت لآخر. سنخطرك بأي تغييرات عن طريق نشر سياسة الخصوصية الجديدة على هذه الصفحة.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">اتصل بنا</h2>
                <p>إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يمكنك الاتصال بنا:</p>
                <ul className="list-disc list-inside mr-4">
                  <li>عبر البريد الإلكتروني: suportkotobi@gmail.com</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-6 text-sm leading-relaxed">
                <h1 className="text-2xl font-bold text-gray-800">Privacy Policy</h1>
                <p>Last updated: June 05, 2025</p>
                <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
                <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy. This Privacy Policy has been created with the help of the <a href="https://www.termsfeed.com/privacy-policy-generator/" target="_blank" className="text-blue-600 hover:underline">Privacy Policy Generator</a>.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">Interpretation and Definitions</h2>
                <h3 className="text-lg font-medium text-gray-800">Interpretation</h3>
                <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>
                
                <h3 className="text-lg font-medium text-gray-800">Definitions</h3>
                <p>For the purposes of this Privacy Policy:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
                  <li><strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</li>
                  <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to kotobi.</li>
                  <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</li>
                  <li><strong>Country</strong> refers to: Morocco</li>
                  <li><strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.</li>
                  <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
                  <li><strong>Service</strong> refers to the Website.</li>
                  <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</li>
                  <li><strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</li>
                  <li><strong>Website</strong> refers to kotobi, accessible from <a href="https://kotobi.xyz/" rel="external nofollow noopener" target="_blank" className="text-blue-600 hover:underline">https://kotobi.xyz/</a></li>
                  <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
                </ul>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">Collecting and Using Your Personal Data</h2>
                <h3 className="text-lg font-medium text-gray-800">Types of Data Collected</h3>
                <h4 className="text-base font-medium text-gray-800">Personal Data</h4>
                <p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email address</li>
                  <li>First name and last name</li>
                  <li>Usage Data</li>
                </ul>
                
                <h4 className="text-base font-medium text-gray-800">Usage Data</h4>
                <p>Usage Data is collected automatically when using the Service.</p>
                <p>Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
                <p>When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.</p>
                <p>We may also collect information that Your browser sends whenever You visit our Service or when You access the Service by or through a mobile device.</p>
                
                <h4 className="text-base font-medium text-gray-800">Tracking Technologies and Cookies</h4>
                <p>We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies used are beacons, tags, and scripts to collect and track information and to improve and analyze Our Service. The technologies We use may include:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Cookies or Browser Cookies.</strong> A cookie is a small file placed on Your Device. You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if You do not accept Cookies, You may not be able to use some parts of our Service. Unless you have adjusted Your browser setting so that it will refuse Cookies, our Service may use Cookies.</li>
                  <li><strong>Web Beacons.</strong> Certain sections of our Service and our emails may contain small electronic files known as web beacons (also referred to as clear gifs, pixel tags, and single-pixel gifs) that permit the Company, for example, to count users who have visited those pages or opened an email and for other related website statistics (for example, recording the popularity of a certain section and verifying system and server integrity).</li>
                </ul>
                
                <p>Cookies can be "Persistent" or "Session" Cookies. Persistent Cookies remain on Your personal computer or mobile device when You go offline, while Session Cookies are deleted as soon as You close Your web browser. You can learn more about cookies on <a href="https://www.termsfeed.com/blog/cookies/#What_Are_Cookies" target="_blank" className="text-blue-600 hover:underline">TermsFeed website</a> article.</p>
                
                <p>We use both Session and Persistent Cookies for the purposes set out below:</p>
                <ul className="list-disc list-inside space-y-3 ml-4">
                  <li>
                    <p><strong>Necessary / Essential Cookies</strong></p>
                    <p>Type: Session Cookies</p>
                    <p>Administered by: Us</p>
                    <p>Purpose: These Cookies are essential to provide You with services available through the Website and to enable You to use some of its features. They help to authenticate users and prevent fraudulent use of user accounts. Without these Cookies, the services that You have asked for cannot be provided, and We only use these Cookies to provide You with those services.</p>
                  </li>
                  <li>
                    <p><strong>Cookies Policy / Notice Acceptance Cookies</strong></p>
                    <p>Type: Persistent Cookies</p>
                    <p>Administered by: Us</p>
                    <p>Purpose: These Cookies identify if users have accepted the use of cookies on the Website.</p>
                  </li>
                  <li>
                    <p><strong>Functionality Cookies</strong></p>
                    <p>Type: Persistent Cookies</p>
                    <p>Administered by: Us</p>
                    <p>Purpose: These Cookies allow us to remember choices You make when You use the Website, such as remembering your login details or language preference. The purpose of these Cookies is to provide You with a more personal experience and to avoid You having to re-enter your preferences every time You use the Website.</p>
                  </li>
                </ul>
                
                <p>For more information about the cookies we use and your choices regarding cookies, please visit our Cookies Policy or the Cookies section of our Privacy Policy.</p>
                
                <h3 className="text-lg font-medium text-gray-800">Use of Your Personal Data</h3>
                <p>The Company may use Personal Data for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
                  <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.</li>
                  <li><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.</li>
                  <li><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication, such as a mobile application's push notifications regarding updates or informative communications related to the functionalities, products or contracted services, including the security updates, when necessary or reasonable for their implementation.</li>
                  <li><strong>To provide You</strong> with news, special offers and general information about other goods, services and events which we offer that are similar to those that you have already purchased or enquired about unless You have opted not to receive such information.</li>
                  <li><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</li>
                  <li><strong>For business transfers:</strong> We may use Your information to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of Our assets, whether as a going concern or as part of bankruptcy, liquidation, or similar proceeding, in which Personal Data held by Us about our Service users is among the assets transferred.</li>
                  <li><strong>For other purposes</strong>: We may use Your information for other purposes, such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and to evaluate and improve our Service, products, services, marketing and your experience.</li>
                </ul>
                
                <p>We may share Your personal information in the following situations:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>With Service Providers:</strong> We may share Your personal information with Service Providers to monitor and analyze the use of our Service, to contact You.</li>
                  <li><strong>For business transfers:</strong> We may share or transfer Your personal information in connection with, or during negotiations of, any merger, sale of Company assets, financing, or acquisition of all or a portion of Our business to another company.</li>
                  <li><strong>With Affiliates:</strong> We may share Your information with Our affiliates, in which case we will require those affiliates to honor this Privacy Policy. Affiliates include Our parent company and any other subsidiaries, joint venture partners or other companies that We control or that are under common control with Us.</li>
                  <li><strong>With business partners:</strong> We may share Your information with Our business partners to offer You certain products, services or promotions.</li>
                  <li><strong>With other users:</strong> when You share personal information or otherwise interact in the public areas with other users, such information may be viewed by all users and may be publicly distributed outside.</li>
                  <li><strong>With Your consent</strong>: We may disclose Your personal information for any other purpose with Your consent.</li>
                </ul>
                
                <h3 className="text-lg font-medium text-gray-800">Retention of Your Personal Data</h3>
                <p>The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.</p>
                <p>The Company will also retain Usage Data for internal analysis purposes. Usage Data is generally retained for a shorter period of time, except when this data is used to strengthen the security or to improve the functionality of Our Service, or We are legally obligated to retain this data for longer time periods.</p>
                
                <h3 className="text-lg font-medium text-gray-800">Transfer of Your Personal Data</h3>
                <p>Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ than those from Your jurisdiction.</p>
                <p>Your consent to this Privacy Policy followed by Your submission of such information represents Your agreement to that transfer.</p>
                <p>The Company will take all steps reasonably necessary to ensure that Your data is treated securely and in accordance with this Privacy Policy and no transfer of Your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of Your data and other personal information.</p>
                
                <h3 className="text-lg font-medium text-gray-800">Delete Your Personal Data</h3>
                <p>You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You.</p>
                <p>Our Service may give You the ability to delete certain information about You from within the Service.</p>
                <p>You may update, amend, or delete Your information at any time by signing in to Your Account, if you have one, and visiting the account settings section that allows you to manage Your personal information. You may also contact Us to request access to, correct, or delete any personal information that You have provided to Us.</p>
                <p>Please note, however, that We may need to retain certain information when we have a legal obligation or lawful basis to do so.</p>
                
                <h3 className="text-lg font-medium text-gray-800">Disclosure of Your Personal Data</h3>
                <h4 className="text-base font-medium text-gray-800">Business Transactions</h4>
                <p>If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.</p>
                
                <h4 className="text-base font-medium text-gray-800">Law enforcement</h4>
                <p>Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).</p>
                
                <h4 className="text-base font-medium text-gray-800">Other legal requirements</h4>
                <p>The Company may disclose Your Personal Data in the good faith belief that such action is necessary to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Comply with a legal obligation</li>
                  <li>Protect and defend the rights or property of the Company</li>
                  <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
                  <li>Protect the personal safety of Users of the Service or the public</li>
                  <li>Protect against legal liability</li>
                </ul>
                
                <h3 className="text-lg font-medium text-gray-800">Security of Your Personal Data</h3>
                <p>The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">Children's Privacy</h2>
                <p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If You are a parent or guardian and You are aware that Your child has provided Us with Personal Data, please contact Us. If We become aware that We have collected Personal Data from anyone under the age of 13 without verification of parental consent, We take steps to remove that information from Our servers.</p>
                <p>If We need to rely on consent as a legal basis for processing Your information and Your country requires consent from a parent, We may require Your parent's consent before We collect and use that information.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">Links to Other Websites</h2>
                <p>Our Service may contain links to other websites that are not operated by Us. If You click on a third party link, You will be directed to that third party's site. We strongly advise You to review the Privacy Policy of every site You visit.</p>
                <p>We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">Changes to this Privacy Policy</h2>
                <p>We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.</p>
                <p>We will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the "Last updated" date at the top of this Privacy Policy.</p>
                <p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
                
                <h2 className="text-xl font-semibold text-gray-800 mt-6">Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, You can contact us:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>By email: suportkotobi@gmail.com</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
