import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import siteIcon from '@/assets/site-icon.svg';
import { Bell, Heart, Menu, Settings, MessageSquare, Search, Mail, BookOpen, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { SearchDialog } from '@/components/search/SearchDialog';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import SiteUpdatesDropdown from '@/components/notifications/SiteUpdatesDropdown';
import PushNotificationToggle from '@/components/notifications/PushNotificationToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/context/NotificationContext';
import { useConversations } from '@/hooks/useConversations';

import UploadBookIcon from '@/components/icons/UploadBookIcon';
import MyBooksIcon from '@/components/icons/MyBooksIcon';
import ProfileIcon from '@/components/icons/ProfileIcon';
import HomeIcon from '@/components/icons/HomeIcon';
import CategoriesIcon from '@/components/icons/CategoriesIcon';
import FavoriteIcon from '@/components/icons/FavoriteIcon';
import AuthorsIcon from '@/components/icons/AuthorsIcon';
import PrivacyPolicyIcon from '@/components/icons/PrivacyPolicyIcon';


import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { favorites } = useFavorites();
  const { shouldRefresh } = useNotification();
  const { totalUnread: unreadMessages } = useConversations();
  const isMobile = useIsMobile();

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  // التحقق من صلاحيات الإدارة
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.email) return;
      setAdminCheckLoading(true);
      const { data } = await supabase.rpc('is_admin_user', { user_email: user.email });
      setIsAdmin(!!data);
      setAdminCheckLoading(false);
    };
    checkAdmin();
  }, [user?.email]);

  // جلب عدد الإشعارات غير المقروءة
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return setUnreadNotificationsCount(0);
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadNotificationsCount(count || 0);
    };
    fetchNotifications();
  }, [user, shouldRefresh]);

  const handleNavigation = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const favoritesCount = favorites.length;

  return (
    <nav className="sticky top-0 z-50 mx-2 mt-1 rounded-xl bg-card/90 backdrop-blur border shadow-md">
      <div className="container mx-auto px-3 py-1 flex items-center justify-between">

        {/* زر القائمة */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="فتح القائمة">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          {/* القائمة الجانبية الشفافة */}
          <SheetContent side="right" className="fixed bottom-0 top-0 rounded-l-2xl bg-card/70 backdrop-blur-lg border-l border-border shadow-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-right">أقسام الموقع</SheetTitle>
              <SheetDescription className="text-right">
                تصفح أقسام الموقع
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-2 px-2">
              <MenuButton label="الرئيسية" icon={<HomeIcon />} onClick={() => handleNavigation('/')} active={isActive('/')} />
              <MenuButton label="المؤلفين" icon={<AuthorsIcon />} onClick={() => handleNavigation('/authors')} active={isActive('/authors')} />
              <MenuButton label="الأقسام" icon={<CategoriesIcon />} onClick={() => handleNavigation('/categories')} active={isActive('/categories')} />
              <MenuButton label="المفضلة" icon={<FavoriteIcon />} onClick={() => handleNavigation('/favorites')} active={isActive('/favorites')} badge={favoritesCount} />
              <MenuButton label="اقتراحات 💡" icon={<MessageSquare className="h-5 w-5" />} onClick={() => handleNavigation('/suggestions')} active={isActive('/suggestions')} />
              <MenuButton label="نوادي القراءة 📚" icon={<BookOpen className="h-5 w-5" />} onClick={() => handleNavigation('/reading-clubs')} active={isActive('/reading-clubs')} />
              {user && <MenuButton label="تايم لاين 📰" icon={<Activity className="h-5 w-5" />} onClick={() => handleNavigation('/timeline')} active={isActive('/timeline')} />}

              {user && (
                <>
                  <div className="my-3 h-px bg-border" />
                  <MenuButton label="انشر كتابك" icon={<UploadBookIcon />} onClick={() => handleNavigation('/upload-book')} />
                  <MenuButton label="كتبي" icon={<MyBooksIcon />} onClick={() => handleNavigation('/my-books')} />
                  <MenuButton label="حسابي" icon={<ProfileIcon />} onClick={() => handleNavigation('/profile')} />
                  {!adminCheckLoading && isAdmin && (
                    <MenuButton label="إدارة الكتب" icon={<Settings />} onClick={() => handleNavigation('/admin/books')} />
                  )}
                </>
              )}

              <div className="my-3 h-px bg-border" />
              
              <MenuButton label="اتصل بنا" icon={<MessageSquare />} onClick={() => handleNavigation('/contact-us')} active={isActive('/contact-us')} />
              <MenuButton label="دعم المشروع" icon={<Heart />} onClick={() => handleNavigation('/donation')} />

              <div className="my-3 h-px bg-border" />
              <MenuButton label="من نحن" icon={<BookOpen className="h-5 w-5" />} onClick={() => handleNavigation('/about')} active={isActive('/about')} />
              <MenuButton label="سياسة الخصوصية" icon={<PrivacyPolicyIcon className="h-5 w-5" />} onClick={() => handleNavigation('/privacy-policy')} active={isActive('/privacy-policy')} />
              <MenuButton label="شروط الاستخدام" icon={<BookOpen className="h-5 w-5" />} onClick={() => handleNavigation('/terms-of-service')} active={isActive('/terms-of-service')} />
            </div>
          </SheetContent>
        </Sheet>

        {/* الشعار */}
        <Link to="/" className="flex items-center">
          <img src={siteIcon} alt="كتبي" className="h-8" width={70} height={32} />
        </Link>

        {/* الأزرار اليمنى */}
        <div className="flex items-center gap-1">
          {/* أيقونة البحث */}
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full text-primary h-8 w-8"
            onClick={() => setSearchOpen(true)}
            aria-label="بحث"
          >
            <Search className="h-5 w-5" />
          </Button>

          <SiteUpdatesDropdown>
            <Button variant="ghost" className="rounded-full text-primary" aria-label="تحديثات الموقع">
              <MessageSquare className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">تحديثات</span>
            </Button>
          </SiteUpdatesDropdown>

          {user && !loading && (
            <>
              {/* زر تفعيل الإشعارات */}
              <PushNotificationToggle />

              {/* أيقونة الرسائل */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full relative text-primary"
                onClick={() => navigate('/messages')}
                aria-label="الرسائل"
              >
                <Mail className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Button>

              <NotificationsDropdown>
                <Button variant="ghost" className="rounded-full relative text-primary" aria-label="الإشعارات">
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </Button>
              </NotificationsDropdown>
            </>
          )}

          {!user && !loading && (
            <Button onClick={() => navigate('/auth')} className="rounded-full">
              تسجيل الدخول
            </Button>
          )}
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
};

export default Navbar;

/* ====== مكون زر القائمة ====== */
const MenuButton = ({ label, icon, onClick, active = false, badge = 0 }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition
      ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
  >
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
    {badge > 0 && (
      <span className="bg-primary text-white text-xs rounded-full px-2">
        {badge}
      </span>
    )}
  </button>
);