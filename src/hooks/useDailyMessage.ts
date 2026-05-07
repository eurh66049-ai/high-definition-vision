import { useState, useEffect } from 'react';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';

interface DailyMessage {
  message: string;
  date: string;
  dayName: string;
  timestamp: string;
  isDefault?: boolean;
}

export const useDailyMessage = () => {
  const [message, setMessage] = useState<DailyMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: functionError } = await supabaseFunctions.functions.invoke('daily-messages');
      
      if (functionError) {
        console.error('Error calling daily-messages function:', functionError);
        throw new Error('فشل في جلب الرسالة اليومية');
      }
      
      setMessage(data);
      
      // حفظ الرسالة في localStorage مع التاريخ
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('dailyMessage', JSON.stringify({
        ...data,
        cachedDate: today
      }));
      
    } catch (err) {
      console.error('Error fetching daily message:', err);
      setError(err instanceof Error ? err.message : 'خطأ في جلب الرسالة اليومية');
      
      // محاولة استخدام الرسالة المحفوظة
      const cachedData = localStorage.getItem('dailyMessage');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const today = new Date().toISOString().split('T')[0];
          
          // إذا كانت الرسالة المحفوظة لنفس اليوم
          if (parsed.cachedDate === today) {
            setMessage(parsed);
            setError(null);
          }
        } catch {
          // في حالة فشل parsing، استخدم رسالة افتراضية
          setDefaultMessage();
        }
      } else {
        setDefaultMessage();
      }
    } finally {
      setLoading(false);
    }
  };

  const setDefaultMessage = () => {
    const today = new Date();
    const daysOfWeek = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];
    
    setMessage({
      message: 'القراءة رحلة ممتعة تأخذك إلى عوالم جديدة من المعرفة والإلهام. كل كتاب تقرؤه يضيف إلى شخصيتك بعداً جديداً ويوسع آفاق تفكيرك.',
      date: today.toISOString().split('T')[0],
      dayName: daysOfWeek[today.getDay()],
      timestamp: today.toISOString(),
      isDefault: true
    });
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // فحص الرسالة المحفوظة محلياً
    const cachedData = localStorage.getItem('dailyMessage');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        
        // حذف الرسائل التي تحتوي على النص المحدد (الرسالة القديمة)
        if (parsed.message && parsed.message.includes('🎉 ميزة جديدة! تحديث مهم في نظام صور المؤلفين')) {
          localStorage.removeItem('dailyMessage');
        } else if (parsed.cachedDate === today) {
          // إذا كانت الرسالة لنفس اليوم ولا تحتوي على النص المحذوف، استخدمها
          setMessage(parsed);
          setLoading(false);
          return;
        }
      } catch {
        // في حالة فشل parsing، احذف البيانات الفاسدة
        localStorage.removeItem('dailyMessage');
      }
    }
    
    // جلب رسالة جديدة
    fetchDailyMessage();
  }, []);

  return {
    message,
    loading,
    error,
    refetch: fetchDailyMessage
  };
};