import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ onInstall, onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // التحقق من حالة التثبيت
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
      setShowInstallPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    onDismiss?.();
  };

  if (!showInstallPrompt || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-2 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-2 py-1 flex items-center gap-1 max-w-[140px]">
        <button 
          onClick={handleInstallClick}
          aria-label="تثبيت التطبيق"
          className="text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          تثبيت
        </button>
        <button 
          onClick={handleInstallClick}
          aria-label="تثبيت التطبيق"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <Download className="h-3 w-3" aria-hidden="true" />
        </button>
        <button 
          onClick={handleDismiss}
          aria-label="إغلاق نافذة التثبيت"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;