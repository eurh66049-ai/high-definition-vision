import { useState, useEffect, useMemo } from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  [key: string]: any;
}

interface UseShuffledBooksOptions {
  refreshIntervalMinutes?: number; // فترة التحديث بالدقائق (افتراضياً 60 دقيقة = ساعة)
}

export const useShuffledBooks = (
  books: Book[], 
  options: UseShuffledBooksOptions = {}
) => {
  const { refreshIntervalMinutes = 120 } = options; // تحديث كل ساعتين بدلاً من ساعة واحدة
  const [shuffleSeed, setShuffleSeed] = useState(Date.now());

  // دالة خلط الكتب بناءً على seed محدد
  const shuffleWithSeed = (array: Book[], seed: number): Book[] => {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    let randomIndex: number;

    // استخدام الـ seed لإنتاج نتائج ثابتة في نفس الفترة الزمنية
    let rng = seed;
    const seededRandom = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };

    // خوارزمية Fisher-Yates مع RNG مخصص
    while (currentIndex !== 0) {
      randomIndex = Math.floor(seededRandom() * currentIndex);
      currentIndex--;

      [shuffled[currentIndex], shuffled[randomIndex]] = [
        shuffled[randomIndex], shuffled[currentIndex]
      ];
    }

    return shuffled;
  };

  // تحديث الـ seed كل فترة محددة
  useEffect(() => {
    const updateSeed = () => {
      const now = Date.now();
      // حساب الـ seed بناءً على الساعة الحالية
      const hoursSinceEpoch = Math.floor(now / (refreshIntervalMinutes * 60 * 1000));
      setShuffleSeed(hoursSinceEpoch);
    };

    // تحديث فوري
    updateSeed();

    // تحديث دوري
    const interval = setInterval(updateSeed, refreshIntervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshIntervalMinutes]);

  // خلط الكتب باستخدام الـ seed الحالي
  const shuffledBooks = useMemo(() => {
    if (!books || books.length === 0) return [];
    return shuffleWithSeed(books, shuffleSeed);
  }, [books, shuffleSeed]);

  return {
    shuffledBooks,
    lastShuffleTime: shuffleSeed * refreshIntervalMinutes * 60 * 1000,
    nextShuffleTime: (shuffleSeed + 1) * refreshIntervalMinutes * 60 * 1000
  };
};