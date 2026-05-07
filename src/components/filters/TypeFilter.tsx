
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams } from 'react-router-dom';

interface TypeFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const types = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'كتاب', label: 'كتاب' },
  { value: 'رسالة', label: 'رسالة' },
  { value: 'مقالة', label: 'مقالة' },
  { value: 'بحث', label: 'بحث' },
  { value: 'أطروحة', label: 'أطروحة' },
  { value: 'مخطوطة', label: 'مخطوطة' },
  { value: 'ديوان', label: 'ديوان' },
  { value: 'موسوعة', label: 'موسوعة' }
];

export const TypeFilter: React.FC<TypeFilterProps> = ({
  value,
  onValueChange,
  className = ""
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleValueChange = (newValue: string) => {
    console.log('تغيير النوع:', newValue);
    
    // تحديث الـ URL parameters
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newValue && newValue !== 'all') {
        newParams.set('type', newValue);
      } else {
        newParams.delete('type');
      }
      return newParams;
    }, { replace: true });
    
    // استدعاء callback إذا كان متوفراً
    onValueChange(newValue);
    
    // تحديث الصفحة بعد تأخير قصير للسماح للمعاملات بالتحديث
    setTimeout(() => {
      console.log('🔄 تحديث الصفحة - تغيير النوع إلى:', newValue);
      window.location.reload();
    }, 100);
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-full bg-background border-border text-foreground ${className}`}>
        <SelectValue placeholder="النوع" />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {types.map((type) => (
          <SelectItem 
            key={type.value} 
            value={type.value}
            className="text-foreground hover:bg-accent focus:bg-accent"
          >
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
