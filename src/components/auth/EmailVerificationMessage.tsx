
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, RefreshCw, AlertCircle, Mail, Clock, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmailVerificationMessageProps {
  email: string;
  onResendEmail: () => void;
  resendCooldown: number;
  isResending?: boolean;
}

export const EmailVerificationMessage: React.FC<EmailVerificationMessageProps> = ({
  email,
  onResendEmail,
  resendCooldown,
  isResending = false
}) => {
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const troubleshootingSteps = [
    {
      id: 'inbox',
      title: 'تحقق من صندوق الوارد الرئيسي',
      description: 'ابحث عن رسالة من منصة كتبي'
    },
    {
      id: 'spam',
      title: 'فحص مجلد الرسائل المزعجة (Spam)',
      description: 'قد تكون الرسالة في مجلد Spam أو Junk'
    },
    {
      id: 'promotions',
      title: 'فحص مجلد الترويج (Promotions)',
      description: 'في Gmail، تحقق من تبويب Promotions'
    },
    {
      id: 'wait',
      title: 'انتظار 5-10 دقائق',
      description: 'أحياناً تستغرق الرسائل وقتاً للوصول'
    }
  ];

  const toggleStep = (stepId: string) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const emailDomain = email.split('@')[1];
  const isGmail = emailDomain === 'gmail.com';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            {/* Header */}
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">تحقق من بريدك الإلكتروني</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                تم إرسال رسالة تحقق إلى:
              </p>
              <div className="bg-blue-50 rounded-lg p-3 mt-2 flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <p className="text-blue-600 font-medium break-all">{email}</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm mb-2 font-medium">
                يرجى النقر على رابط التأكيد في الرسالة لتفعيل حسابك
              </p>
              <div className="flex items-center justify-center gap-1 text-blue-600 text-xs">
                <Clock className="h-3 w-3" />
                <span>عادة ما تصل الرسالة خلال 1-5 دقائق</span>
              </div>
            </div>

            {/* Troubleshooting Steps */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-800 mb-3 text-right">خطوات المساعدة:</h3>
              <div className="space-y-2">
                {troubleshootingSteps.map((step) => (
                  <div 
                    key={step.id}
                    className={`p-3 rounded-lg border text-right cursor-pointer transition-colors ${
                      checkedSteps[step.id] 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => toggleStep(step.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        checkedSteps[step.id] 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-300'
                      }`}>
                        {checkedSteps[step.id] && (
                          <CheckSquare className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{step.title}</p>
                        <p className="text-xs text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gmail Specific Help */}
            {isGmail && (
              <div className="bg-yellow-50 rounded-lg p-4 mb-6 text-right">
                <h4 className="text-sm font-bold text-yellow-800 mb-2">نصائح خاصة بـ Gmail:</h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• افتح Gmail وتحقق من تبويبات: Primary, Promotions, Social</li>
                  <li>• ابحث عن "كتبي" أو "kotobati" في مربع البحث</li>
                  <li>• تحقق من إعدادات التصفية في Gmail</li>
                </ul>
              </div>
            )}

            {/* Resend Button */}
            <div className="space-y-4">
              <Button
                onClick={onResendEmail}
                disabled={resendCooldown > 0 || isResending}
                variant="outline"
                className="w-full py-3"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    إعادة الإرسال بعد {resendCooldown} ثانية
                  </>
                ) : (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    إعادة إرسال رسالة التحقق
                  </>
                )}
              </Button>
            </div>

            {/* Footer Help */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start gap-3 text-right">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-500 space-y-2">
                  <p><strong>ما زلت لا تستلم الرسالة؟</strong></p>
                  <div className="space-y-1">
                    <p>✓ تأكد من صحة البريد الإلكتروني المدخل</p>
                    <p>✓ جرب استخدام بريد إلكتروني آخر</p>
                    <p>✓ تواصل مع الدعم إذا استمرت المشكلة</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
