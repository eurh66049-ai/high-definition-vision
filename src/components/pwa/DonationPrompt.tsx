import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';

interface DonationPromptProps {
  onDismiss?: () => void;
}

const DonationPrompt: React.FC<DonationPromptProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDonationClick = () => {
    window.location.href = '/donation';
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-2 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-2 py-1 flex items-center gap-1 max-w-[140px]">
        <button 
          onClick={handleDonationClick}
          aria-label="التبرع لدعم المنصة"
          className="text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          تبرع
        </button>
        <button 
          onClick={handleDonationClick}
          aria-label="التبرع لدعم المنصة"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <Heart className="h-3 w-3" aria-hidden="true" />
        </button>
        <button 
          onClick={handleDismiss}
          aria-label="إغلاق نافذة التبرع"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default DonationPrompt;