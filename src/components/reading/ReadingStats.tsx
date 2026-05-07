import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen, Target, TrendingUp, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReadingStatsProps {
  currentPage: number;
  totalPages: number;
  readingTime: number; // in minutes
  bookTitle: string;
  startTime?: Date;
}

interface ReadingSession {
  date: string;
  duration: number;
  pagesRead: number;
}

const ReadingStats = ({ 
  currentPage, 
  totalPages, 
  readingTime, 
  bookTitle,
  startTime 
}: ReadingStatsProps) => {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [todayStats, setTodayStats] = useState({
    pagesRead: 0,
    timeSpent: 0,
    sessionCount: 0
  });

  const progress = Math.round((currentPage / totalPages) * 100);
  const remainingPages = totalPages - currentPage;
  const estimatedTimeToFinish = Math.round((remainingPages / (currentPage / readingTime || 1)) || 0);
  const averageReadingSpeed = readingTime > 0 ? Math.round(currentPage / readingTime) : 0;

  // Load reading sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem(`reading_sessions_${bookTitle}`);
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, [bookTitle]);

  // Calculate today's stats
  useEffect(() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(session => 
      new Date(session.date).toDateString() === today
    );
    
    setTodayStats({
      pagesRead: todaySessions.reduce((sum, session) => sum + session.pagesRead, 0),
      timeSpent: todaySessions.reduce((sum, session) => sum + session.duration, 0),
      sessionCount: todaySessions.length
    });
  }, [sessions]);

  // Save current session
  useEffect(() => {
    if (startTime && readingTime > 0) {
      const currentSession: ReadingSession = {
        date: new Date().toISOString(),
        duration: readingTime,
        pagesRead: currentPage
      };

      const updatedSessions = [...sessions, currentSession];
      setSessions(updatedSessions);
      localStorage.setItem(`reading_sessions_${bookTitle}`, JSON.stringify(updatedSessions));
    }
  }, [readingTime]);

  const getReadingLevel = () => {
    if (progress >= 90) return { level: 'خبير', color: 'bg-purple-500', icon: <Award className="h-4 w-4" /> };
    if (progress >= 70) return { level: 'متقدم', color: 'bg-blue-500', icon: <TrendingUp className="h-4 w-4" /> };
    if (progress >= 50) return { level: 'متوسط', color: 'bg-green-500', icon: <Target className="h-4 w-4" /> };
    if (progress >= 25) return { level: 'مبتدئ', color: 'bg-yellow-500', icon: <BookOpen className="h-4 w-4" /> };
    return { level: 'جديد', color: 'bg-gray-500', icon: <BookOpen className="h-4 w-4" /> };
  };

  const readingLevel = getReadingLevel();

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 font-amiri text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            إحصائيات القراءة
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground font-cairo">التقدم الإجمالي</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 bg-muted" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>الصفحة {currentPage}</span>
              <span>من أصل {totalPages}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 rounded-lg bg-primary/5 border border-primary/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">وقت القراءة</span>
              </div>
              <div className="text-lg font-bold text-foreground">{formatTime(readingTime)}</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 rounded-lg bg-green-500/5 border border-green-500/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">الصفحات المقروءة</span>
              </div>
              <div className="text-lg font-bold text-foreground">{currentPage}</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">سرعة القراءة</span>
              </div>
              <div className="text-lg font-bold text-foreground">{averageReadingSpeed} ص/د</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">الوقت المتبقي</span>
              </div>
              <div className="text-lg font-bold text-foreground">{formatTime(estimatedTimeToFinish)}</div>
            </motion.div>
          </div>

          {/* Reading Level */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground font-cairo">مستوى القراءة</span>
              <Badge variant="secondary" className={`${readingLevel.color} text-white`}>
                <span className="flex items-center gap-1">
                  {readingLevel.icon}
                  {readingLevel.level}
                </span>
              </Badge>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2 font-cairo">
              <Calendar className="h-4 w-4 text-primary" />
              إحصائيات اليوم
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{todayStats.pagesRead}</div>
                <div className="text-xs text-muted-foreground">صفحة</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{formatTime(todayStats.timeSpent)}</div>
                <div className="text-xs text-muted-foreground">وقت القراءة</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{todayStats.sessionCount}</div>
                <div className="text-xs text-muted-foreground">جلسة</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReadingStats;