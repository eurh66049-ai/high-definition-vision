/**
 * دالة لتنسيق التوقيت للعرض بالعربية
 */
export const formatLastSeen = (lastSeen: string | null, isOnline: boolean): string => {
  if (isOnline) {
    return "نشط الآن";
  }
  
  if (!lastSeen) {
    return "غير نشط";
  }

  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now.getTime() - lastSeenDate.getTime();
  
  // أقل من دقيقة
  if (diffMs < 60000) {
    return "نشط الآن";
  }
  
  // أقل من ساعة
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000);
    return `نشط منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
  }
  
  // أقل من يوم
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000);
    return `نشط منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
  }
  
  // أقل من أسبوع
  if (diffMs < 604800000) {
    const days = Math.floor(diffMs / 86400000);
    return `نشط منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
  }
  
  // أكثر من أسبوع - عرض التاريخ
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return `نشط في ${lastSeenDate.toLocaleDateString('ar-SA', dateOptions)}`;
};

/**
 * دالة لتنسيق توقيت الرسالة
 */
export const formatMessageTime = (timestamp: string): string => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - messageDate.getTime();
  
  // أقل من دقيقة
  if (diffMs < 60000) {
    return "الآن";
  }
  
  // أقل من ساعة
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes}د`;
  }
  
  // نفس اليوم
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // أمس
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return `أمس ${messageDate.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }
  
  // أكثر من يومين
  return messageDate.toLocaleDateString('ar-SA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * دالة للتحقق من كون المستخدم نشط (آخر 5 دقائق)
 */
export const isUserOnline = (lastSeen: string | null): boolean => {
  if (!lastSeen) return false;
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now.getTime() - lastSeenDate.getTime();
  
  // نشط إذا كان آخر نشاط خلال آخر 5 دقائق
  return diffMs < 300000; // 5 * 60 * 1000
};