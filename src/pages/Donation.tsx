import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heart, Database, Users, Target, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/SEOHead";

// PayPal types
declare global {
  interface Window {
    paypal?: {
      HostedButtons: (config: { hostedButtonId: string }) => {
        render: (selector: string) => void;
      };
    };
  }
}

const Donation = () => {
  const [currentAmount, setCurrentAmount] = useState(0);
  const { toast } = useToast();
  
  const targetAmount = 30;
  const progressPercentage = Math.min((currentAmount / targetAmount) * 100, 100);
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);

  // Initialize PayPal button
  useEffect(() => {
    // تعيين علامة التبرع عند دخول المستخدم لصفحة التبرع
    sessionStorage.setItem('donation_page_visited', 'true');
    
    const initializePayPal = () => {
      if (window.paypal) {
        try {
          window.paypal.HostedButtons({
            hostedButtonId: "J5YMWJAG3T8RS",
          }).render("#paypal-container-J5YMWJAG3T8RS");
          
          // Force PayPal styling to always be readable
          setTimeout(() => {
            const paypalContainer = document.getElementById("paypal-container-J5YMWJAG3T8RS");
            if (paypalContainer) {
              // تعيين علامة أن المستخدم بدأ عملية التبرع عند النقر على PayPal
              paypalContainer.addEventListener('click', () => {
                sessionStorage.setItem('donation_initiated', 'true');
              });
              
              // Apply styles to ensure text and amounts are visible
              const style = document.createElement('style');
              style.textContent = `
                #paypal-container-J5YMWJAG3T8RS * {
                  color: #000 !important;
                  background-color: transparent !important;
                }
                #paypal-container-J5YMWJAG3T8RS input,
                #paypal-container-J5YMWJAG3T8RS button,
                #paypal-container-J5YMWJAG3T8RS select,
                #paypal-container-J5YMWJAG3T8RS span,
                #paypal-container-J5YMWJAG3T8RS div {
                  color: #000 !important;
                  font-weight: 600 !important;
                }
                #paypal-container-J5YMWJAG3T8RS iframe {
                  filter: none !important;
                }
              `;
              document.head.appendChild(style);
            }
          }, 500);
        } catch (error) {
          console.error('PayPal initialization error:', error);
        }
      }
    };

    // Check if PayPal is already loaded
    if (window.paypal) {
      initializePayPal();
    } else {
      // Wait for PayPal to load
      const checkPayPal = setInterval(() => {
        if (window.paypal) {
          clearInterval(checkPayPal);
          initializePayPal();
        }
      }, 100);

      // Clear interval after 10 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkPayPal), 10000);
    }
  }, []);

  return (
    <>
      <SEOHead
        title="ادعم مكتبتنا الرقمية - تبرع لمنصة كتبي"
        description="ساعدنا في الحفاظ على مكتبة الكتب المجانية وتوفير المحتوى التعليمي للجميع. تبرع الآن لدعم منصة كتبي المجانية بدون إعلانات مزعجة."
        keywords="تبرع, دعم, مكتبة رقمية, كتب مجانية, منصة كتبي, تبرعات, مساعدة, محتوى تعليمي, مكتبة عربية"
        canonical="https://kotobi.xyz/donation"
        ogType="website"
        ogImage="/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png"
      />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl"
           style={{ 
             fontFamily: 'Tajawal, sans-serif',
             fontWeight: '400',
             fontSize: '18px',
             lineHeight: '1.7'
           }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                style={{ 
                  fontFamily: 'Tajawal, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(28px, 5vw, 36px)'
                }}>
              ادعم مكتبتنا الرقمية
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto"
             style={{ 
               fontFamily: 'Tajawal, sans-serif',
               fontWeight: '400',
               fontSize: '20px',
               lineHeight: '1.8'
             }}>
            ساعدنا في الحفاظ على مكتبة الكتب المجانية وتوفير المحتوى التعليمي للجميع
          </p>
          
          {/* No Ads Message */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground mb-2"
                  style={{ 
                    fontFamily: 'Tajawal, sans-serif',
                    fontWeight: '400',
                    fontSize: '18px'
                  }}>
                📱 موقع بدون إعلانات مزعجة
              </h3>
              <p className="text-sm text-muted-foreground"
                 style={{ 
                   fontFamily: 'Tajawal, sans-serif',
                   fontWeight: '400',
                   fontSize: '15px',
                   lineHeight: '1.6'
                 }}>
                نحن نرفض وضع الإعلانات المزعجة في موقعنا لتوفير تجربة قراءة مريحة وممتعة للجميع.<br/>
                بدلاً من ذلك، نعتمد على تبرعاتكم الكريمة للحفاظ على الخدمة مجانية ونظيفة.
              </p>
            </div>
          </div>

          {/* Donation Examples */}
          <div className="mt-4 p-4 bg-accent/50 rounded-lg border border-border">
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground mb-3"
                  style={{ 
                    fontFamily: 'Tajawal, sans-serif',
                    fontWeight: '400',
                    fontSize: '18px'
                  }}>
                ✨ ساعدنا في بناء شيء رائع
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-card/50 rounded-lg border border-border">
                  <div className="text-3xl mb-2">🌱</div>
                  <p className="text-sm text-foreground font-bold">
                    ازرع بذرة المعرفة
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    كل تبرع صغير يساعد في نمو المكتبة
                  </p>
                </div>
                <div className="text-center p-3 bg-card/50 rounded-lg border border-border">
                  <div className="text-3xl mb-2">🚀</div>
                  <p className="text-sm text-foreground font-bold">
                    انطلق معنا للمستقبل
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    استثمر في مشروع تعليمي يخدم الجميع
                  </p>
                </div>
                <div className="text-center p-3 bg-card/50 rounded-lg border border-border">
                  <div className="text-3xl mb-2">💎</div>
                  <p className="text-sm text-foreground font-bold">
                    كن جزءاً من القصة
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ساهم في بناء مكتبة رقمية للأجيال القادمة
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-center text-foreground font-bold"
                   style={{ 
                     fontFamily: 'Tajawal, sans-serif',
                     fontWeight: '400',
                     fontSize: '14px',
                     lineHeight: '1.6'
                   }}>
                  🌟 كل دولار تتبرع به اليوم سيعود عليك بالمعرفة والفائدة مضاعفة غداً
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Donation Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"
                       style={{ 
                         fontFamily: 'Tajawal, sans-serif',
                         fontWeight: '400',
                         fontSize: '22px'
                       }}>
              <Gift className="h-5 w-5" />
              تبرع لدعم المكتبة
            </CardTitle>
            <CardDescription style={{ 
                               fontFamily: 'Tajawal, sans-serif',
                               fontWeight: '400',
                               fontSize: '16px'
                             }}>
              كل مساهمة تساعد في الحفاظ على الخدمة مجانية للجميع
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PayPal Hosted Button */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-secondary/10 to-primary/10 p-6 rounded-lg border border-secondary/20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    <span className="font-bold text-foreground" 
                          style={{ 
                            fontFamily: 'Tajawal, sans-serif',
                            fontWeight: '400',
                            fontSize: '16px'
                          }}>
                      تبرع بالمبلغ الذي تراه مناسباً
                    </span>
                  </div>
                  
                  {/* PayPal Hosted Button Container */}
                  <div id="paypal-container-J5YMWJAG3T8RS" className="w-full" 
                       style={{ 
                         backgroundColor: 'transparent !important',
                         color: 'inherit !important'
                       }}></div>
                  
                  <p className="text-xs text-center text-muted-foreground"
                     style={{ 
                       fontFamily: 'Tajawal, sans-serif',
                       fontWeight: '400',
                       fontSize: '13px'
                     }}>
                    تبرع بآمان باستخدام PayPal بالمبلغ الذي تختاره
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Donate Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"
                       style={{ 
                         fontFamily: 'Tajawal, sans-serif',
                         fontWeight: '400',
                         fontSize: '22px'
                       }}>
              <Database className="h-5 w-5" />
              لماذا نحتاج التبرعات؟
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 style={{ 
                         fontFamily: 'Tajawal, sans-serif',
                         fontWeight: '400',
                         fontSize: '18px'
                       }}>تخزين قاعدة البيانات</h3>
                    <p className="text-sm text-muted-foreground"
                       style={{ 
                         fontFamily: 'Tajawal, sans-serif',
                         fontWeight: '400',
                         fontSize: '15px'
                       }}>
                      تكلفة استضافة وتخزين آلاف الكتب والملفات
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 style={{ 
                         fontFamily: 'Tajawal, sans-serif',
                         fontWeight: '400',
                         fontSize: '18px'
                       }}>تحديثات وتحسينات</h3>
                    <p className="text-sm text-muted-foreground"
                       style={{ 
                         fontFamily: 'Tajawal, sans-serif',
                         fontWeight: '400',
                         fontSize: '15px'
                       }}>
                      تطوير الموقع وإضافة مميزات جديدة
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thank You Message */}
        <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20 mb-20">
          <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2"
              style={{ 
                fontFamily: 'Tajawal, sans-serif',
                fontWeight: '400',
                fontSize: '24px'
              }}>شكراً لدعمك</h3>
          <p className="text-muted-foreground"
             style={{ 
               fontFamily: 'Tajawal, sans-serif',
               fontWeight: '400',
               fontSize: '17px'
             }}>
            كل تبرع يساعد في بناء مجتمع تعليمي أفضل ومحتوى مجاني للجميع
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default Donation;