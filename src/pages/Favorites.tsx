
import React, { useEffect, useState } from 'react';
import { useFavorites } from '@/context/FavoritesContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SimpleBookCard } from '@/components/books/SimpleBookCard';
import Navbar from '@/components/layout/Navbar';
import { SEOHead } from '@/components/seo/SEOHead';


interface BookType {
  id: string;
  title: string;
  author: string;
  cover_image?: string;
  category: string;
  created_at?: string;
}

const Favorites = () => {
  const { favorites } = useFavorites();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favoriteBooks, setFavoriteBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteBooks = async () => {
      if (!user || favorites.length === 0) {
        setFavoriteBooks([]);
        setLoading(false);
        return;
      }

      try {
        console.log('جلب الكتب المفضلة للمعرفات:', favorites);

        // جلب الكتب المعتمدة من قاعدة البيانات
        const { data: approvedBooks, error: approvedError } = await supabase
          .from('book_submissions')
          .select('id, title, author, cover_image_url, category, created_at')
          .in('id', favorites.map(id => {
            try {
              return id;
            } catch {
              return id;
            }
          }))
          .eq('status', 'approved');

        if (approvedError) {
          console.error('خطأ في جلب الكتب المعتمدة:', approvedError);
        }

        // تحويل البيانات إلى التنسيق المطلوب لـ SimpleBookCard
        const books: BookType[] = [];

        if (approvedBooks) {
          console.log('الكتب المعتمدة الموجودة:', approvedBooks);

          approvedBooks.forEach(book => {
            books.push({
              id: book.id,
              title: book.title,
              author: book.author,
              cover_image: book.cover_image_url || '',
              category: book.category,
              created_at: book.created_at
            });
          });
        }

        console.log('الكتب المفضلة النهائية:', books);
        setFavoriteBooks(books);
      } catch (error) {
        console.error('خطأ في جلب الكتب المفضلة:', error);
        setFavoriteBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteBooks();
  }, [favorites, user]);

  // Add ad script to page

  if (!user) {
    return (
      <>
        <SEOHead 
          title="المفضلة - تسجيل الدخول مطلوب | منصة كتبي"
          description="قم بتسجيل الدخول للوصول إلى قائمة الكتب المفضلة الخاصة بك في منصة كتبي"
          keywords="المفضلة, كتب مفضلة, تسجيل الدخول, منصة كتبي"
        canonical="https://kotobi.xyz/favorites"
          ogType="website"
        />
        <div className={`min-h-screen pb-20 md:pb-0 ${theme === 'dark' ? 'dark' : ''}`} style={{ backgroundColor: 'hsl(var(--books-background))' }}>
          <Navbar />
          
          <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-amiri font-bold mb-8 text-center">المفضلة</h1>
            <div className="text-center py-12">
              <p className="text-xl font-cairo mb-6">يجب تسجيل الدخول للوصول إلى قائمة المفضلة الخاصة بك</p>
              <Button 
                onClick={() => navigate('/auth')} 
                variant="default" 
                className="font-cairo text-base px-6 py-2"
              >
                تسجيل الدخول
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <SEOHead 
          title="جاري تحميل المفضلة... | منصة كتبي"
          description="جاري تحميل قائمة الكتب المفضلة الخاصة بك في منصة كتبي"
          keywords="المفضلة, كتب مفضلة, تحميل, منصة كتبي"
        canonical="https://kotobi.xyz/favorites"
          ogType="website"
        />
        <div className={`min-h-screen pb-20 md:pb-0 ${theme === 'dark' ? 'dark' : ''}`} style={{ backgroundColor: 'hsl(var(--books-background))' }}>
          <Navbar />
          
          <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-amiri font-bold mb-8 text-center">المفضلة</h1>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-book-primary mx-auto mb-4"></div>
              <p className="text-xl font-cairo">جاري تحميل الكتب المفضلة...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title={`المفضلة (${favoriteBooks.length} كتاب) | منصة كتبي`}
        description={`تصفح قائمة كتبك المفضلة في منصة كتبي. لديك ${favoriteBooks.length} كتاب في قائمة المفضلة الخاصة بك.`}
        keywords="المفضلة, كتب مفضلة, مكتبتي الشخصية, قائمة القراءة, منصة كتبي"
        canonical="https://kotobi.xyz/favorites"
        ogType="website"
        ogImage="/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png"
      />
      <div className={`min-h-screen pb-20 md:pb-0 ${theme === 'dark' ? 'dark' : ''}`} style={{ backgroundColor: 'hsl(var(--books-background))' }}>
        <Navbar />
        
        <div className="container mx-auto py-8 px-4 pb-40">
          <h1 className="text-3xl font-amiri font-bold mb-8 text-center">المفضلة</h1>


        {favoriteBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl font-cairo mb-4">لم تقم بإضافة أي كتب إلى المفضلة بعد.</p>
            <p className="text-gray-600 font-cairo mb-6">
              عدد المفضلات المحفوظة: {favorites.length}
            </p>
            <Button 
              onClick={() => navigate('/')} 
              variant="default" 
              className="font-cairo text-base px-6 py-2"
            >
              تصفح الكتب
            </Button>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-600 font-cairo mb-6">
              إجمالي الكتب المفضلة: {favoriteBooks.length}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 pb-20">
              {favoriteBooks.map(book => {
                console.log('عرض كتاب مفضل:', { 
                  id: book.id, 
                  title: book.title, 
                  author: book.author
                });

                return (
                  <div key={`favorite-book-${book.id}`} className="h-full">
                    <SimpleBookCard 
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      cover_image={book.cover_image}
                      category={book.category}
                      created_at={book.created_at}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
};

export default Favorites;