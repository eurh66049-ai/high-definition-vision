
import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, parameters: {
        sitekey: string;
        callback?: (response: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
        theme?: 'light' | 'dark';
        size?: 'normal' | 'compact';
      }) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

export interface ReCaptchaProps {
  siteKey: string;
  action?: string;
  onVerify: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  className?: string;
}

export const ReCaptcha: React.FC<ReCaptchaProps> = ({
  siteKey,
  action = 'submit',
  onVerify,
  onExpired,
  onError,
  theme = 'light',
  size = 'normal',
  className = ''
}) => {
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  useEffect(() => {
    // تحميل سكريبت reCAPTCHA v2
    const loadRecaptcha = () => {
      if (window.grecaptcha) {
        setIsLoaded(true);
        return;
      }

      // إضافة السكريبت إذا لم يكن موجوداً
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    };

    loadRecaptcha();
  }, []);

  useEffect(() => {
    if (isLoaded && recaptchaRef.current && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        if (recaptchaRef.current && !widgetId) {
          const id = window.grecaptcha.render(recaptchaRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            'expired-callback': onExpired,
            'error-callback': onError,
            theme,
            size
          });
          setWidgetId(id);
        }
      });
    }

    // تنظيف عند إلغاء التحميل
    return () => {
      if (widgetId !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetId);
      }
    };
  }, [isLoaded, siteKey, onVerify, onExpired, onError, theme, size]);

  const reset = () => {
    if (widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetId);
    }
  };

  return (
    <div className={className}>
      <div ref={recaptchaRef} />
    </div>
  );
};

export default ReCaptcha;
