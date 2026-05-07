import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, UserPlus, Quote, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import type { Activity } from '@/hooks/useActivityTimeline';
import { getPublicUserProfilePath } from '@/utils/userProfile';

const activityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  book_like: { icon: Heart, color: 'text-red-500', label: 'أعجب بكتاب' },
  book_review: { icon: Star, color: 'text-amber-500', label: 'راجع كتاب' },
  follow_user: { icon: UserPlus, color: 'text-blue-500', label: 'تابع' },
  quote_add: { icon: Quote, color: 'text-emerald-500', label: 'أضاف اقتباس' },
  book_submit: { icon: BookOpen, color: 'text-purple-500', label: 'نشر كتاب' },
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return `منذ ${Math.floor(days / 30)} شهر`;
};

interface Props {
  activity: Activity;
}

const ActivityCard: React.FC<Props> = ({ activity }) => {
  const config = activityConfig[activity.activity_type] || activityConfig.book_like;
  const Icon = config.icon;

  const getTargetLink = () => {
    if (activity.activity_type === 'follow_user' && activity.target_id) {
      return getPublicUserProfilePath(activity.target_title || activity.target_id);
    }
    if (activity.target_id && ['book_like', 'book_review', 'book_submit'].includes(activity.activity_type)) {
      return `/book/${activity.target_id}`;
    }
    return null;
  };

  const targetLink = getTargetLink();

  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-border/50">
      <div className="flex items-start gap-3">
        {/* أيقونة النشاط */}
        <div className="relative flex-shrink-0">
          <Link to={getPublicUserProfilePath(activity.username || activity.user_id)}>
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage src={activity.avatar_url || ''} alt={activity.username || ''} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
                {(activity.username || '?')[0]}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className={`absolute -bottom-1 -left-1 p-1 rounded-full bg-card border border-border ${config.color}`}>
            <Icon className="h-3 w-3" />
          </div>
        </div>

        {/* محتوى النشاط */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-relaxed">
            <Link
              to={getPublicUserProfilePath(activity.username || activity.user_id)}
              className="font-bold hover:text-primary transition-colors"
            >
              {activity.username || 'مستخدم'}
            </Link>
            {' '}
            <span className="text-muted-foreground">{config.label}</span>
            {' '}
            {activity.target_title && targetLink ? (
              <Link to={targetLink} className="font-semibold hover:text-primary transition-colors">
                {activity.target_title}
              </Link>
            ) : activity.target_title ? (
              <span className="font-semibold">{activity.target_title}</span>
            ) : null}
          </p>

          {/* تقييم المراجعة */}
          {activity.activity_type === 'book_review' && activity.metadata?.rating && (
            <div className="flex items-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < activity.metadata.rating ? 'text-amber-400 fill-amber-400' : 'text-muted'}`}
                />
              ))}
            </div>
          )}

          {/* نص الاقتباس */}
          {activity.activity_type === 'quote_add' && activity.metadata?.quote_text && (
            <p className="text-xs text-muted-foreground mt-1 italic border-r-2 border-primary/30 pr-2">
              "{activity.metadata.quote_text}"
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">{timeAgo(activity.created_at)}</p>
        </div>

        {/* صورة الكتاب */}
        {activity.target_image_url && activity.activity_type !== 'follow_user' && (
          <Link to={targetLink || '#'} className="flex-shrink-0">
            <img
              src={activity.target_image_url}
              alt={activity.target_title || ''}
              className="h-16 w-12 rounded-md object-cover shadow-sm border border-border/50"
              loading="lazy"
            />
          </Link>
        )}
      </div>
    </Card>
  );
};

export default ActivityCard;
