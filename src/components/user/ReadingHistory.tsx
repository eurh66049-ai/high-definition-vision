import React, { useState } from 'react';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ReadingHistory: React.FC = () => {
  const { history, loading, deleteHistoryItem } = useReadingHistory();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'reading' | 'completed'>('all');

  const filteredHistory = history.filter(item => {
    if (filter === 'reading') return !item.is_completed;
    if (filter === 'completed') return item.is_completed;
    return true;
  });

  const stats = {
    total: history.length,
    reading: history.filter(item => !item.is_completed).length,
    completed: history.filter(item => item.is_completed).length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">إجمالي الكتب</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.reading}</div>
              <div className="text-sm text-muted-foreground">قيد القراءة</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">مكتملة</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Filter */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
          <TabsTrigger value="reading">
            <Clock className="h-4 w-4 ml-2" />
            قيد القراءة ({stats.reading})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-4 w-4 ml-2" />
            مكتملة ({stats.completed})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Books List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد كتب في هذا القسم</p>
          <p className="text-sm mt-2">ابدأ القراءة وسيتم حفظ تقدمك تلقائياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Book Cover */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.book_cover_url || '/lovable-uploads/default-book-cover.png'}
                        alt={item.book_title}
                        className="w-20 h-28 object-cover rounded shadow-sm"
                        onError={(e) => {
                          e.currentTarget.src = '/lovable-uploads/default-book-cover.png';
                        }}
                      />
                    </div>

                    {/* Book Info */}
                    <div className="flex-grow space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {item.book_title}
                        </h3>
                        {item.book_author && (
                          <p className="text-sm text-muted-foreground">
                            {item.book_author}
                          </p>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>
                            {item.is_completed ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                مكتمل
                              </span>
                            ) : (
                              `الصفحة ${item.current_page} من ${item.total_pages}`
                            )}
                          </span>
                          <span className="font-medium">
                            {item.progress_percentage}%
                          </span>
                        </div>
                        <Progress value={item.progress_percentage} className="h-2" />
                      </div>

                      {/* Last Read */}
                      <p className="text-xs text-muted-foreground">
                        آخر قراءة: {formatDistanceToNow(new Date(item.last_read_at), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/book/${item.book_slug || item.book_id}`)}
                        >
                          {item.is_completed ? 'عرض الكتاب' : 'متابعة القراءة'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteHistoryItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReadingHistory;
