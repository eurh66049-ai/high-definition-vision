// بيانات الكتب للفهرسة في Edge Function
export const booksData = [
  {
    "id": "93061f8c-073f-4ff3-a54a-659965da835d",
    "title": "كتاب خمارة القط الأسود",
    "author": "نجيب محفوظ",
    "description": "رواية من روائع نجيب محفوظ تحكي عن الحياة في القاهرة القديمة",
    "category": "أدب عربي",
    "cover_image_url": "/src/assets/default-book-cover.png",
    "publication_year": 1969
  },
  {
    "id": "a9f874f4-c018-401b-bd5c-fc6d4ec1c17f",
    "title": "كتاب حديث المساء",
    "author": "طه حسين",
    "description": "مجموعة من المقالات والخواطر للكاتب الكبير طه حسين",
    "category": "أدب عربي",
    "cover_image_url": "/src/assets/default-book-cover.png",
    "publication_year": 1925
  },
  {
    "id": "1c4aa040-bc83-486d-9938-87fbe4cb95a8",
    "title": "دع القلق وابدأ الحياة",
    "author": "ديل كارنيجي",
    "description": "كتاب تطوير الذات المشهور عالمياً",
    "category": "تطوير الذات",
    "cover_image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80",
    "publication_year": 1948
  },
  {
    "id": "cbcfe038-daee-410b-9c4b-8058b807fec0",
    "title": "هكذا تكلم زرادشت",
    "author": "فريدريش نيتشه",
    "description": "عمل فلسفي عميق من أهم أعمال نيتشه",
    "category": "فلسفة",
    "cover_image_url": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80",
    "publication_year": 1883
  },
  {
    "id": "4b911bd8-e39b-478b-92e8-96e40cb028eb",
    "title": "مئة عام من العزلة",
    "author": "جابرييل جارسيا ماركيز",
    "description": "رواية كلاسيكية من أدب أمريكا اللاتينية",
    "category": "أدب عالمي",
    "cover_image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    "publication_year": 1967
  },
  {
    "id": "850e08ef-4b84-4474-8d6d-5ebfa4bfe3fc",
    "title": "الأسود يليق بك",
    "author": "أحلام مستغانمي",
    "description": "رواية عربية معاصرة مؤثرة",
    "category": "أدب عربي",
    "cover_image_url": "/src/assets/default-book-cover.png",
    "publication_year": 1998
  },
  {
    "id": "كتاب السيف الأسود",
    "title": "كتاب السيف الأسود",
    "author": "إبتهال الراجحي",
    "description": "أجمل ما في الحياة أن الإنسان قادرًا على الأفضل وعلى الأسوأ، فهذا كله يؤكد أن هذه الحياة لا يمكن أن تكون إلا دنيا",
    "category": "مجموعة قصص",
    "cover_image_url": "https://i.postimg.cc/XJwQ6pG0/831611488.webp",
    "publication_year": 2023
  }
];

// دالة للعثور على الكتاب حسب ID
export function findBookById(id: string) {
  return booksData.find(book => book.id === id);
}

// دالة للبحث عن الكتاب حسب العنوان (fallback)
export function findBookByTitle(title: string) {
  return booksData.find(book => 
    book.title.toLowerCase().includes(title.toLowerCase()) ||
    title.toLowerCase().includes(book.title.toLowerCase())
  );
}