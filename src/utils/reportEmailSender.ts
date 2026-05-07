import emailjs from '@emailjs/browser';

// حساب EmailJS خاص بالتقرير الشهري فقط - منفصل تماماً عن باقي الحسابات
const REPORT_SERVICE_ID = 'service_3agasah';
const REPORT_TEMPLATE_ID = 'template_m3uhde2';
const REPORT_PUBLIC_KEY = '7motfxo2DeqloqU9r';

export const sendReport = async (params: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 إرسال التقرير الشهري...');
    const response = await emailjs.send(
      REPORT_SERVICE_ID,
      REPORT_TEMPLATE_ID,
      params,
      REPORT_PUBLIC_KEY
    );
    console.log('✅ تم إرسال التقرير بنجاح:', response.status, response.text);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error?.text || error?.message || JSON.stringify(error);
    console.error('❌ خطأ في إرسال التقرير:', errorMessage, error);
    return { success: false, error: errorMessage };
  }
};
