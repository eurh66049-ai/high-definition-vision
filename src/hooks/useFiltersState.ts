// Hook لإدارة حالة المرشحات وحفظها في NavigationHistory
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NavigationHistoryManager } from '@/utils/navigationHistory';

interface FiltersState {
  selectedCategory: string;
  selectedLanguage: string;
  selectedPageCount: string;
  selectedAuthor: string;
  searchTerm: string;
  displayedBooks: number;
  scrollPosition?: number;
}

interface UseFiltersStateOptions {
  defaultBooksPerPage?: number;
}

export const useFiltersState = (options: UseFiltersStateOptions = {}) => {
  const { defaultBooksPerPage = 24 } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  // حالة لمنع استعادة الفلاتر بعد المسح
  const [justCleared, setJustCleared] = useState(false);

  // الحالة المحلية للمرشحات
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('language') || 'all');
  const [selectedPageCount, setSelectedPageCount] = useState(searchParams.get('pages') || 'all');
  const [selectedAuthor, setSelectedAuthor] = useState(searchParams.get('author') || 'all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [displayedBooks, setDisplayedBooks] = useState(defaultBooksPerPage);

  // تحديث الحالة المحلية عند تغيير URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category') || 'all';
    const languageParam = searchParams.get('language') || 'all';
    const pagesParam = searchParams.get('pages') || 'all';
    const authorParam = searchParams.get('author') || 'all';
    const searchParam = searchParams.get('q') || '';

    // تحديث فقط إذا كانت القيمة مختلفة لمنع الحلقة المفرغة
    if (selectedCategory !== categoryParam) setSelectedCategory(categoryParam);
    if (selectedLanguage !== languageParam) setSelectedLanguage(languageParam);
    if (selectedPageCount !== pagesParam) setSelectedPageCount(pagesParam);
    if (selectedAuthor !== authorParam) setSelectedAuthor(authorParam);
    if (searchTerm !== searchParam) setSearchTerm(searchParam);
  }, [searchParams, selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor, searchTerm]);

  // حفظ حالة المرشحات في NavigationHistory
  const saveFiltersState = useCallback(() => {
    const filtersState: FiltersState = {
      selectedCategory,
      selectedLanguage,
      selectedPageCount,
      selectedAuthor,
      searchTerm,
      displayedBooks,
      scrollPosition: window.pageYOffset || document.documentElement.scrollTop
    };

    NavigationHistoryManager.saveCurrentState(
      window.location.pathname + window.location.search,
      { filters: filtersState }
    );
  }, [selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor, searchTerm, displayedBooks]);

  // استعادة حالة المرشحات من NavigationHistory
  const restoreFiltersState = useCallback(async () => {
    // عدم استعادة الفلاتر إذا تم مسحها للتو
    if (justCleared) {
      console.log('تم تجاهل استعادة الفلاتر لأنه تم مسحها للتو');
      return false;
    }

    try {
      const savedState = await NavigationHistoryManager.getSavedState();

      if (savedState?.pageData?.filters) {
        const filters: FiltersState = savedState.pageData.filters;

        // تحديث URL params
        const newParams = new URLSearchParams();
        if (filters.selectedCategory && filters.selectedCategory !== 'all') {
          newParams.set('category', filters.selectedCategory);
        }
        if (filters.selectedLanguage && filters.selectedLanguage !== 'all') {
          newParams.set('language', filters.selectedLanguage);
        }
        if (filters.selectedPageCount && filters.selectedPageCount !== 'all') {
          newParams.set('pages', filters.selectedPageCount);
        }
        if (filters.selectedAuthor && filters.selectedAuthor !== 'all') {
          newParams.set('author', filters.selectedAuthor);
        }
        if (filters.searchTerm) {
          newParams.set('q', filters.searchTerm);
        }

        setSearchParams(newParams, { replace: true });

        // استعادة عدد الكتب المعروضة
        setDisplayedBooks(filters.displayedBooks || defaultBooksPerPage);

        // استعادة موضع التمرير
        if (filters.scrollPosition) {
          setTimeout(() => {
            window.scrollTo({
              top: filters.scrollPosition || 0,
              left: 0,
              behavior: 'smooth'
            });
          }, 300);
        }

        console.log('تم استعادة حالة المرشحات:', filters);
        return true;
      }
    } catch (error) {
      console.warn('فشل في استعادة حالة المرشحات:', error);
    }

    return false;
  }, [setSearchParams, defaultBooksPerPage, justCleared]);

  // تحديث URL parameters
  const updateSearchParams = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  // مسح جميع المرشحات
  const clearAllFilters = useCallback(async () => {
    // تعيين حالة المسح لمنع استعادة الفلاتر
    setJustCleared(true);
    
    setSelectedCategory('all');
    setSelectedLanguage('all');
    setSelectedPageCount('all');
    setSelectedAuthor('all');
    setSearchTerm('');
    setDisplayedBooks(defaultBooksPerPage);
    setSearchParams({}, { replace: true });

    // مسح الحالة المحفوظة من NavigationHistory لمنع استعادتها
    try {
      await NavigationHistoryManager.clearSavedState();
      console.log('تم مسح الحالة المحفوظة من NavigationHistory');
    } catch (error) {
      console.warn('فشل في مسح الحالة المحفوظة:', error);
    }

    // إعادة تعيين حالة المسح بعد فترة قصيرة
    setTimeout(() => {
      setJustCleared(false);
    }, 1000);
  }, [setSearchParams, defaultBooksPerPage]);

  // إعادة تعيين عدد الكتب المعروضة عند تغيير المرشحات
  useEffect(() => {
    setDisplayedBooks(defaultBooksPerPage);
  }, [selectedCategory, selectedLanguage, selectedPageCount, selectedAuthor, defaultBooksPerPage]);

  return {
    // الحالة الحالية
    selectedCategory,
    selectedLanguage,
    selectedPageCount,
    selectedAuthor,
    searchTerm,
    displayedBooks,

    // دوال التحديث
    setSelectedCategory: (value: string) => {
      setSelectedCategory(value);
      updateSearchParams('category', value);
    },
    setSelectedLanguage: (value: string) => {
      setSelectedLanguage(value);
      updateSearchParams('language', value);
    },
    setSelectedPageCount: (value: string) => {
      setSelectedPageCount(value);
      updateSearchParams('pages', value);
    },
    setSelectedAuthor: (value: string) => {
      setSelectedAuthor(value);
      updateSearchParams('author', value);
    },
    setSearchTerm: (value: string) => {
      console.log('useFiltersState: setSearchTerm called with:', value);
      setSearchTerm(value);
      // عدم تحديث URL parameters للبحث المحلي
    },
    setDisplayedBooks,

    // دوال التحكم
    updateSearchParams,
    clearAllFilters,
    saveFiltersState,
    restoreFiltersState
  };
};