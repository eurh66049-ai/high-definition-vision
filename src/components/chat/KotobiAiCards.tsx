import React from 'react';
import { BookOpen, User } from 'lucide-react';
import { optimizeImageUrl } from '@/utils/imageProxy';
import { createBookSlug } from '@/utils/bookSlug';
import { cn } from '@/lib/utils';

export interface KotobiBookCard {
  id: string;
  title: string;
  author: string;
  category?: string | null;
  cover_image_url?: string | null;
  slug?: string | null;
}

export interface KotobiAuthorCard {
  id: string;
  name: string;
  slug?: string | null;
  avatar_url?: string | null;
  books_count?: number | null;
}

export interface KotobiCardsPayload {
  books?: KotobiBookCard[];
  authors?: KotobiAuthorCard[];
}

const KOTOBI_CARDS_REGEX = /<!--KOTOBI_CARDS:([\s\S]*?)-->/;

export function parseKotobiCards(content: string): {
  cleanText: string;
  cards: KotobiCardsPayload | null;
} {
  if (!content) return { cleanText: '', cards: null };
  const match = content.match(KOTOBI_CARDS_REGEX);
  if (!match) return { cleanText: content, cards: null };
  let cards: KotobiCardsPayload | null = null;
  try {
    cards = JSON.parse(match[1]);
  } catch {
    cards = null;
  }
  const cleanText = content.replace(KOTOBI_CARDS_REGEX, '').trim();
  return { cleanText, cards };
}

interface Props {
  cards: KotobiCardsPayload;
}

export const KotobiAiCards: React.FC<Props> = ({ cards }) => {
  const books = cards.books || [];
  const authors = cards.authors || [];

  if (books.length === 0 && authors.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {books.length > 0 && (
        <div className="space-y-1.5">
          {books.slice(0, 6).map((b) => {
            const slug = b.slug || createBookSlug(b.title, b.author);
            const href = `/book/${slug}`;
            const cover = b.cover_image_url ? optimizeImageUrl(b.cover_image_url, 'thumbnail') : null;
            return (
              <a
                key={b.id}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 p-2 rounded-xl bg-card/80 hover:bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm hover:shadow-md group'
                )}
              >
                <div className="w-10 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
                  {cover ? (
                    <img
                      src={cover}
                      alt={b.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {b.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{b.author}</p>
                  {b.category && (
                    <span className="inline-block mt-0.5 text-[9.5px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                      {b.category}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  فتح ←
                </span>
              </a>
            );
          })}
        </div>
      )}

      {authors.length > 0 && (
        <div className="space-y-1.5">
          {authors.slice(0, 4).map((a) => {
            const href = a.slug ? `/author/${a.slug}` : `/authors`;
            const avatar = a.avatar_url ? optimizeImageUrl(a.avatar_url, 'avatar') : null;
            return (
              <a
                key={a.id}
                href={href}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-card/80 hover:bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm hover:shadow-md group"
              >
                <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={a.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {a.name}
                  </p>
                  {typeof a.books_count === 'number' && a.books_count > 0 && (
                    <p className="text-[10.5px] text-muted-foreground">
                      {a.books_count} كتاب
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  ملف ←
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
