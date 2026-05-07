
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRecentBooks, calculateProgressPercentage } from '@/utils/readingProgressUtils';
import { booksData } from '@/data/editableBooksData';

const RecentBooksSection = () => {
  const navigate = useNavigate();
  const recentBooks = getRecentBooks(3);

  if (recentBooks.length === 0) {
    return null;
  }

  const handleContinueReading = (bookId: string, currentPage: number) => {
    navigate(`/read/${bookId}?page=${currentPage}`);
  };

  return (
    <Card className="mb-8 overflow-hidden border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-2xl font-amiri text-blue-800 dark:text-blue-300">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          الكتب التي قرأتها مؤخراً
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentBooks.map((progress) => {
            const book = booksData.find(b => b.id.toString() === progress.bookId);
            if (!book) return null;
            
            const progressPercentage = calculateProgressPercentage(progress.currentPage, progress.totalPages);
            
            return (
              <div
                key={progress.bookId}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100 dark:border-blue-800/30"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-16 bg-gradient-to-b from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-cairo font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-2 mb-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {book.author?.name}
                    </p>
                  </div>
                </div>
                
                {/* شريط التقدم */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">التقدم</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    الصفحة {progress.currentPage} من {progress.totalPages}
                  </div>
                </div>
                
                <Button
                  onClick={() => handleContinueReading(progress.bookId, progress.currentPage)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors duration-200"
                  size="sm"
                >
                  <span>متابعة القراءة</span>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentBooksSection;
