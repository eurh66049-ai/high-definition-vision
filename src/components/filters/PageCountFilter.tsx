
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

interface PageCountFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface PageRangeOption {
  value: string;
  label: string;
  count: number;
}

export const PageCountFilter: React.FC<PageCountFilterProps> = ({
  value,
  onValueChange,
  className = ""
}) => {
  const [pageRanges, setPageRanges] = useState<PageRangeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchPageRanges();
  }, []);

  const fetchPageRanges = async () => {
    try {
      // استخدام استعلام محدود لعدد الصفحات فقط
      const { data, error } = await supabase
        .from('book_submissions')
        .select('page_count')
        .eq('status', 'approved')
        .limit(1000); // حد أقصى 1000 كتاب للتحليل

      if (error) {
        console.error('Error fetching page counts:', error);
        return;
      }

      // حساب نطاقات الصفحات
      let shortCount = 0;
      let mediumCount = 0;
      let longCount = 0;
      let unknownCount = 0;

      (data || []).forEach(book => {
        const pages = book.page_count || 0;
        if (pages === 0) {
          unknownCount++;
        } else if (pages <= 100) {
          shortCount++;
        } else if (pages <= 300) {
          mediumCount++;
        } else {
          longCount++;
        }
      });

      // الحصول على العدد الإجمالي
      const { data: totalCountData, error: countError } = await supabase.rpc('get_approved_books_count');
      const totalCount = totalCountData || 0;

      const ranges: PageRangeOption[] = [
        { value: 'all', label: `جميع الصفحات (${totalCount})`, count: totalCount }
      ];

      if (shortCount > 0) {
        ranges.push({ value: 'short', label: `قصير - أقل من 100 صفحة (${shortCount})`, count: shortCount });
      }

      if (mediumCount > 0) {
        ranges.push({ value: 'medium', label: `متوسط - 100-300 صفحة (${mediumCount})`, count: mediumCount });
      }

      if (longCount > 0) {
        ranges.push({ value: 'long', label: `طويل - أكثر من 300 صفحة (${longCount})`, count: longCount });
      }

      if (unknownCount > 0) {
        ranges.push({ value: 'unknown', label: `غير محدد (${unknownCount})`, count: unknownCount });
      }

      setPageRanges(ranges);
    } catch (error) {
      console.error('Error fetching page ranges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (newValue: string) => {
    console.log('تغيير عدد الصفحات:', newValue);
    
    // استدعاء callback مباشرة - بدون تحديث الصفحة
    onValueChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-full bg-background border-border text-foreground ${className}`}>
        <SelectValue placeholder={loading ? "جاري التحميل..." : "عدد الصفحات"} />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {pageRanges.map((range) => (
          <SelectItem 
            key={range.value} 
            value={range.value}
            className="text-foreground hover:bg-accent focus:bg-accent"
          >
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
