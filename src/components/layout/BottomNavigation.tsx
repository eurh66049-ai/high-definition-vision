import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import HomeIcon from '@/components/icons/HomeIcon';
import UploadBookIcon from '@/components/icons/UploadBookIcon';
import QuoteIcon from '@/components/icons/QuoteIcon';
import ProfileIcon from '@/components/icons/ProfileIcon';
import MyBooksIcon from '@/components/icons/MyBooksIcon';

import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.email) return setIsAdmin(false);
      try {
        setAdminCheckLoading(true);
        const { data } = await supabase.rpc('is_admin_user', { user_email: user.email });
        setIsAdmin(!!data);
      } catch (error) {
        console.error(error);
        setIsAdmin(false);
      } finally {
        setAdminCheckLoading(false);
      }
    };
    checkAdminStatus();
  }, [user?.email]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex justify-around items-center
      bg-card/90 backdrop-blur-md border-t border-border rounded-t-2xl shadow-xl p-1.5 sm:p-2 md:hidden">
      
      <NavButton label="الرئيسية" icon={<HomeIcon className="h-5 w-5" />} active={isActive('/')} onClick={() => handleNavigation('/')} />
      <NavButton label="انشر كتابك" icon={<UploadBookIcon className="h-5 w-5" />} active={isActive('/upload-book')} onClick={() => handleNavigation('/upload-book')} />

      {user && !adminCheckLoading && isAdmin && (
        <NavButton label="إدارة" icon={<Settings className="h-5 w-5" />} active={isActive('/admin/books')} onClick={() => handleNavigation('/admin/books')} />
      )}

      <NavButton label="الاقتباسات" icon={<QuoteIcon className="h-5 w-5" />} active={isActive('/quotes')} onClick={() => handleNavigation('/quotes')} />
      
      {/* زر كتبي */}
      <NavButton 
        label="كتبي" 
        icon={<MyBooksIcon className="h-5 w-5" />} 
        active={isActive('/my-books')} 
        onClick={() => handleNavigation('/my-books')} 
      />
      
      <NavButton label="حسابي" icon={<ProfileIcon className="h-5 w-5" />} active={isActive('/profile')} onClick={() => handleNavigation('/profile')} />
    </div>
  );
};

export default BottomNavigation;

/* ====== زر التنقل ====== */
const NavButton = ({ label, icon, active, onClick }: any) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={cn(
      "flex flex-col items-center justify-center p-2 rounded-xl transition-colors transform active:scale-95 active:animate-pulse",
      active ? "text-primary" : "text-foreground hover:text-primary"
    )}
  >
    {icon}
    <span className="text-[11px] mt-0.5">{label}</span>
  </button>
);