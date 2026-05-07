
import { booksData } from './editableBooksData';

// استخراج المؤلفين بالتنسيق المطلوب
export interface AuthorData {
  id: number;
  name: string;
  bio: string;
  booksCount: number;
}

// استخراج المؤلفين من بيانات الكتب بدون تكرار
const uniqueAuthors = new Map<number, AuthorData>();

// معالجة دقيقة لتجنب التكرار في المؤلفين
booksData.forEach(book => {
  const authorId = book.author.id;
  
  if (!uniqueAuthors.has(authorId)) {
    // إضافة مؤلف جديد
    uniqueAuthors.set(authorId, {
      id: authorId,
      name: book.author.name,
      bio: book.author.bio || '', // التأكد من وجود قيمة للوصف
      booksCount: 1
    });
  } else {
    // زيادة عدد الكتب للمؤلف الموجود مسبقًا
    const author = uniqueAuthors.get(authorId)!;
    author.booksCount += 1;
    uniqueAuthors.set(authorId, author);
  }
});

// تحويل Map إلى مصفوفة بشكل صحيح
export const authors: AuthorData[] = Array.from(uniqueAuthors.values());
