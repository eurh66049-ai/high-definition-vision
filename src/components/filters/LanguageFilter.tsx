
import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';

interface LanguageFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface LanguageOption {
  value: string;
  label: string;
  count: number;
}

export const LanguageFilter: React.FC<LanguageFilterProps> = ({
  value,
  onValueChange,
  className = ""
}) => {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      // استخدام استعلام محدود للغات فقط
      const { data, error } = await supabase
        .from('book_submissions')
        .select('language')
        .eq('status', 'approved')
        .limit(1000); // حد أقصى 1000 كتاب للتحليل

      if (error) {
        console.error('Error fetching languages:', error);
        return;
      }

      // حساب اللغات وعددها
      const languageCount = (data || []).reduce((acc: Record<string, number>, book) => {
        const language = book.language || 'العربية';
        acc[language] = (acc[language] || 0) + 1;
        return acc;
      }, {});

      // الحصول على العدد الإجمالي
      const { data: totalCount, error: countError } = await supabase.rpc('get_approved_books_count');

      // تحويل إلى مصفوفة وترتيب حسب العدد
      const languageOptions: LanguageOption[] = Object.entries(languageCount)
        .map(([language, count]) => ({
          value: language,
          label: `${language} (${count})`,
          count: count as number
        }))
        .sort((a, b) => b.count - a.count);

      setLanguages([
        { value: 'all', label: `جميع اللغات (${totalCount || 0})`, count: totalCount || 0 },
        ...languageOptions
      ]);
    } catch (error) {
      console.error('Error fetching languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (newValue: string) => {
    console.log('تغيير اللغة:', newValue);
    
    // استدعاء callback مباشرة - بدون تحديث الصفحة
    onValueChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-full bg-background border-border text-foreground ${className}`}>
        <SelectValue placeholder={loading ? "جاري التحميل..." : "اللغة"} />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {languages.map((language) => (
          <SelectItem 
            key={language.value} 
            value={language.value}
            className="text-foreground hover:bg-accent focus:bg-accent"
          >
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
