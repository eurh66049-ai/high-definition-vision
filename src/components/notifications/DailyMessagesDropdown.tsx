import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDailyMessage } from '@/hooks/useDailyMessage';
import { useDailyMessageReadStatus } from '@/hooks/useDailyMessageReadStatus';
import { toLatinDigits } from '@/utils/numberUtils';
import kotobiTeamLogo from '@/assets/kotobi-team-logo.png';

interface DailyMessagesDropdownProps {
  children: React.ReactNode;
}

const DailyMessagesDropdown: React.FC<DailyMessagesDropdownProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { message: dailyMessage, loading, refetch } = useDailyMessage();
  const { hasUnreadMessage, markAsRead, loading: readStatusLoading } = useDailyMessageReadStatus();

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    
    // عند فتح النافذة، تسجيل الرسالة كمقروءة
    if (open && hasUnreadMessage) {
      await markAsRead();
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
    
    return `${dayName}، ${day} ${monthName} ${year}`;
  };

  const getCurrentDate = () => {
    const today = new Date();
    const daysOfWeek = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];
    const monthsOfYear = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const dayName = daysOfWeek[today.getDay()];
    const monthName = monthsOfYear[today.getMonth()];
    const day = today.getDate();
    const year = today.getFullYear();
    
    return `${dayName}، ${day} ${monthName} ${year}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="relative">
          {children}
          {/* النقطة الحمراء للرسائل غير المقروءة */}
          {hasUnreadMessage && !readStatusLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                الرسالة اليومية
              </CardTitle>
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
              ) : dailyMessage ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(dailyMessage.date)}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
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
                            📖 رسالة اليوم
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed whitespace-pre-wrap text-right" dir="rtl">
                        {dailyMessage.message}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    لا توجد رسالة يومية متاحة حالياً
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refetch}
                    disabled={loading}
                  >
                    جرب مرة أخرى
                  </Button>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default DailyMessagesDropdown;