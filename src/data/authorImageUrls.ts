
// استخراج URLs صور المؤلفين من ملف editableBooksData
import { booksData } from './editableBooksData';

// إنشاء كائن يحتوي على معرفات المؤلفين وروابط صورهم
export const authorImageUrls: { [key: number]: string } = {};

// ملء الكائن بالبيانات من booksData
booksData.forEach(book => {
  if (book.author && book.author.id && book.author.image) {
    authorImageUrls[book.author.id] = book.author.image;
  }
});
