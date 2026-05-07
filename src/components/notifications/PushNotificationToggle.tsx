import React from 'react';
import { Bell, BellOff, BellRing, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { useAuth } from '@/context/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PushNotificationToggleProps {
  variant?: 'icon' | 'button';
  className?: string;
}

const PushNotificationToggle: React.FC<PushNotificationToggleProps> = ({ 
  variant = 'icon',
  className = ''
}) => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe, initialized } = useOneSignalPush();

  // إخفاء الأيقونة أثناء التهيئة وبعد التفعيل
  if (!user || !isSupported || !initialized || isSubscribed) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getTooltipText = () => {
    if (permission === 'denied') return 'تم رفض إذن الإشعارات من المتصفح. يرجى تغيير الإعداد من إعدادات المتصفح';
    if (!initialized) return 'جاري تحميل نظام الإشعارات...';
    if (isSubscribed) return 'الإشعارات مفعّلة ✅ - اضغط لإيقافها';
    return 'اضغط لتفعيل إشعارات المتصفح';
  };

  const getIcon = () => {
    if (loading || !initialized) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (permission === 'denied') return <ShieldAlert className="h-5 w-5 text-destructive" />;
    if (isSubscribed) return <BellRing className="h-5 w-5 text-primary animate-pulse" />;
    return <BellOff className="h-5 w-5 text-muted-foreground" />;
  };

  if (variant === 'button') {
    return (
      <Button
        onClick={handleToggle}
        disabled={loading || permission === 'denied' || !initialized}
        variant={isSubscribed ? 'default' : 'outline'}
        className={`gap-2 ${className}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : permission === 'denied' ? (
          <ShieldAlert className="h-4 w-4" />
        ) : isSubscribed ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {permission === 'denied' 
          ? 'الإشعارات محظورة' 
          : isSubscribed 
            ? 'الإشعارات مفعّلة ✅' 
            : 'تفعيل الإشعارات'}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleToggle}
            disabled={loading || permission === 'denied' || !initialized}
            variant="ghost"
            size="icon"
            className={`relative ${className}`}
            aria-label={isSubscribed ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات'}
          >
            {getIcon()}
            {isSubscribed && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PushNotificationToggle;
