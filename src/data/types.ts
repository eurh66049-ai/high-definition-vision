
// أنواع البيانات المستخدمة

// نوع المؤلف
export interface Author {
  id: number;
  name: string;
  bio: string;
  image: string;
  booksCount?: number;
}

// نوع الكتاب
export interface Book {
  id: number;
  title: string;
  description: string;
  author: Author;
  coverImage: string;
  pages: number;
  publishYear: number;
  language: string;
  category: string;
  isbn: string;
  publisher?: string; // إضافة خاصية الناشر
}

// نوع التصنيف
export interface Category {
  id: number;
  name: string;
  icon: string;
  count: number;
}

// نوع رابط القراءة
export interface ReadingUrl {
  urlTemplate: string;
  totalPages: number;
  pagePattern: string;
}

// نوع المراجعة
export interface BookReview {
  id: string;
  bookId: string;
  userId: string;
  rating: number;
  comment?: string;
  recommend?: boolean;
  createdAt: string;
  username: string;
  avatarUrl?: string;
  likes: number;  // عدد الإعجابات
  likedByCurrentUser: boolean;  // هل أعجب المستخدم الحالي بهذه المراجعة
}

// نوع إعجاب المراجعة
export interface ReviewLike {
  id: string;
  userId: string;
  reviewId: string;
  createdAt: string;
}

// نوع إحصاءات المراجعة
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  recommendCount: number;
  notRecommendCount: number;
}

// نوع ملف الوسائط للكتاب
export interface BookMediaFile {
  media_type: string;
  file_url: string;
  file_size: number | null;
  metadata: any;
}
