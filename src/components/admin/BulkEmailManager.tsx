import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Users, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import emailjs from '@emailjs/browser';

// إعدادات EmailJS لإرسال البريد الجماعي
// الحساب 1
const ACCOUNT_1 = {
  serviceId: 'service_v29xntm',
  templateId: 'template_6q1ldo2',
  publicKey: 'tv1jCvzkPjpgKrilM',
};

// الحساب 2 - سيتم إضافته لاحقاً
const ACCOUNT_2 = {
  serviceId: '',
  templateId: '',
  publicKey: '',
};

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

const BulkEmailManager: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const fetchAllUserEmails = async (): Promise<string[]> => {
    const emails: string[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('خطأ في جلب الإيميلات:', error);
        break;
      }

      if (data && data.length > 0) {
        const validEmails = data
          .map((p: any) => p.email)
          .filter((e: string | null) => e && e.includes('@'));
        emails.push(...validEmails);
        page++;
        if (data.length < pageSize) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    return [...new Set(emails)];
  };

  const handlePreview = async () => {
    const emails = await fetchAllUserEmails();
    setTotalUsers(emails.length);
    toast({
      title: `عدد المستخدمين: ${emails.length}`,
      description: 'هذا هو عدد المستخدمين الذين سيصلهم البريد',
    });
  };

  const handleSend = async () => {
    if (!subject.trim() || !messageBody.trim() || !messageTitle.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة (العنوان، عنوان الرسالة، نص الرسالة)',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من إرسال هذا البريد لجميع المستخدمين؟\n\nالموضوع: ${subject}\nعنوان الرسالة: ${messageTitle}`
    );
    if (!confirmed) return;

    setSending(true);
    setResults([]);
    setProgress(0);

    try {
      const emails = await fetchAllUserEmails();
      setTotalUsers(emails.length);

      if (emails.length === 0) {
        toast({
          title: 'لا يوجد مستخدمين',
          description: 'لم يتم العثور على أي بريد إلكتروني للمستخدمين',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      const sendResults: SendResult[] = [];

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        // التناوب بين الحسابين
        const account = i % 2 === 0 ? ACCOUNT_1 : ACCOUNT_2;
        // إذا الحساب 2 غير مُعد بعد، استخدم الحساب 1 فقط
        const activeAccount = account.serviceId ? account : ACCOUNT_1;
        try {
          const templateParams: Record<string, string> = {
              to_email: email,
              title: subject,
              name: 'كُتبي',
              email: 'noreply@kotobi.xyz',
              message_title: messageTitle,
              message_body: messageBody,
            };
          await emailjs.send(
            activeAccount.serviceId,
            activeAccount.templateId,
            templateParams,
            activeAccount.publicKey
          );
          sendResults.push({ email, success: true });
        } catch (error: any) {
          sendResults.push({
            email,
            success: false,
            error: error?.text || error?.message || 'خطأ غير معروف',
          });
        }

        setProgress(Math.round(((i + 1) / emails.length) * 100));
        setResults([...sendResults]);

        // تأخير لتجنب rate limiting
        if (i < emails.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      const successCount = sendResults.filter((r) => r.success).length;
      const failCount = sendResults.filter((r) => !r.success).length;

      toast({
        title: 'تم الإرسال',
        description: `نجح: ${successCount} | فشل: ${failCount} من أصل ${emails.length}`,
      });
    } catch (error) {
      console.error('خطأ عام:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الإرسال',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Mail className="h-6 w-6 text-primary" />
            إرسال بريد جماعي لجميع المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* موضوع البريد */}
          <div className="space-y-2">
            <label className="text-sm font-medium">موضوع البريد (Subject) *</label>
            <Input
              placeholder="مثال: رسالة مهمة من كتبي"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              dir="rtl"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              هذا هو عنوان البريد الذي يظهر في صندوق الوارد — يُرسل كـ <code>subject</code> في EmailJS
            </p>
          </div>

          {/* عنوان الرسالة */}
          <div className="space-y-2">
            <label className="text-sm font-medium">عنوان الرسالة (داخل البريد) *</label>
            <Input
              placeholder="مثال: 🎉 مرحباً بك في تحديث جديد!"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              dir="rtl"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              يُرسل كـ <code>message_title</code> — يظهر كعنوان كبير داخل البريد
            </p>
          </div>

          {/* نص الرسالة */}
          <div className="space-y-2">
            <label className="text-sm font-medium">نص الرسالة *</label>
            <Textarea
              placeholder="اكتب رسالتك هنا... يمكنك استخدام عدة أسطر"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              dir="rtl"
              rows={6}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              يُرسل كـ <code>message_body</code> — النص الرئيسي للرسالة
            </p>
          </div>



          {/* أزرار */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button onClick={handlePreview} variant="outline" disabled={sending}>
              <Users className="h-4 w-4 ml-2" />
              عرض عدد المستخدمين
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !messageBody.trim() || !messageTitle.trim()}
              className="bg-primary"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              {sending ? `جاري الإرسال... ${progress}%` : 'إرسال للجميع'}
            </Button>
          </div>

          {totalUsers !== null && !sending && results.length === 0 && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              سيتم الإرسال إلى <strong>{totalUsers}</strong> مستخدم
            </div>
          )}
        </CardContent>
      </Card>

      {/* شريط التقدم */}
      {sending && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>التقدم: {progress}%</span>
                <span>
                  {results.length} / {totalUsers || '?'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" /> نجح: {successCount}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" /> فشل: {failCount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نتائج الإرسال */}
      {results.length > 0 && !sending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">نتائج الإرسال</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Badge variant="default" className="text-sm">
                <CheckCircle className="h-3 w-3 ml-1" /> نجح: {successCount}
              </Badge>
              <Badge variant="destructive" className="text-sm">
                <XCircle className="h-3 w-3 ml-1" /> فشل: {failCount}
              </Badge>
            </div>

            {failCount > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> الإيميلات التي فشلت:
                </p>
                {results
                  .filter((r) => !r.success)
                  .map((r, i) => (
                    <div key={i} className="text-xs bg-destructive/10 p-2 rounded">
                      {r.email} — {r.error}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* دليل إعداد EmailJS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            دليل إعداد قالب EmailJS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>لكي يعمل الإرسال الجماعي، يجب إعداد قالب في EmailJS بالمتغيرات التالية:</p>
          
          <div className="bg-muted p-4 rounded-lg space-y-2 text-xs font-mono" dir="ltr">
            <p><strong>الحساب 1:</strong> {ACCOUNT_1.serviceId} / {ACCOUNT_1.templateId}</p>
            <p><strong>الحساب 2:</strong> {ACCOUNT_2.serviceId || 'لم يتم إعداده بعد'}</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">المتغيرات المطلوبة في القالب:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code className="bg-muted px-1 rounded">{'{{to_email}}'}</code> — بريد المستلم (ضعه في حقل To Email)</li>
              <li><code className="bg-muted px-1 rounded">{'{{title}}'}</code> — موضوع البريد (ضعه في حقل Subject)</li>
              <li><code className="bg-muted px-1 rounded">{'{{message_title}}'}</code> — عنوان الرسالة داخل البريد</li>
              <li><code className="bg-muted px-1 rounded">{'{{message_body}}'}</code> — النص الرئيسي للرسالة</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkEmailManager;
