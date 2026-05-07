
import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from 'react-router-dom';

interface AuthorFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface AuthorOption {
  value: string;
  label: string;
  count: number;
}

export const AuthorFilter: React.FC<AuthorFilterProps> = ({
  value,
  onValueChange,
  className = "",
}) => {
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    try {
      // جلب المؤلفين مع عدد الكتب من الجدول الصحيح
      const { data, error } = await supabase
        .from("book_submissions")
        .select("author")
        .eq("status", "approved");

      if (error) {
        console.error("Error fetching authors:", error);
        return;
      }

      // حساب المؤلفين وعدد الكتب لكل مؤلف - تحسين الأداء
      const authorCountMap = new Map<string, number>();
      
      data?.forEach(book => {
        const author = book.author || "غير معروف";
        authorCountMap.set(author, (authorCountMap.get(author) || 0) + 1);
      });

      // تحويل إلى مصفوفة مرتبة
      const authorOptions: AuthorOption[] = Array.from(authorCountMap.entries())
        .map(([author, count]) => ({
          value: author,
          label: `${author} (${count})`,
          count: count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // نحد من عدد المؤلفين المعروضين لتحسين الأداء

      setAuthors([
        { value: "all", label: `جميع المؤلفين (${data?.length || 0})`, count: data?.length || 0 },
        ...authorOptions,
      ]);
    } catch (error) {
      console.error("Error fetching authors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (newValue: string) => {
    console.log('تغيير المؤلف:', newValue);
    
    // استدعاء callback مباشرة - بدون تحديث الصفحة
    onValueChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-full bg-background border-border text-foreground ${className}`}>
        <SelectValue placeholder={loading ? "جاري التحميل..." : "المؤلف"} />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {authors.map((author) => (
          <SelectItem
            key={author.value}
            value={author.value}
            className="text-foreground hover:bg-accent focus:bg-accent"
          >
            {author.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
