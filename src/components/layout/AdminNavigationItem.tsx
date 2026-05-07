
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AdminNavigationItemProps {
  className?: string;
  size?: 'sm' | 'lg';
  mobile?: boolean;
  onClick?: () => void;
}

const AdminNavigationItem: React.FC<AdminNavigationItemProps> = ({
  className,
  size = 'sm',
  mobile = false,
  onClick
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = location.pathname === '/admin/books';

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.email) {
        setIsAdmin(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('is_admin_user', { user_email: user.email });
          
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data || false);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user?.email]);

  // لا تظهر الزر إذا كان المستخدم غير مسجل أو ليس مديراً أو ما زال يتم التحقق
  if (!user || loading || !isAdmin) {
    return null;
  }

  return (
    <Link to="/admin/books" onClick={onClick} className={mobile ? "block" : undefined}>
      <Button 
        variant={isActive ? "default" : "ghost"} 
        className={cn(
          "active-press",
          mobile ? "w-full justify-start text-right" : "text-sm sm:text-base",
          className
        )}
        size={size}
      >
        <Settings className={mobile ? "ml-2 h-4 w-4" : "mr-1 sm:ml-2 h-4 w-4"} />
        {mobile ? (
          "إدارة الكتب"
        ) : (
          <>
            <span className="hidden sm:inline">إدارة الكتب</span>
            <span className="sm:hidden">إدارة</span>
          </>
        )}
      </Button>
    </Link>
  );
};

export default AdminNavigationItem;
