import React, { useState, useCallback, useRef } from 'react';
import { Search, X, Sparkles, BookOpen, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Index as FlexSearchIndex } from 'flexsearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase as supabaseFunctions } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  buildArabicPageSearchDocument,
  buildArabicQueryVariants,
  buildArabicSnippet,
  countBestArabicMatches,
} from '@/utils/arabicSearch';

interface AIBookSearchProps {
  bookTitle: string;
  bookAuthor: string;
  bookId?: string;
  totalPages: number;
  currentPage: number;
  getPagesText: (pages: number[]) => Promise<string>;
  onJumpToPage?: (page: number, searchQuery?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface PageMatch {
  page: number;
  snippet: string;
  count: number;
}

interface SearchResult {
  found: boolean;
  answer: string;
  pages?: number[];
  quotes?: string[];
  confidence?: number;
  matches?: PageMatch[];
  mode?: 'exact' | 'ai';
}

const AIBookSearch: React.FC<AIBookSearchProps> = ({
  bookTitle,
  bookAuthor,
  bookId,
  totalPages,
  currentPage,
  getPagesText,
  onJumpToPage,
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [showQuotes, setShowQuotes] = useState(false);
  const cancelRef = useRef(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResult(null);
    setProgress({ done: 0, total: totalPages });
    cancelRef.current = false;

    const rawQuery = query.trim();
    const queryVariants = buildArabicQueryVariants(rawQuery);

    try {
      // PHASE 1: Indexed exact search across ALL pages with strong Arabic normalization.
      const BATCH = 5;
      const matches: PageMatch[] = [];
      const MAX_MATCHES = 50;
      const normalizedIndex = new FlexSearchIndex({ tokenize: 'forward' });
      const compactIndex = new FlexSearchIndex({ tokenize: 'forward' });
      const pageDocuments = new Map<number, ReturnType<typeof buildArabicPageSearchDocument>>();

      // Start from current page and expand outward for faster perceived results,
      // but still cover all pages.
      const pageOrder: number[] = [];
      const seen = new Set<number>();
      for (let offset = 0; offset < totalPages; offset++) {
        const forward = currentPage + offset;
        const backward = currentPage - offset;
        if (forward >= 1 && forward <= totalPages && !seen.has(forward)) {
          pageOrder.push(forward);
          seen.add(forward);
        }
        if (offset > 0 && backward >= 1 && backward <= totalPages && !seen.has(backward)) {
          pageOrder.push(backward);
          seen.add(backward);
        }
      }

      let done = 0;
      for (let i = 0; i < pageOrder.length; i += BATCH) {
        if (cancelRef.current) break;
        const batchPages = pageOrder.slice(i, i + BATCH);

        // Extract each page individually so we can attribute matches per-page
        await Promise.all(
          batchPages.map(async (pageNum) => {
            try {
              const raw = await getPagesText([pageNum]);
              const pageDocument = buildArabicPageSearchDocument(pageNum, raw);
              if (!pageDocument.pageText) return;

              pageDocuments.set(pageNum, pageDocument);
              normalizedIndex.add(pageNum, pageDocument.normalizedText);
              compactIndex.add(pageNum, pageDocument.compactText);
            } catch (err) {
              console.warn(`search: failed on page ${pageNum}`, err);
            }
          })
        );

        done += batchPages.length;
        setProgress({ done, total: totalPages });

        // Yield to main thread
        await new Promise((r) => setTimeout(r, 0));
      }

      const candidatePages = new Set<number>();
      for (const variant of queryVariants) {
        if (variant.normalized) {
          for (const page of normalizedIndex.search(variant.normalized, { limit: MAX_MATCHES * 2 }) as number[]) {
            candidatePages.add(page);
          }
        }

        if (variant.compact) {
          for (const page of compactIndex.search(variant.compact, { limit: MAX_MATCHES * 2 }) as number[]) {
            candidatePages.add(page);
          }
        }
      }

      for (const page of Array.from(candidatePages).sort((a, b) => a - b)) {
        const pageDocument = pageDocuments.get(page);
        if (!pageDocument) continue;

        const count = countBestArabicMatches(pageDocument, queryVariants);
        if (count <= 0) continue;

        matches.push({
          page,
          snippet: buildArabicSnippet(pageDocument.pageText, rawQuery, queryVariants),
          count,
        });

        if (matches.length >= MAX_MATCHES) break;
      }

      // Sort matches by page number ascending
      matches.sort((a, b) => a.page - b.page);

      if (matches.length > 0) {
        const totalOccurrences = matches.reduce((sum, m) => sum + m.count, 0);
        setResult({
          found: true,
          answer: `تم العثور على "${rawQuery}" في ${matches.length} صفحة${matches.length > 1 ? '' : ''} (${totalOccurrences} تطابق${totalOccurrences > 1 ? '' : ''}).`,
          pages: matches.map((m) => m.page),
          quotes: matches.map((m) => m.snippet),
          matches,
          mode: 'exact',
          confidence: 1,
        });
        setIsSearching(false);
        setProgress(null);
        return;
      }

      // PHASE 2: Fallback to AI semantic search if no exact match
      toast.info('لم يُعثر على تطابق حرفي، جاري البحث الدلالي...');

      const MAX_TEXT_LENGTH = 60000;
      let bookText = '';
      for (let batchStart = 1; batchStart <= totalPages; batchStart += 15) {
        if (cancelRef.current) break;
        const pages: number[] = [];
        for (let i = batchStart; i <= Math.min(batchStart + 14, totalPages); i++) pages.push(i);
        bookText += await getPagesText(pages);
        if (bookText.length >= MAX_TEXT_LENGTH) break;
        await new Promise((r) => setTimeout(r, 0));
      }

      if (!bookText || bookText.trim().length < 20) {
        setResult({ found: false, answer: 'لم يتم العثور على الكلمة في الكتاب.', mode: 'exact' });
        setIsSearching(false);
        setProgress(null);
        return;
      }

      if (bookText.length > MAX_TEXT_LENGTH) {
        bookText = bookText.substring(0, MAX_TEXT_LENGTH);
      }

      const { data, error } = await supabaseFunctions.functions.invoke('smart-book-search', {
        body: { query: rawQuery, bookText, bookTitle, bookAuthor, bookId },
      });

      if (error) throw error;
      setResult({ ...(data as SearchResult), mode: 'ai' });
    } catch (err) {
      console.error('search error:', err);
      toast.error('حدث خطأ أثناء البحث');
    } finally {
      setIsSearching(false);
      setProgress(null);
    }
  }, [query, currentPage, totalPages, getPagesText, bookTitle, bookAuthor, bookId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleClose = () => {
    cancelRef.current = true;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 pt-20">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border/30">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground font-cairo">البحث في الكتاب</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-7 w-7 p-0 ml-auto rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="p-3 flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن كلمة أو جملة في كامل الكتاب..."
            className="text-sm font-cairo rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            autoFocus
            disabled={isSearching}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            size="sm"
            className="rounded-xl px-3 shrink-0"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="px-3 pb-3 max-h-[60vh] overflow-y-auto">
            {result.found ? (
              <div className="space-y-2">
                {/* Answer summary */}
                <div className="bg-primary/5 rounded-xl p-3">
                  <p className="text-sm text-foreground font-cairo leading-relaxed whitespace-pre-wrap">
                    {result.answer}
                  </p>
                  {result.mode === 'exact' && (
                    <p className="text-[10px] text-muted-foreground/70 font-cairo mt-1">
                      بحث حرفي في كامل الكتاب
                    </p>
                  )}
                </div>

                {/* Per-page matches (exact mode) */}
                {result.matches && result.matches.length > 0 ? (
                  <div className="space-y-2">
                    {result.matches.map((m) => (
                      <button
                        key={m.page}
                        onClick={() => onJumpToPage?.(m.page, query.trim())}
                        className="w-full text-right bg-muted/50 hover:bg-muted rounded-lg p-2 border-r-2 border-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-primary font-cairo flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            صفحة {m.page}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-cairo">
                            {m.count} تطابق
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-cairo leading-relaxed text-right">
                          "{m.snippet}"
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* AI mode pages */}
                    {result.pages && result.pages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.pages.map((page) => (
                          <Button
                            key={page}
                            variant="outline"
                            size="sm"
                            onClick={() => onJumpToPage?.(page, query.trim())}
                            className="h-7 text-xs rounded-lg font-cairo gap-1"
                          >
                            <BookOpen className="h-3 w-3" />
                            صفحة {page}
                          </Button>
                        ))}
                      </div>
                    )}

                    {result.quotes && result.quotes.length > 0 && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowQuotes(!showQuotes)}
                          className="text-xs text-muted-foreground font-cairo h-7 gap-1"
                        >
                          {showQuotes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          اقتباسات ({result.quotes.length})
                        </Button>
                        {showQuotes && (
                          <div className="space-y-1.5 mt-1">
                            {result.quotes.map((q, i) => (
                              <div key={i} className="bg-muted/50 rounded-lg p-2 border-r-2 border-primary/50">
                                <p className="text-xs text-muted-foreground font-cairo leading-relaxed">"{q}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-cairo">
                  {result.answer || 'لم يتم العثور على الكلمة في الكتاب'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Searching state with progress */}
        {isSearching && (
          <div className="px-3 pb-3">
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-cairo">
                جاري البحث في كامل الكتاب...
              </p>
              {progress && (
                <>
                  <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 font-cairo">
                    {progress.done} / {progress.total} صفحة
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIBookSearch;
