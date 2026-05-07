
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { 
  Loader2, 
  BookOpen, 
  BookText,
  User, 
  Brush, 
  Lightbulb, 
  Microscope, 
  History, 
  Heart, 
  Music, 
  Globe,
  Scroll,
  Landmark,
  GraduationCap,
  Library,
  ChevronDown
} from 'lucide-react';

interface Author {
  id: string;
  name: string;
  booksCount: number;
  icon?: React.ReactNode;
}

const Categories: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { saveCurrentState } = useNavigationHistory();

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    setLoading(true);
    
    try {
      const sampleAuthors: Author[] = [
        {
          id: '1',
          name: 'ويليم شكسبير',
          booksCount: 1,
          icon: <BookText className="h-5 w-5" />
        },
        {
          id: '2',
          name: 'أنيرو كاموو',
          booksCount: 1,
          icon: <BookOpen className="h-5 w-5" />
        },
        {
          id: '3',
          name: 'يوسف كرم',
          booksCount: 1,
          icon: <Lightbulb className="h-5 w-5" />
        },
        {
          id: '4',
          name: 'هاثر عوض عبدالصادق',
          booksCount: 1,
          icon: <Scroll className="h-5 w-5" />
        },
        {
          id: '5',
          name: 'مجموعة مؤلفين',
          booksCount: 1,
          icon: <Music className="h-5 w-5" />
        },
        {
          id: '6',
          name: 'أسماء محسن',
          booksCount: 1,
          icon: <GraduationCap className="h-5 w-5" />
        },
        {
          id: '7',
          name: 'جبرى زيدان',
          booksCount: 1,
          icon: <History className="h-5 w-5" />
        },
        {
          id: '8',
          name: 'أحمد عصام أولادناه',
          booksCount: 1,
          icon: <Heart className="h-5 w-5" />
        },
        {
          id: '9',
          name: 'عمرو محمود',
          booksCount: 1,
          icon: <Library className="h-5 w-5" />
        },
        {
          id: '10',
          name: 'جون غراي',
          booksCount: 1,
          icon: <Globe className="h-5 w-5" />
        },
        {
          id: '11',
          name: 'السيد عبد الرحمن بن المرشد جمال الدين الحسيني الغوري الحنفي',
          booksCount: 1,
          icon: <BookText className="h-5 w-5" />
        },
        {
          id: '12',
          name: 'عباس ثائر عباس',
          booksCount: 1,
          icon: <Landmark className="h-5 w-5" />
        },
        {
          id: '13',
          name: 'روبرت غرين',
          booksCount: 1,
          icon: <BookOpen className="h-5 w-5" />
        },
        {
          id: '14',
          name: 'شريف شوقي (بشتر)',
          booksCount: 1,
          icon: <User className="h-5 w-5" />
        },
        {
          id: '15',
          name: 'حوار قدين',
          booksCount: 1,
          icon: <History className="h-5 w-5" />
        },
        {
          id: '16',
          name: 'قضى أبو تشيرد',
          booksCount: 1,
          icon: <Microscope className="h-5 w-5" />
        },
        {
          id: '17',
          name: 'دفاقتى خويا',
          booksCount: 1,
          icon: <Brush className="h-5 w-5" />
        },
        {
          id: '18',
          name: 'محمد علي',
          booksCount: 1,
          icon: <BookText className="h-5 w-5" />
        }
      ];
      
      setAuthors(sampleAuthors);
      
    } catch (error) {
      console.error('Error fetching authors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorClick = async (authorName: string) => {
    // حفظ الحالة الحالية قبل الانتقال
    await saveCurrentState();
    
    // استخدام React Router للانتقال
    navigate(`/?author=${encodeURIComponent(authorName)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <SEOHead
        title="التصنيفات - منصة كتبي"
        description="تصفح التصنيفات والمؤلفين واكتشف الكتب حسب الأقسام على منصة كتبي."
        keywords="تصنيفات الكتب, أقسام الكتب, مؤلفون, منصة كتبي"
        canonical="https://kotobi.xyz/categories"
      />
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-lg p-6 mb-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <User className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold">تصفح حسب المؤلف</h1>
              </div>
              <p className="text-sm opacity-90">اكتشف مجموعة متنوعة من الكتب حسب مؤلفيك المفضلين</p>
            </div>
            <div className="absolute top-0 right-0 opacity-20">
              <div className="w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
            </div>
          </div>

          {/* Authors Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-book-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {authors.map((author) => (
                <div
                  key={author.id}
                  onClick={() => handleAuthorClick(author.name)}
                  className="bg-gray-800 hover:bg-gray-700 transition-all duration-200 rounded-lg p-4 cursor-pointer border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-700 p-3 rounded-full">
                      {author.icon}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-white font-tajawal" style={{ fontWeight: 400, fontSize: '21px' }}>{author.name}</h3>
                    </div>
                    <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {author.booksCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && authors.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">لا توجد نتائج متاحة</p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Categories;
