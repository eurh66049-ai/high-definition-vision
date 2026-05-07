
import { useState, useCallback } from 'react';

const RECAPTCHA_SITE_KEY = '6Lec1lYrAAAAAOGeWhZf9qygHUOATNvzknFQtoS4';

export interface UseRecaptchaReturn {
  isVerified: boolean;
  recaptchaToken: string | null;
  handleRecaptchaVerify: (token: string) => void;
  handleRecaptchaExpired: () => void;
  handleRecaptchaError: () => void;
  resetRecaptcha: () => void;
  siteKey: string;
}

export const useRecaptcha = (): UseRecaptchaReturn => {
  const [isVerified, setIsVerified] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const handleRecaptchaVerify = useCallback((token: string) => {
    console.log('reCAPTCHA verified:', token);
    setRecaptchaToken(token);
    setIsVerified(true);
  }, []);

  const handleRecaptchaExpired = useCallback(() => {
    console.log('reCAPTCHA expired');
    setRecaptchaToken(null);
    setIsVerified(false);
  }, []);

  const handleRecaptchaError = useCallback(() => {
    console.log('reCAPTCHA error');
    setRecaptchaToken(null);
    setIsVerified(false);
  }, []);

  const resetRecaptcha = useCallback(() => {
    setRecaptchaToken(null);
    setIsVerified(false);
  }, []);

  return {
    isVerified,
    recaptchaToken,
    handleRecaptchaVerify,
    handleRecaptchaExpired,
    handleRecaptchaError,
    resetRecaptcha,
    siteKey: RECAPTCHA_SITE_KEY
  };
};
