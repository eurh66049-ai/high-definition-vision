import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock
} from 'lucide-react';

interface MobileUploadGuidanceProps {
  fileSize: number;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  connectionType: string;
}

const MobileUploadGuidance: React.FC<MobileUploadGuidanceProps> = ({
  fileSize,
  isMobile,
  isIOS,
  isAndroid,
  connectionType
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  const isLargeFile = fileSize > 10 * 1024 * 1024; // 10MB
  const isVeryLargeFile = fileSize > 50 * 1024 * 1024; // 50MB

  if (!isMobile || fileSize < 5 * 1024 * 1024) {
    return null; // لا تظهر للكمبيوتر أو الملفات الصغيرة
  }

  const getPlatformIcon = () => {
    if (isIOS) return "📱";
    if (isAndroid) return "🤖";
    return "📱";
  };

  const getPlatformSpecificTips = (): string[] => {
    const commonTips = [
      "تأكد من اتصال WiFi قوي ومستقر",
      "أغلق التطبيقات الأخرى لتوفير ذاكرة أكبر",
      "لا تغلق المتصفح أو التطبيق أثناء الرفع",
      "تأكد من شحن البطارية أو توصيل الشاحن"
    ];

    if (isIOS) {
      return [
        ...commonTips,
        "تجنب التبديل بين التطبيقات أثناء الرفع",
        "تأكد من تحديث Safari لآخر إصدار"
      ];
    }

    if (isAndroid) {
      return [
        ...commonTips,
        "تأكد من وجود مساحة كافية في الذاكرة",
        "فعّل وضع عدم الإزعاج لتجنب المقاطعات"
      ];
    }

    return commonTips;
  };

  const getEstimatedUploadTime = (): string => {
    // تقدير تقريبي بناءً على حجم الملف ونوع الاتصال
    const speedEstimate = connectionType === '4g' ? 2 * 1024 * 1024 : 1024 * 1024; // 2MB/s for 4G, 1MB/s for 3G/slower
    const estimatedSeconds = fileSize / speedEstimate;
    
    if (estimatedSeconds < 60) {
      return `${Math.ceil(estimatedSeconds)} ثانية`;
    } else if (estimatedSeconds < 3600) {
      return `${Math.ceil(estimatedSeconds / 60)} دقيقة`;
    } else {
      return `${Math.ceil(estimatedSeconds / 3600)} ساعة`;
    }
  };

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <Smartphone className="h-5 w-5" />
          {getPlatformIcon()} إرشادات الرفع للهواتف
          <Badge variant="outline" className="mr-auto text-orange-700 border-orange-300">
            {formatFileSize(fileSize)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* تحذير للملفات الكبيرة جداً */}
        {isVeryLargeFile && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>تحذير:</strong> ملف كبير جداً ({formatFileSize(fileSize)})! 
              قد يفشل الرفع على بعض الشبكات الضعيفة.
            </AlertDescription>
          </Alert>
        )}

        {/* معلومات الجهاز والاتصال */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Smartphone className="h-4 w-4" />
            <span>الجهاز: {isIOS ? 'iPhone/iPad' : isAndroid ? 'Android' : 'هاتف'}</span>
          </div>
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Wifi className="h-4 w-4" />
            <span>الشبكة: {connectionType || 'غير محدد'}</span>
          </div>
        </div>

        {/* الوقت المتوقع */}
        <div className="flex items-center gap-2 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
          <Clock className="h-4 w-4 text-orange-600" />
          <span className="text-orange-800 dark:text-orange-200 font-medium">
            الوقت المتوقع للرفع: {getEstimatedUploadTime()}
          </span>
        </div>

        {/* النصائح المخصصة للمنصة */}
        <div className="space-y-2">
          <h4 className="font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <Info className="h-4 w-4" />
            نصائح مهمة للرفع الناجح:
          </h4>
          <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
            {getPlatformSpecificTips().map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* نصائح إضافية للملفات الكبيرة */}
        {isLargeFile && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Download className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>للملفات الكبيرة:</strong> تتم معالجة الرفع عبر Supabase لتقليل فشل الاتصال، بدون تكرار محاولات تلقائية.
            </AlertDescription>
          </Alert>
        )}

        {/* تحذير البطارية */}
        <div className="flex items-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-950/20 rounded text-yellow-800 dark:text-yellow-200 text-sm">
          <Battery className="h-4 w-4" />
          <span>تأكد من شحن البطارية فوق 30% أو توصيل الشاحن</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileUploadGuidance;