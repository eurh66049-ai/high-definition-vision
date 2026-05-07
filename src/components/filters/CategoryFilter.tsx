
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
import { getCategoryInArabic } from '@/utils/categoryTranslation';

interface CategoryFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  value,
  onValueChange,
  className = ""
}) => {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.rpc('get_categories_with_pagination', {
        p_limit: 100,
        p_offset: 0
      });

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // الحصول على العدد الإجمالي للكتب
      const { data: totalCount, error: countError } = await supabase.rpc('get_approved_books_count');
      
      if (countError) {
        console.error('Error fetching total count:', countError);
        return;
      }

      // تحويل إلى مصفوفة وترجمة التصنيفات للعربية
      const categoryOptions: CategoryOption[] = (data || []).map(({ category, count }) => ({
        value: category,
        label: `${getCategoryInArabic(category)} (${count})`,
        count: Number(count)
      }));

      setCategories([
        { value: 'all', label: `جميع التصنيفات (${totalCount || 0})`, count: totalCount || 0 },
        ...categoryOptions
      ]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (newValue: string) => {
    console.log('تغيير التصنيف:', newValue);
    
    // استدعاء callback مباشرة - بدون تحديث الصفحة
    onValueChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-full bg-background border-border text-foreground ${className}`}>
        <SelectValue placeholder={loading ? "جاري التحميل..." : "التصنيف"} />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {categories.map((category) => (
          <SelectItem 
            key={category.value} 
            value={category.value}
            className="text-foreground hover:bg-accent focus:bg-accent"
          >
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
