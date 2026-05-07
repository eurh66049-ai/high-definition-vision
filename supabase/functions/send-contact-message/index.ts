
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // معالجة طلبات CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { supportEmail, fromName, fromEmail, subject, message, userId } = await req.json()

    console.log('إرسال رسالة اتصال:', {
      supportEmail,
      fromName,
      fromEmail,
      subject: subject.substring(0, 50) + '...',
      userId
    })

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY غير موجود')
      throw new Error('RESEND_API_KEY غير موجود في متغيرات البيئة')
    }

    // إنشاء محتوى الرسالة
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>رسالة جديدة من موقع كتبي</title>
          <style>
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  direction: rtl;
                  text-align: right;
                  background-color: #f8fafc;
                  margin: 0;
                  padding: 20px;
              }
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  overflow: hidden;
              }
              .header {
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  color: white;
                  padding: 30px;
                  text-align: center;
              }
              .header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: bold;
              }
              .content {
                  padding: 30px;
              }
              .info-grid {
                  display: grid;
                  grid-template-columns: auto 1fr;
                  gap: 15px;
                  margin-bottom: 25px;
                  background: #f1f5f9;
                  padding: 20px;
                  border-radius: 8px;
              }
              .info-label {
                  font-weight: bold;
                  color: #475569;
                  white-space: nowrap;
              }
              .info-value {
                  color: #1e293b;
              }
              .message-content {
                  background: #fefefe;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 20px;
                  margin-top: 20px;
                  line-height: 1.6;
                  color: #334155;
              }
              .footer {
                  background: #f8fafc;
                  padding: 20px;
                  text-align: center;
                  font-size: 14px;
                  color: #64748b;
                  border-top: 1px solid #e2e8f0;
              }
              .subject-header {
                  background: #dbeafe;
                  color: #1e40af;
                  padding: 15px;
                  border-radius: 8px;
                  margin-bottom: 20px;
                  font-weight: bold;
                  text-align: center;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📧 رسالة جديدة من موقع كتبي</h1>
              </div>
              
              <div class="content">
                  <div class="subject-header">
                      الموضوع: ${subject}
                  </div>
                  
                  <div class="info-grid">
                      <span class="info-label">الاسم:</span>
                      <span class="info-value">${fromName}</span>
                      
                      <span class="info-label">البريد الإلكتروني:</span>
                      <span class="info-value">${fromEmail}</span>
                      
                      <span class="info-label">تاريخ الإرسال:</span>
                      <span class="info-value">${new Date().toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                      
                      ${userId ? `
                      <span class="info-label">معرف المستخدم:</span>
                      <span class="info-value">${userId}</span>
                      ` : ''}
                  </div>
                  
                  <div class="message-content">
                      <strong>محتوى الرسالة:</strong><br><br>
                      ${message.replace(/\n/g, '<br>')}
                  </div>
              </div>
              
              <div class="footer">
                  هذه الرسالة تم إرسالها من نموذج "اتصل بنا" في موقع كتبي<br>
                  للرد على هذه الرسالة، قم بالرد مباشرة على ${fromEmail}
              </div>
          </div>
      </body>
      </html>
    `

    // إرسال الرسالة باستخدام Resend
    const emailData = {
      from: 'موقع كتبي <noreply@resend.dev>',
      to: [supportEmail],
      reply_to: fromEmail,
      subject: `📧 رسالة جديدة من ${fromName} - ${subject}`,
      html: emailHtml
    }

    console.log('إرسال البريد الإلكتروني عبر Resend...')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('خطأ من Resend API:', errorText)
      throw new Error(`Resend API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('نتيجة إرسال البريد:', result)

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: result.id,
      message: 'تم إرسال رسالة الاتصال بنجاح'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('خطأ في إرسال رسالة الاتصال:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'حدث خطأ في إرسال الرسالة'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
