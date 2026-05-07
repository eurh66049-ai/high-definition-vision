import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Linkedin,
  MessageCircle
} from 'lucide-react';

// TikTok Icon Component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface SocialLinksSectionProps {
  socialLinks: {
    instagram: string;
    twitter: string;
    facebook: string;
    whatsapp: string;
    youtube: string;
    linkedin: string;
    tiktok: string;
  };
  onSocialLinkChange: (platform: string, value: string) => void;
}

const socialPlatformConfig = [
  { 
    key: 'instagram', 
    name: 'إنستغرام', 
    icon: Instagram, 
    placeholder: 'https://instagram.com/username',
    color: 'from-purple-500 via-pink-500 to-orange-400'
  },
  { 
    key: 'twitter', 
    name: 'X (تويتر)', 
    icon: Twitter, 
    placeholder: 'https://x.com/username',
    color: 'from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300'
  },
  { 
    key: 'facebook', 
    name: 'فيسبوك', 
    icon: Facebook, 
    placeholder: 'https://facebook.com/username',
    color: 'from-blue-600 to-blue-700'
  },
  { 
    key: 'whatsapp', 
    name: 'واتساب', 
    icon: MessageCircle, 
    placeholder: '966512345678 (رمز الدولة + الرقم)',
    color: 'from-green-500 to-green-600',
    isPhoneNumber: true
  },
  { 
    key: 'youtube', 
    name: 'يوتيوب', 
    icon: Youtube, 
    placeholder: 'https://youtube.com/@channel',
    color: 'from-red-500 to-red-600'
  },
  { 
    key: 'linkedin', 
    name: 'لينكد إن', 
    icon: Linkedin, 
    placeholder: 'https://linkedin.com/in/username',
    color: 'from-blue-700 to-blue-800'
  },
  { 
    key: 'tiktok', 
    name: 'تيك توك', 
    icon: TikTokIcon, 
    placeholder: 'https://tiktok.com/@username',
    color: 'from-gray-900 to-black'
  },
];

const SocialLinksSection: React.FC<SocialLinksSectionProps> = ({
  socialLinks,
  onSocialLinkChange
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25 }}
      className="bg-card border border-border/50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-foreground">
        <Globe className="w-5 h-5 text-primary" />
        روابط التواصل الاجتماعي
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        أضف روابط حساباتك على وسائل التواصل الاجتماعي ليتمكن متابعوك من الوصول إليك بسهولة
      </p>
      
      <div className="grid gap-5">
        {socialPlatformConfig.map((platform, index) => {
          const Icon = platform.icon;
          const value = socialLinks[platform.key as keyof typeof socialLinks] || '';
          
          return (
            <motion.div
              key={platform.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="space-y-2"
            >
              <Label 
                htmlFor={platform.key} 
                className="text-sm font-medium flex items-center gap-2"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-white shadow-sm`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span>{platform.name}</span>
                {value && (
                  <span className="text-xs text-green-500 font-normal mr-auto">✓ متصل</span>
                )}
              </Label>
              <div className="relative">
                {(platform as any).isPhoneNumber ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-3 rounded-lg border border-border/50">
                      wa.me/
                    </span>
                    <Input
                      id={platform.key}
                      value={value.replace(/^https?:\/\/wa\.me\//, '')}
                      onChange={(e) => {
                        // السماح بعلامة + في البداية فقط والأرقام (يدعم لصق رابط كامل)
                        let input = e.target.value || '';

                        input = input
                          .replace(/^https?:\/\/(www\.)?wa\.me\//i, '')
                          .replace(/^wa\.me\//i, '')
                          .replace(/^https?:\/\/(www\.)?api\.whatsapp\.com\/send\?phone=/i, '')
                          .replace(/.*[?&]phone=/i, '');

                        let cleanValue = '';
                        for (let i = 0; i < input.length; i++) {
                          const char = input[i];
                          if (char === '+' && i === 0 && cleanValue === '') {
                            cleanValue += char;
                          } else if (/\d/.test(char)) {
                            cleanValue += char;
                          }
                        }
                        onSocialLinkChange(platform.key, cleanValue);
                      }}
                      className="bg-background/50 border-border/50 focus:border-primary transition-all duration-300 h-12 pr-4 text-left dir-ltr flex-1"
                      placeholder={platform.placeholder}
                      dir="ltr"
                      type="tel"
                      inputMode="numeric"
                    />
                  </div>
                ) : (
                  <Input
                    id={platform.key}
                    value={value}
                    onChange={(e) => onSocialLinkChange(platform.key, e.target.value)}
                    className="bg-background/50 border-border/50 focus:border-primary transition-all duration-300 h-12 pr-4 text-left dir-ltr"
                    placeholder={platform.placeholder}
                    dir="ltr"
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* نصائح */}
      <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
        <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          نصائح مهمة
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• تأكد من إضافة الرابط الكامل (مثال: https://instagram.com/username)</li>
          <li>• للواتساب، أدخل رقمك مع رمز الدولة (مثال: +212612345678 أو 212612345678)</li>
          <li>• الروابط ستظهر للمستخدمين عند الضغط على زر المتابعة</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default SocialLinksSection;
