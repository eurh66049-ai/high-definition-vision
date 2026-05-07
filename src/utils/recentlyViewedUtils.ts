
interface RecentlyViewedBook {
  id: string;
  title: string;
  author: string;
  cover_image_url: string;
  viewedAt: string;
}

const RECENTLY_VIEWED_KEY = 'kutubi_recently_viewed';
const MAX_RECENTLY_VIEWED = 12;

export const addRecentlyViewed = (book: { id: string; title: string; author: string; cover_image_url: string; }) => {
  if (!book || !book.id) return;
  try {
    let recentlyViewed = getRecentlyViewed();
    // إزالة الكتاب إذا كان موجوداً بالفعل لإضافته في المقدمة
    recentlyViewed = recentlyViewed.filter(b => b.id !== book.id);
    // إضافة الكتاب الجديد في بداية القائمة
    recentlyViewed.unshift({ ...book, viewedAt: new Date().toISOString() });
    // الحفاظ على عدد محدد من الكتب
    if (recentlyViewed.length > MAX_RECENTLY_VIEWED) {
      recentlyViewed = recentlyViewed.slice(0, MAX_RECENTLY_VIEWED);
    }
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed));
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
  }
};

export const getRecentlyViewed = (): RecentlyViewedBook[] => {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting recently viewed:', error);
    return [];
  }
};
