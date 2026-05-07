import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  UserPlus,
  UserMinus,
  LoaderCircle,
  Heart,
  Instagram,
  MessageCircle,
  Facebook,
  Youtube,
  Linkedin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { buildWhatsAppUrl } from '@/utils/whatsapp';

// X (Twitter) Icon
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// TikTok Icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface SocialLinks {
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
}

interface FollowOptionsPopoverProps {
  isFollowing: boolean;
  loading: boolean;
  onFollowOnSite: () => void;
  authorName: string;
  socialLinks?: SocialLinks;
  className?: string;
  hideText?: boolean; // إخفاء النص وإظهار الأيقونة فقط
}

const socialPlatforms = [
  { 
    key: 'instagram', 
    name: 'Instagram', 
    icon: Instagram, 
    bgColor: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
  },
  { 
    key: 'twitter', 
    name: 'X', 
    icon: XIcon, 
    bgColor: 'bg-black dark:bg-white dark:text-black',
  },
  { 
    key: 'whatsapp', 
    name: 'WhatsApp', 
    icon: MessageCircle, 
    bgColor: 'bg-green-500',
  },
  { 
    key: 'facebook', 
    name: 'Facebook', 
    icon: Facebook, 
    bgColor: 'bg-blue-600',
  },
  { 
    key: 'youtube', 
    name: 'YouTube', 
    icon: Youtube, 
    bgColor: 'bg-red-600',
  },
  { 
    key: 'linkedin', 
    name: 'LinkedIn', 
    icon: Linkedin, 
    bgColor: 'bg-blue-700',
  },
  { 
    key: 'tiktok', 
    name: 'TikTok', 
    icon: TikTokIcon, 
    bgColor: 'bg-black',
  },
];

export const FollowOptionsPopover: React.FC<FollowOptionsPopoverProps> = ({
  isFollowing,
  loading,
  onFollowOnSite,
  authorName,
  socialLinks = {},
  className = "",
  hideText = false
}) => {
  const [open, setOpen] = useState(false);

  // التحقق من وجود روابط اجتماعية
  const availableSocials = socialPlatforms.filter(
    platform => {
      const link = socialLinks[platform.key as keyof SocialLinks];
      return link && link.trim() !== '';
    }
  );
  const hasSocialLinks = availableSocials.length > 0;

  const handleFollowOnSite = () => {
    onFollowOnSite();
    setOpen(false);
  };

  const handleSocialClick = (platformKey: string, url: string | null | undefined) => {
    if (!url) return;

    const finalUrl = platformKey === 'whatsapp' ? buildWhatsAppUrl(url) : url;
    if (!finalUrl) return;

    window.open(finalUrl, '_blank', 'noopener,noreferrer');
    toast.success(`تم فتح الرابط`);
    setOpen(false);
  };

  const handleButtonClick = () => {
    // إذا كان يتابع بالفعل أو لا توجد روابط اجتماعية، نتابع مباشرة
    if (isFollowing || !hasSocialLinks) {
      onFollowOnSite();
    } else {
      setOpen(true);
    }
  };

  // زر المتابعة الأساسي
  const FollowTriggerButton = (
    <Button
      onClick={handleButtonClick}
      disabled={loading}
      variant="secondary"
      size="sm"
      className={`gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600 whitespace-nowrap ${hideText ? 'px-3' : ''} ${className}`}
      title={hideText ? (isFollowing ? 'إلغاء المتابعة' : 'متابعة') : undefined}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 flex-shrink-0" />
          {!hideText && <span className="truncate">إلغاء المتابعة</span>}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 flex-shrink-0" />
          {!hideText && <span className="truncate">متابعة</span>}
        </>
      )}
    </Button>
  );

  // إذا لم تكن هناك روابط اجتماعية أو كان يتابع بالفعل، لا نعرض Popover
  if (!hasSocialLinks || isFollowing) {
    return FollowTriggerButton;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {FollowTriggerButton}
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-72 p-0 border-0 bg-card shadow-2xl rounded-2xl overflow-hidden"
        align="center"
        sideOffset={8}
      >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {/* متابعة على الموقع */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleFollowOnSite}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-l from-primary/10 to-transparent hover:from-primary/20 transition-all duration-200 border-b border-border/30"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
                <Heart className="w-5 h-5" />
              </div>
              <div className="text-right flex-1">
                <span className="font-bold text-foreground block text-sm">متابعة على كتبي</span>
                <span className="text-xs text-muted-foreground">إشعارات عند إضافة كتب جديدة</span>
              </div>
            </motion.button>

            {/* روابط التواصل الاجتماعي */}
            <div className="p-3">
              <p className="text-xs text-muted-foreground text-center mb-3">أو تابع على</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {availableSocials.map((platform) => {
                  const url = socialLinks[platform.key as keyof SocialLinks];
                  const Icon = platform.icon;
                  
                  return (
                    <motion.button
                      key={platform.key}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSocialClick(platform.key, url)}
                      className={`w-10 h-10 rounded-full ${platform.bgColor} text-white flex items-center justify-center shadow-md hover:shadow-lg transition-shadow`}
                      title={platform.name}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
};

export default FollowOptionsPopover;
