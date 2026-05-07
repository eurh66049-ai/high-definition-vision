import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, UserPlus, Users } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/context/AuthContext';
import { useActivityTimeline } from '@/hooks/useActivityTimeline';
import { useIsMobile } from '@/hooks/use-mobile';
import ActivityCard from '@/components/timeline/ActivityCard';

const Timeline: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { activities, loading, hasMore, loadMore, refresh } = useActivityTimeline();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner size="lg" color="red" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEOHead title="تايم لاين النشاط - كتبي" description="تابع نشاطات أصدقائك على منصة كتبي" noindex />
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <Users className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">سجّل الدخول لمتابعة نشاطات أصدقائك</h2>
            <Button onClick={() => navigate('/auth')} className="rounded-full">
              تسجيل الدخول
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="تايم لاين النشاط - كتبي" description="تابع نشاطات أصدقائك على منصة كتبي" noindex />
      <Navbar />
      <motion.main
        className={`flex-grow py-6 px-4 ${isMobile ? 'pb-36' : 'pb-20'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">آخر النشاطات</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              className="rounded-full"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Content */}
          {loading && activities.length === 0 ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" color="red" />
            </div>
          ) : activities.length === 0 ? (
            <motion.div
              className="text-center py-16 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <UserPlus className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">لا توجد نشاطات بعد</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                تابع مستخدمين آخرين لتظهر نشاطاتهم هنا — مثل الإعجابات والمراجعات والاقتباسات
              </p>
              <Button onClick={() => navigate('/authors')} variant="outline" className="rounded-full mt-2">
                اكتشف مستخدمين
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <ActivityCard activity={activity} />
                </motion.div>
              ))}

              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    className="rounded-full"
                    disabled={loading}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'تحميل المزيد'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.main>
      <Footer />
    </div>
  );
};

export default Timeline;
