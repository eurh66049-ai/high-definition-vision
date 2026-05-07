import React, { useState } from 'react';
import { Megaphone, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSiteUpdates } from '@/hooks/useSiteUpdates';
import kotobiTeamLogo from '@/assets/kotobi-team-logo.png';

interface SiteUpdatesDropdownProps {
  children: React.ReactNode;
}

const SiteUpdatesDropdown: React.FC<SiteUpdatesDropdownProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { updates, loading, hasUnread, markAllAsRead } = useSiteUpdates();

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && hasUnread) {
      await markAllAsRead();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysOfWeek = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];
    const monthsOfYear = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const dayName = daysOfWeek[date.getDay()];
    const monthName = monthsOfYear[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayName}، ${day} ${monthName} ${year} - ${hours}:${minutes}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="relative bg-transparent border-0 p-0 cursor-pointer">
          {children}
          {hasUnread && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </button>
      </PopoverTrigger>

      {/* نافذة منسدلة شفافة */}
      <PopoverContent
        className="w-96 p-0 rounded-2xl bg-card/90 backdrop-blur-md border border-border shadow-lg"
        align="end"
      >
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4" />
                تحديثات الموقع
              </CardTitle>
              {updates.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {updates.length} تحديث
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {loading ? (
                <div className="text-center p-6 text-sm text-muted-foreground">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {updates.length === 0 && (
                    <div className="text-center p-4 text-sm text-muted-foreground">لا توجد تحديثات حالياً</div>
                  )}

                  {updates.map((update, index) => (
                    <div key={update.id}>
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(update.created_at)}</span>
                      </div>

                      <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={kotobiTeamLogo} alt="فريق كتبي" />
                            <AvatarFallback>ك</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                              فريق كتبي
                            </h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              📢 {update.title}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed whitespace-pre-wrap text-right" dir="rtl">
                          {update.message}
                        </p>
                        {(update as any).image_url && (
                          <img src={(update as any).image_url} alt={update.title} className="mt-2 w-full rounded-lg border border-blue-200/50 dark:border-blue-800/50" />
                        )}
                      </div>

                      {index < updates.length - 1 && (
                        <div className="border-b border-border my-4" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default SiteUpdatesDropdown;