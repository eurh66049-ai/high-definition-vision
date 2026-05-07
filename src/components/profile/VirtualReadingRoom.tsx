import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen } from 'lucide-react';

type ShelfBook = {
  book_id: string;
  book_title: string;
  book_author: string | null;
  book_cover_url: string | null;
  progress_percentage: number | null;
  is_completed: boolean;
  slug: string | null;
};

type Props = {
  userId: string;
  username: string;
};

export function VirtualReadingRoom({ userId, username }: Props) {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const fetchReadingHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('reading_history')
        .select('book_id, book_title, book_author, book_cover_url, progress_percentage, is_completed')
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        const unique = data.filter((b, i, arr) => arr.findIndex(x => x.book_id === b.book_id) === i);
        const bookIds = unique.map(b => b.book_id);
        const { data: slugData } = await supabase
          .from('book_submissions')
          .select('id, slug')
          .in('id', bookIds);
        const slugMap = new Map((slugData || []).map(s => [s.id, s.slug]));
        setBooks(unique.map(b => ({ ...b, slug: slugMap.get(b.book_id) || null })));
      }
      setLoading(false);
    };
    if (userId) fetchReadingHistory();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-16 bg-card/70 backdrop-blur-sm rounded-lg">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">المكتبة فارغة</h3>
        <p className="text-muted-foreground">لم يقرأ هذا المستخدم أي كتب بعد</p>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-2xl vr-room">
        {/* Ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-48 rounded-full blur-[80px] opacity-20 bg-amber-400 pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-40 h-40 rounded-full blur-[60px] opacity-10 bg-orange-300 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-40 h-40 rounded-full blur-[60px] opacity-10 bg-yellow-300 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 text-center pt-8 pb-4">
          <div className="inline-flex items-center gap-3 bg-card/80 backdrop-blur-xl border border-border/40 rounded-full px-6 py-2.5 shadow-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">مكتبة {username}</span>
            <span className="text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-0.5">
              {books.length} كتاب
            </span>
          </div>
        </div>

        {/* Shelf area */}
        <div className="relative z-10 pt-14 pb-12 overflow-visible">
          {/* Books container - drag to scroll */}
          <div
            ref={scrollRef}
            className="flex items-end gap-6 sm:gap-8 px-8 sm:px-12 pt-8 pb-0 overflow-x-auto overflow-y-visible vr-scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}
          >
            {books.map((book) => (
              <PremiumBook3D key={book.book_id} book={book} />
            ))}
          </div>

          {/* Premium wooden shelf */}
          <div className="relative mx-4 mt-0">
            {/* Shelf top surface with wood grain texture */}
            <div className="vr-shelf-surface h-[14px] rounded-t-[4px]" />
            {/* Shelf front face */}
            <div className="vr-shelf-face h-[18px] rounded-b-[3px]" />
            {/* Shelf bottom shadow */}
            <div className="vr-shelf-drop-shadow h-6 mx-4 rounded-b-2xl" />
          </div>
        </div>

        {/* Floor gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
      </div>

      <style>{`
        .vr-room {
          background: linear-gradient(178deg,
            hsl(var(--card)) 0%,
            hsl(var(--muted) / 0.3) 50%,
            hsl(var(--card) / 0.8) 100%
          );
        }
        .vr-shelf-surface {
          background: linear-gradient(180deg,
            hsl(30 40% 55%) 0%,
            hsl(27 38% 48%) 30%,
            hsl(25 42% 42%) 100%
          );
          box-shadow:
            0 -1px 0 hsl(32 50% 62% / 0.6),
            inset 0 2px 6px hsl(32 45% 65% / 0.35),
            inset 0 -1px 2px hsl(20 30% 20% / 0.2);
          background-image: 
            repeating-linear-gradient(
              92deg,
              transparent 0px,
              transparent 18px,
              hsl(28 35% 50% / 0.15) 18px,
              hsl(28 35% 50% / 0.15) 19px
            );
        }
        :is(.dark) .vr-shelf-surface {
          background: linear-gradient(180deg,
            hsl(30 35% 40%) 0%,
            hsl(27 32% 34%) 30%,
            hsl(25 35% 28%) 100%
          );
          box-shadow:
            0 -1px 0 hsl(32 40% 48% / 0.5),
            inset 0 2px 6px hsl(32 35% 50% / 0.25),
            inset 0 -1px 2px hsl(20 25% 15% / 0.3);
          background-image: 
            repeating-linear-gradient(
              92deg,
              transparent 0px,
              transparent 18px,
              hsl(28 30% 38% / 0.2) 18px,
              hsl(28 30% 38% / 0.2) 19px
            );
        }
        .vr-shelf-face {
          background: linear-gradient(180deg,
            hsl(24 38% 32%) 0%,
            hsl(22 35% 26%) 40%,
            hsl(20 32% 22%) 100%
          );
          box-shadow:
            inset 0 1px 0 hsl(26 35% 38% / 0.5),
            inset 0 -1px 3px hsl(18 30% 12% / 0.3),
            0 4px 16px -2px hsl(20 40% 10% / 0.45);
          background-image: 
            repeating-linear-gradient(
              88deg,
              transparent 0px,
              transparent 22px,
              hsl(22 30% 28% / 0.12) 22px,
              hsl(22 30% 28% / 0.12) 23px
            );
        }
        :is(.dark) .vr-shelf-face {
          background: linear-gradient(180deg,
            hsl(24 32% 24%) 0%,
            hsl(22 28% 18%) 40%,
            hsl(20 25% 14%) 100%
          );
          box-shadow:
            inset 0 1px 0 hsl(26 30% 30% / 0.5),
            inset 0 -1px 3px hsl(18 25% 8% / 0.4),
            0 4px 16px -2px hsl(20 35% 6% / 0.6);
          background-image: 
            repeating-linear-gradient(
              88deg,
              transparent 0px,
              transparent 22px,
              hsl(22 25% 20% / 0.15) 22px,
              hsl(22 25% 20% / 0.15) 23px
            );
        }
        .vr-shelf-drop-shadow {
          background: radial-gradient(
            ellipse 80% 100% at 50% 0%,
            hsl(20 30% 10% / 0.18) 0%,
            hsl(20 30% 10% / 0.06) 60%,
            transparent 100%
          );
        }
        :is(.dark) .vr-shelf-drop-shadow {
          background: radial-gradient(
            ellipse 80% 100% at 50% 0%,
            hsl(20 25% 5% / 0.35) 0%,
            hsl(20 25% 5% / 0.12) 60%,
            transparent 100%
          );
        }

        .vr-book-container {
          perspective: 1200px;
        }
        .vr-book {
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
        }
        .vr-book:hover {
          transform: rotateY(-30deg) rotateX(5deg) scale(1.08);
        }
        .vr-book-cover {
          backface-visibility: hidden;
        }
        .vr-book-cover::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            120deg,
            rgba(255,255,255,0) 30%,
            rgba(255,255,255,0.15) 45%,
            rgba(255,255,255,0.3) 50%,
            rgba(255,255,255,0.15) 55%,
            rgba(255,255,255,0) 70%
          );
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .vr-book:hover .vr-book-cover::after {
          opacity: 1;
        }
        .vr-book-shadow {
          transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
          filter: blur(10px);
        }
        .vr-book:hover .vr-book-shadow {
          opacity: 0.5 !important;
          transform: translateZ(-20px) scaleX(1.2) translateY(4px) !important;
        }
        .vr-scrollbar-hide::-webkit-scrollbar { display: none; }
        .vr-scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
        
        .vr-page-lines {
          background: repeating-linear-gradient(
            0deg,
            #f8f4ed 0px,
            #f8f4ed 1.5px,
            #ebe5d8 1.5px,
            #ebe5d8 2.5px
          );
        }
      `}</style>
    </div>
  );
}

function PremiumBook3D({ book }: { book: ShelfBook }) {
  const hash = book.book_title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  const sat = 30 + (hash % 20);
  const bookWidth = 110;
  const bookHeight = 160;
  const bookDepth = 30;

  const spineGradient = `linear-gradient(90deg, 
    hsl(${hue} ${sat}% 18%), 
    hsl(${hue} ${sat}% 28%) 30%, 
    hsl(${hue} ${sat}% 32%) 50%, 
    hsl(${hue} ${sat}% 28%) 70%, 
    hsl(${hue} ${sat}% 20%)
  )`;

  return (
    <div className="relative flex-shrink-0 vr-book-wrapper" style={{ width: bookWidth }}>
      <Link to={`/book/${book.slug || book.book_id}`} className="block">
        <div className="vr-book-container" style={{ width: bookWidth, height: bookHeight }}>
          <div
            className="vr-book relative cursor-pointer"
            style={{ width: bookWidth, height: bookHeight, transformStyle: 'preserve-3d' }}
          >
            {/* === FRONT COVER === */}
            <div
              className="vr-book-cover absolute inset-0 rounded-r-[3px] overflow-hidden"
              style={{
                transform: `translateZ(${bookDepth / 2}px)`,
                boxShadow: '2px 2px 8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)',
              }}
            >
              {book.book_cover_url ? (
                <img
                  src={book.book_cover_url}
                  alt={book.book_title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-3"
                  style={{
                    background: `linear-gradient(145deg, hsl(${hue} 45% 50%), hsl(${hue} 40% 30%))`,
                  }}
                >
                  <div className="w-12 h-px bg-white/40 mb-3" />
                  <BookOpen className="w-7 h-7 text-white/70 mb-2" />
                  <span className="text-[10px] text-white/90 text-center font-bold leading-tight line-clamp-3">
                    {book.book_title}
                  </span>
                  <div className="w-8 h-px bg-white/30 mt-3" />
                  {book.book_author && (
                    <span className="text-[8px] text-white/60 mt-1.5 text-center truncate w-full">
                      {book.book_author}
                    </span>
                  )}
                </div>
              )}
              {/* Gloss overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/15 pointer-events-none" />
              {/* Edge highlight */}
              <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none" />
              
              {book.is_completed && (
                <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[7px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                  ✓ مكتمل
                </div>
              )}
            </div>

            {/* === BACK COVER === */}
            <div
              className="absolute inset-0 rounded-sm"
              style={{
                transform: `translateZ(-${bookDepth / 2}px) rotateY(180deg)`,
                background: `linear-gradient(135deg, hsl(${hue} ${sat - 5}% 20%), hsl(${hue} ${sat - 5}% 14%))`,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            />

            {/* === SPINE (left) === */}
            <div
              className="absolute overflow-hidden"
              style={{
                width: bookDepth,
                height: '100%',
                left: 0,
                top: 0,
                transformOrigin: 'left center',
                transform: `rotateY(-90deg) translateX(-${bookDepth / 2}px)`,
                background: spineGradient,
                borderRadius: '2px 0 0 2px',
              }}
            >
              {/* Spine decorations */}
              <div className="absolute top-3 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
              <div className="absolute top-5 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-amber-300/25 to-transparent" />
              <div className="absolute bottom-3 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
              <div className="absolute bottom-5 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-amber-300/25 to-transparent" />
              {/* Spine title */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-[7px] text-white/60 font-bold tracking-wider"
                  style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', maxHeight: '80%', overflow: 'hidden' }}
                >
                  {book.book_title.slice(0, 20)}
                </span>
              </div>
              {/* Inner shadow for depth */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* === RIGHT EDGE (pages) === */}
            <div
              className="absolute vr-page-lines"
              style={{
                width: bookDepth,
                height: '100%',
                right: 0,
                top: 0,
                transformOrigin: 'right center',
                transform: `rotateY(90deg) translateX(${bookDepth / 2}px)`,
                boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.08), inset -1px 0 2px rgba(0,0,0,0.05)',
                borderRadius: '0 1px 1px 0',
              }}
            >
              {/* Page indentation effect */}
              <div className="absolute inset-y-[3px] right-0 w-[3px] bg-gradient-to-l from-amber-900/10 to-transparent" />
            </div>

            {/* === TOP EDGE (pages) === */}
            <div
              className="absolute"
              style={{
                width: '100%',
                height: bookDepth,
                top: 0,
                transformOrigin: 'top center',
                transform: `rotateX(90deg) translateY(-${bookDepth / 2}px)`,
                background: 'linear-gradient(180deg, #f8f4ed 0%, #ede7da 50%, #e5dfd2 100%)',
                boxShadow: 'inset 0 0 6px rgba(0,0,0,0.06)',
              }}
            />

            {/* === BOTTOM EDGE (pages) === */}
            <div
              className="absolute"
              style={{
                width: '100%',
                height: bookDepth,
                bottom: 0,
                transformOrigin: 'bottom center',
                transform: `rotateX(-90deg) translateY(${bookDepth / 2}px)`,
                background: 'linear-gradient(0deg, #ede7da 0%, #f5f0e8 100%)',
                boxShadow: 'inset 0 0 6px rgba(0,0,0,0.06)',
              }}
            />

            {/* === SHADOW === */}
            <div
              className="vr-book-shadow absolute rounded-full bg-black/25"
              style={{
                bottom: -6,
                left: 4,
                right: 4,
                height: 12,
                transform: 'translateZ(-16px)',
                opacity: 0.2,
              }}
            />
          </div>
        </div>

      </Link>
    </div>
  );
}
