import React from 'react';
import { Trophy, TrendingUp, Flame, Crown, Medal, Award } from 'lucide-react';
import { getCategoryInArabic } from '@/utils/categoryTranslation';

interface BookPopularityRankProps {
  rank: {
    popularity_rank: number;
    total_books: number;
    popularity_score: number;
    category_rank: number;
    category_total: number;
  };
  category: string;
}

const BookPopularityRank: React.FC<BookPopularityRankProps> = ({ rank, category }) => {
  const globalPercentage = Math.round((1 - (rank.popularity_rank - 1) / rank.total_books) * 100);
  const categoryPercentage = Math.round((1 - (rank.category_rank - 1) / rank.category_total) * 100);

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-amber-600" />;
    if (position <= 10) return <Trophy className="h-5 w-5 text-primary" />;
    return <TrendingUp className="h-5 w-5 text-muted-foreground" />;
  };

  const getRankLabel = (position: number, total: number) => {
    const pct = Math.round((1 - (position - 1) / total) * 100);
    if (position === 1) return 'الأول 🥇';
    if (position === 2) return 'الثاني 🥈';
    if (position === 3) return 'الثالث 🥉';
    if (pct >= 95) return 'أعلى 5%';
    if (pct >= 90) return 'أعلى 10%';
    if (pct >= 75) return 'أعلى 25%';
    if (pct >= 50) return 'أعلى 50%';
    return null;
  };

  const globalLabel = getRankLabel(rank.popularity_rank, rank.total_books);
  const categoryLabel = getRankLabel(rank.category_rank, rank.category_total);

  const getFlameColor = (pct: number) => {
    if (pct >= 90) return 'text-red-500';
    if (pct >= 75) return 'text-orange-500';
    if (pct >= 50) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className={`h-5 w-5 ${getFlameColor(globalPercentage)}`} />
        <h4 className="font-bold text-foreground font-amiri text-lg">ترتيب الشهرة</h4>
      </div>

      {/* الترتيب العالمي */}
      <div className="bg-gradient-to-l from-primary/10 to-transparent rounded-xl p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getRankIcon(rank.popularity_rank)}
            <span className="text-sm font-cairo text-muted-foreground">الترتيب العام</span>
          </div>
          {globalLabel && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-cairo font-bold">
              {globalLabel}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground font-cairo">
            #{rank.popularity_rank}
          </span>
          <span className="text-sm text-muted-foreground font-cairo">
            من {rank.total_books} كتاب
          </span>
        </div>
        {/* شريط التقدم */}
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-l from-primary to-primary/60 rounded-full transition-all duration-1000"
            style={{ width: `${Math.max(globalPercentage, 2)}%` }}
          />
        </div>
      </div>

      {/* الترتيب في التصنيف */}
      <div className="bg-gradient-to-l from-accent/30 to-transparent rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getRankIcon(rank.category_rank)}
            <span className="text-sm font-cairo text-muted-foreground">
              في {getCategoryInArabic(category)}
            </span>
          </div>
          {categoryLabel && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-cairo font-bold">
              {categoryLabel}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground font-cairo">
            #{rank.category_rank}
          </span>
          <span className="text-sm text-muted-foreground font-cairo">
            من {rank.category_total} كتاب
          </span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-l from-accent-foreground/50 to-accent-foreground/20 rounded-full transition-all duration-1000"
            style={{ width: `${Math.max(categoryPercentage, 2)}%` }}
          />
        </div>
      </div>

      {/* نقاط الشهرة */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-1.5">
          <Flame className={`h-4 w-4 ${getFlameColor(globalPercentage)}`} />
          <span className="text-sm font-cairo text-muted-foreground">
            نقاط الشهرة: <span className="font-bold text-foreground">{Math.round(rank.popularity_score)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookPopularityRank;
