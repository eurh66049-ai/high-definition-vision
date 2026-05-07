
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FavoritesContextType = {
  favorites: string[];
  addToFavorites: (bookId: number | string) => Promise<void>;
  removeFromFavorites: (bookId: number | string) => Promise<void>;
  isFavorite: (bookId: number | string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};

type FavoritesProviderProps = {
  children: ReactNode;
};

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const { user } = useAuth();

  // تحميل المفضلة عند تغيير المستخدم
  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        try {
          
          
          // جلب من approved_books أولاً
          const { data: approvedData, error: approvedError } = await supabase
            .from('book_recommendations')
            .select('book_id')
            .eq('user_id', user.id);

          if (approvedError) {
            console.error('خطأ في تحميل المفضلة:', approvedError);
            return;
          }
          
          if (approvedData) {
            console.log('بيانات المفضلة من Supabase:', approvedData);
            
            // تحويل جميع المعرفات إلى نص وإزالة التكرارات
            const uniqueFavorites = Array.from(
              new Set(approvedData.map(item => String(item.book_id)))
            );
            
            console.log('معرفات المفضلة بعد التحليل والتنقية:', uniqueFavorites);
            console.log('عدد العناصر في المفضلة:', uniqueFavorites.length);
            
            setFavorites(uniqueFavorites);
          }
        } catch (error) {
          console.error('خطأ في تحميل المفضلة:', error);
        }
      } else {
        setFavorites([]);
      }
    };

    loadFavorites();
  }, [user]);

  const addToFavorites = async (bookId: number | string) => {
    if (!user) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    try {
      const bookIdStr = String(bookId);
      console.log('إضافة إلى المفضلة، معرف الكتاب:', bookIdStr, 'نوع البيانات:', typeof bookId);
      
      // التحقق مما إذا كان هذا الكتاب موجودًا بالفعل في المفضلة
      if (isFavorite(bookIdStr)) {
        console.log('الكتاب موجود بالفعل في المفضلة');
        return;
      }
      
      // إضافة الكتاب إلى المفضلة في قاعدة البيانات
      const { data: existingFavorite, error: checkError } = await supabase
        .from('book_recommendations')
        .select('id')
        .eq('book_id', bookIdStr)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('خطأ في التحقق من وجود المفضلة:', checkError);
        throw checkError;
      }
      
      if (existingFavorite) {
        console.log('الكتاب موجود بالفعل في المفضلة في قاعدة البيانات');
        // تحديث الحالة المحلية في حالة عدم التطابق
        setFavorites(prev => {
          const uniqueSet = new Set([...prev, bookIdStr]);
          return Array.from(uniqueSet);
        });
        return;
      }
      
      // إضافة الكتاب إلى المفضلة
      const { error } = await supabase
        .from('book_recommendations')
        .insert({ 
          book_id: bookIdStr, 
          user_id: user.id 
        });

      if (error) {
        console.error('خطأ في Supabase عند الإضافة:', error);
        throw error;
      }
      
      console.log('تم إضافة الكتاب بنجاح إلى قاعدة البيانات');
      
      // تحديث الحالة المحلية
      setFavorites(prev => {
        const uniqueSet = new Set([...prev, bookIdStr]);
        const newFavorites = Array.from(uniqueSet);
        console.log('الحالة المحلية الجديدة للمفضلة:', newFavorites);
        return newFavorites;
      });
      
    } catch (error) {
      console.error('خطأ في إضافة المفضلة:', error);
      throw error;
    }
  };

  const removeFromFavorites = async (bookId: number | string) => {
    if (!user) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    try {
      const bookIdStr = String(bookId);
      console.log('إزالة من المفضلة، معرف الكتاب:', bookIdStr);
      
      const { error } = await supabase
        .from('book_recommendations')
        .delete()
        .eq('book_id', bookIdStr)
        .eq('user_id', user.id);

      if (error) {
        console.error('خطأ في Supabase عند الإزالة:', error);
        throw error;
      }
      
      console.log('تم حذف الكتاب بنجاح من قاعدة البيانات');
      
      // تحديث الحالة المحلية
      setFavorites(prev => {
        const newFavorites = prev.filter(id => id !== bookIdStr);
        console.log('الحالة المحلية الجديدة بعد الحذف:', newFavorites);
        return newFavorites;
      });
      
    } catch (error) {
      console.error('خطأ في إزالة المفضلة:', error);
      throw error;
    }
  };

  const isFavorite = (bookId: number | string) => {
    const bookIdStr = String(bookId);
    const result = favorites.includes(bookIdStr);
    console.log(`التحقق من المفضلة للكتاب ${bookIdStr}:`, result, 'قائمة المفضلة الحالية:', favorites);
    return result;
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addToFavorites, removeFromFavorites, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesProvider;
