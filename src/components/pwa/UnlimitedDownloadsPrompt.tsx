import { useEffect } from 'react';
import { toast } from 'sonner';
import { Infinity } from 'lucide-react';

const STORAGE_KEY = 'unlimited_downloads_prompt_seen_v1';

const UnlimitedDownloadsPrompt: React.FC = () => {
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    const timer = setTimeout(() => {
      toast('تحميل بلا حدود! 🎉', {
        description: 'يمكنك تحميل أي كتاب تريده من موقعنا دون أي حدود يومية، مجاناً.',
        duration: 8000,
        icon: <Infinity className="h-5 w-5 text-primary" />,
      });
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return null;
};

export default UnlimitedDownloadsPrompt;
