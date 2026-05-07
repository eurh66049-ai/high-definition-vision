
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as authUtils from '@/utils/authUtils';

export interface EmailInputProps {
  value: string;
  onChange: (value: string, isRegistered: boolean | null) => void;
  checkExisting: boolean;
  placeholder?: string;
  className?: string;
}

export const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChange,
  checkExisting,
  placeholder = 'البريد الإلكتروني',
  className,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [checkError, setCheckError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue, isRegistered);
    
    if (isRegistered !== null) {
      setIsRegistered(null);
    }
    setCheckError(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const checkEmail = async () => {
      if (!debouncedValue || !debouncedValue.includes('@') || !checkExisting) {
        return;
      }
      
      setIsChecking(true);
      setCheckError(null);
      
      try {
        const exists = await authUtils.isEmailRegistered(debouncedValue);
        setIsRegistered(exists);
        onChange(debouncedValue, exists);
      } catch (error) {
        console.error('Error checking email:', error);
        setCheckError('فشل في التحقق من البريد الإلكتروني');
      } finally {
        setIsChecking(false);
      }
    };

    checkEmail();
  }, [debouncedValue, checkExisting]);

  const getStatusIcon = () => {
    if (!checkExisting || !value || !value.includes('@')) {
      return null;
    }

    if (isChecking) {
      return <Loader2 className="h-5 w-5 text-book-primary animate-spin" />;
    }

    if (checkError) {
      return (
        <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-xs text-yellow-600 font-bold">خطأ</span>
        </div>
      );
    }

    if (isRegistered === true) {
      return (
        <div className="flex items-center space-x-1 bg-red-50 px-2 py-1 rounded-full">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-600 font-bold">مسجل</span>
        </div>
      );
    }

    if (isRegistered === false) {
      return (
        <div className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-600 font-bold">متاح</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative">
      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-book-primary/50 h-5 w-5" />
      
      <Input
        type="email"
        dir="ltr"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn(
          "rtl pr-12 bg-muted/30 border-0 focus:border-book-primary transition-all rounded-xl py-6 font-cairo",
          checkError && "border-yellow-300 focus:border-yellow-500",
          className
        )}
      />
      
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        {getStatusIcon()}
      </div>

      {checkError && (
        <p className="text-xs text-yellow-600 mt-1 mr-2">
          {checkError} - جرب مرة أخرى
        </p>
      )}
    </div>
  );
};
