import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import UserSettings from '@/components/user/UserSettings';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { SEOHead } from '@/components/seo/SEOHead';

const UserProfile: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEOHead title="حسابي - منصة كتبي" description="إدارة حسابك وإعداداتك الشخصية على منصة كتبي." keywords="حسابي, الملف الشخصي" canonical="https://kotobi.xyz/profile" noindex={true} />
        <Navbar />
        <main className="flex-grow flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-book-primary mx-auto mb-4" />
            <p className="text-foreground font-tajawal font-black animate-pulse">جاري تحميل بيانات المستخدم...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="حسابي - منصة كتبي" description="إدارة حسابك وإعداداتك الشخصية على منصة كتبي." keywords="حسابي, الملف الشخصي" canonical="https://kotobi.xyz/profile" noindex={true} />
      <Navbar />
      <motion.main
        className={`flex-grow py-8 px-4 md:py-12 ${isMobile ? 'pb-36' : 'pb-20'} bg-background`}
        initial="hidden" animate="visible" variants={containerVariants}
      >
        <div className="container mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-tajawal font-black mb-4 text-foreground">الملف الشخصي</h1>
            <p className="text-foreground max-w-xl mx-auto font-cairo text-base md:text-lg font-black">إدارة حسابك وتفضيلاتك الشخصية</p>
            <div className="h-1 w-24 bg-gradient-to-r from-book-primary to-book-accent mx-auto mt-4 rounded-full" />
          </motion.div>
          <div className="max-w-5xl mx-auto mb-16 sm:mb-8 space-y-8">
            <motion.div variants={itemVariants} transition={{ duration: 0.5, delay: 0.2 }} initial="hidden" animate="visible">
              <UserSettings key={user?.id || 'settings'} />
            </motion.div>
          </div>
        </div>
      </motion.main>
      <div className="sticky bottom-0 z-40 bg-background/80 backdrop-blur-md border-t border-border">
        <Footer />
      </div>
    </div>
  );
};

export default UserProfile;
