import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Upload, Download } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import UserBookSubmissions from '@/components/books/UserBookSubmissions';
import ReadingHistory from '@/components/user/ReadingHistory';
import UserDownloadedBooks from '@/components/books/UserDownloadedBooks';
import { SEOHead } from '@/components/seo/SEOHead';

const MyBooks: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'reading' | 'uploads' | 'downloads'>('reading');

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // التمرير إلى الأعلى عند دخول الصفحة
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);


  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-book-primary mx-auto mb-4" />
            <p className="text-foreground font-tajawal animate-pulse font-black">جاري تحميل كتبك...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="كتبي - منطقة خاصة بالمستخدم"
        description="صفحة كتبي لعرض الكتب التي قمت برفعها. هذه الصفحة خاصة بحسابك."
        keywords="كتبي, كتب المستخدم, منصة كتبي"
        canonical="https://kotobi.xyz/my-books"
        noindex={true}
      />
      <Navbar />
      
      <motion.main 
        className="flex-grow py-8 px-4 md:py-12 pb-32 md:pb-16 bg-background"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="container mx-auto">
          <motion.div 
            variants={itemVariants}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-tajawal font-black mb-4 text-foreground">
              مكتبتي
            </h1>
            <p className="text-foreground max-w-xl mx-auto font-cairo text-base md:text-lg font-black">
              سجل قراءاتك والكتب التي قمت برفعها
            </p>
            <div className="h-1 w-24 bg-gradient-to-r from-book-primary to-book-accent mx-auto mt-4 rounded-full"></div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto mb-16 sm:mb-8"
          >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="reading" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  سجل القراءة
                </TabsTrigger>
                <TabsTrigger value="downloads" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  تحميلاتي
                </TabsTrigger>
                <TabsTrigger value="uploads" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  كتبي المرفوعة
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reading">
                <ReadingHistory />
              </TabsContent>

              <TabsContent value="downloads">
                <UserDownloadedBooks />
              </TabsContent>

              <TabsContent value="uploads">
                <UserBookSubmissions key={user?.id || 'books'} />
              </TabsContent>
            </Tabs>

          </motion.div>
        </div>
      </motion.main>
      
      <Footer />
    </div>
  );
};

export default MyBooks;