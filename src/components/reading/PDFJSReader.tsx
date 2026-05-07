import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Home,
  Maximize,
} from 'lucide-react';
import ReadingModeSelector, { ReadingMode, getReadingModeConfig } from './ReadingModeSelector';
import { toast } from 'sonner';
import { useBookDetails } from '@/hooks/useBookDetails';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { throttle } from '@/utils/scrollUtils';
import PDFMemoryManager from '@/utils/pdfMemoryManager';
import * as pdfjsLib from 'pdfjs-dist';
import { saveReadingProgress, getBookReadingProgress } from '@/utils/readingProgressUtils';
import BookReaderAssistant from './BookReaderAssistant';
import { useReaderFingerprint } from '@/hooks/useReaderFingerprint';
import { useReadingTimeTracker } from '@/hooks/useReadingTimeTracker';
import ReaderHints from './ReaderHints';
import PageJumpDialog from './PageJumpDialog';
import ReaderChatPanel from './ReaderChatPanel';


pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const CHUNK_SIZE = 3;
const VISIBLE_PAGE_WINDOW = 2;
const MEMORY_PAGE_RADIUS = 4;
const MOBILE_DPR_CAP = 1.2;
const DESKTOP_DPR_CAP = 1.6;

const PDFJSReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { book, loading, error } = useBookDetails(id!);
  const { user } = useAuth();

  useReadingTimeTracker(id);

  const containerRef = useRef<HTMLDivElement>(null);
  const memoryManager = useRef(PDFMemoryManager.getInstance());
  const renderedPagesRef = useRef<Record<number, HTMLCanvasElement>>({});
  const pageTextCacheRef = useRef<Map<number, string>>(new Map());
  const loadedChunksRef = useRef<Set<number>>(new Set());
  const isScrollingRef = useRef(false);
  const isInitialNavigationRef = useRef(false);
  const hasScrolledToSavedPage = useRef(false);
  const currentVisiblePageRef = useRef(1);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Record<number, HTMLCanvasElement>>({});
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1);
  const [pageSlotHeight, setPageSlotHeight] = useState(0);
  const [savedPage, setSavedPage] = useState<number | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>('normal');
  
  const [pdfTextContent, setPdfTextContent] = useState('');

  // تحميل النص المستخرج للكتاب من قاعدة البيانات لتزويد المساعد الذكي به
  useEffect(() => {
    if (!book?.id) {
      setPdfTextContent('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('book_extracted_text')
          .select('extracted_text, extraction_status, text_length')
          .eq('book_id', book.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('⚠️ تعذر جلب النص المستخرج للكتاب:', error.message);
          return;
        }

        if (data?.extraction_status === 'completed' && data?.extracted_text) {
          console.log(`✅ تم تحميل النص المستخرج (${data.text_length} حرف) لتزويد المساعد الذكي`);
          setPdfTextContent(data.extracted_text);
        } else {
          console.log('ℹ️ لا يوجد نص مستخرج جاهز لهذا الكتاب — سيعتمد المساعد على المعلومات العامة فقط');
        }
      } catch (err) {
        if (!cancelled) console.warn('⚠️ خطأ في تحميل النص المستخرج:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [book?.id]);

  const [scale] = useState(() => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width;

    if (devicePixelRatio >= 2 || screenWidth >= 1920) return 1.4;
    if (screenWidth >= 1366) return 1.2;
    return 1;
  });

  const { hints: readerHints, handleScroll: fingerprintHandleScroll, handleInteraction } = useReaderFingerprint({
    bookId: book?.id || '',
    currentPage: currentVisiblePage,
    enabled: !!book?.id && !isLoading,
  });

  const yieldToMainThread = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
          window.requestAnimationFrame(() => resolve());
          return;
        }

        globalThis.setTimeout(resolve, 0);
      }),
    []
  );

  const normalizeExtractedPdfText = (input: string) => {
    const base = (input ?? '')
      .replace(/\r/g, '')
      .replace(/[\u0000-\u001f]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return base.replace(/(?:[\u0600-\u06FF]\s){2,}[\u0600-\u06FF]/g, (match) => match.replace(/\s+/g, ''));
  };

  const extractTextFromTextContent = (textContent: any) => {
    const items = (textContent?.items || []) as any[];
    let raw = '';

    for (const item of items) {
      const value = (item?.str ?? '').toString();
      if (!value) continue;
      raw += value;
      raw += item?.hasEOL ? '\n' : ' ';
    }

    return normalizeExtractedPdfText(raw);
  };

  const getSlotHeight = useCallback(() => {
    return containerRef.current?.clientHeight || pageSlotHeight || window.innerHeight || 1;
  }, [pageSlotHeight]);

  const scrollToPage = useCallback(
    (pageNumber: number, behavior: ScrollBehavior = 'smooth') => {
      const container = containerRef.current;
      if (!container) return;

      const safePage = Math.min(Math.max(pageNumber, 1), Math.max(totalPages, 1));
      container.scrollTo({ top: (safePage - 1) * getSlotHeight(), behavior });
    },
    [getSlotHeight, totalPages]
  );

  const pruneRenderedPages = useCallback(
    (centerPage: number) => {
      setRenderedPages((prev) => {
        const nextEntries = Object.entries(prev).filter(([pageNumber]) => {
          return Math.abs(Number(pageNumber) - centerPage) <= MEMORY_PAGE_RADIUS;
        });

        if (nextEntries.length === Object.keys(prev).length) {
          return prev;
        }

        return Object.fromEntries(nextEntries) as Record<number, HTMLCanvasElement>;
      });

      if (id) {
        memoryManager.current.cleanupDistantPages(id, centerPage, MEMORY_PAGE_RADIUS);
      }
    },
    [id]
  );

  const renderPage = useCallback(
    async (pageNumber: number): Promise<HTMLCanvasElement | null> => {
      if (!pdfDoc) return null;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });

        if (!context) {
          page.cleanup?.();
          return null;
        }

        const isMobile = window.innerWidth < 768;
        const devicePixelRatio = Math.min(
          window.devicePixelRatio || 1,
          isMobile ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP
        );
        const viewport = page.getViewport({ scale: scale * devicePixelRatio });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / devicePixelRatio}px`;
        canvas.style.height = `${viewport.height / devicePixelRatio}px`;

        await page.render({
          canvasContext: context,
          viewport,
          renderInteractiveForms: false,
        }).promise;

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'medium';
        page.cleanup?.();

        return canvas;
      } catch (renderError) {
        console.error('خطأ في رسم الصفحة:', renderError);
        return null;
      }
    },
    [pdfDoc, scale]
  );

  const renderSinglePage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !id) return;

      const existingCanvas = memoryManager.current.getPage(id, pageNumber);
      if (existingCanvas) {
        setRenderedPages((prev) => {
          if (prev[pageNumber] === existingCanvas) return prev;
          return { ...prev, [pageNumber]: existingCanvas };
        });
        return;
      }

      const canvas = await renderPage(pageNumber);
      if (!canvas) return;

      memoryManager.current.addPage(id, pageNumber, canvas);
      setRenderedPages((prev) => ({ ...prev, [pageNumber]: canvas }));
    },
    [id, pdfDoc, renderPage]
  );

  const prefetchAroundPage = useCallback(
    (pageNumber: number) => {
      const start = Math.max(1, pageNumber - 1);
      const end = Math.min(totalPages, pageNumber + 1);

      for (let page = start; page <= end; page += 1) {
        if (!renderedPagesRef.current[page]) {
          void renderSinglePage(page);
        }
      }

      // تنظيف الصفحات البعيدة فقط عند الحاجة الفعلية لتقليل الـ re-renders
      const renderedCount = Object.keys(renderedPagesRef.current).length;
      if (renderedCount > MEMORY_PAGE_RADIUS * 2 + 2) {
        pruneRenderedPages(pageNumber);
      }
    },
    [pruneRenderedPages, renderSinglePage, totalPages]
  );

  const loadChunk = useCallback(
    async (chunkIndex: number) => {
      if (!pdfDoc || loadedChunksRef.current.has(chunkIndex)) return;

      loadedChunksRef.current.add(chunkIndex);

      const startPage = chunkIndex * CHUNK_SIZE + 1;
      const endPage = Math.min(startPage + CHUNK_SIZE - 1, totalPages);
      const loadedPages: Record<number, HTMLCanvasElement> = {};

      for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
        // تخطّي الصفحات الموجودة في الذاكرة بالفعل
        const cached = id ? memoryManager.current.getPage(id, pageNumber) : null;
        if (cached) {
          loadedPages[pageNumber] = cached;
          await yieldToMainThread();
          continue;
        }

        const canvas = await renderPage(pageNumber);
        if (canvas) {
          loadedPages[pageNumber] = canvas;
          if (id) {
            memoryManager.current.addPage(id, pageNumber, canvas);
          }
        }
        await yieldToMainThread();
      }

      if (Object.keys(loadedPages).length > 0) {
        setRenderedPages((prev) => ({ ...prev, ...loadedPages }));
      }
    },
    [id, pdfDoc, renderPage, totalPages, yieldToMainThread]
  );

  const renderInitialPages = useCallback(async () => {
    if (!pdfDoc || totalPages === 0) return;
    await loadChunk(0);
  }, [loadChunk, pdfDoc, totalPages]);

  const rerenderVisiblePages = useCallback(async () => {
    if (!pdfDoc || !id) return;

    const startPage = Math.max(1, currentVisiblePageRef.current - VISIBLE_PAGE_WINDOW);
    const endPage = Math.min(totalPages, currentVisiblePageRef.current + VISIBLE_PAGE_WINDOW);

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      // تخطّي الصفحات المرسومة بالفعل لتجنّب إعادة رسم مكلفة (سبب رئيسي للتعليق)
      if (renderedPagesRef.current[pageNumber] || memoryManager.current.hasPage(id, pageNumber)) {
        continue;
      }
      await renderSinglePage(pageNumber);
      await yieldToMainThread();
    }
  }, [id, pdfDoc, renderSinglePage, totalPages, yieldToMainThread]);

  const getPagesText = useCallback(
    async (pages: number[]) => {
      if (!pdfDoc) return '';

      const uniquePages = Array.from(new Set(pages))
        .map((page) => Math.trunc(page))
        .filter((page) => page >= 1 && page <= pdfDoc.numPages);

      let output = '';

      for (const pageNumber of uniquePages) {
        const cached = pageTextCacheRef.current.get(pageNumber);
        if (typeof cached === 'string') {
          output += `\n--- صفحة ${pageNumber} ---\n${cached}`;
          continue;
        }

        try {
          const page = await pdfDoc.getPage(pageNumber);
          const textContent = await page.getTextContent({ normalizeWhitespace: true });
          const pageText = extractTextFromTextContent(textContent);
          pageTextCacheRef.current.set(pageNumber, pageText);
          output += `\n--- صفحة ${pageNumber} ---\n${pageText}`;
          page.cleanup?.();
        } catch (extractError) {
          console.warn(`تعذر استخراج نص الصفحة ${pageNumber}`, extractError);
          pageTextCacheRef.current.set(pageNumber, '');
          output += `\n--- صفحة ${pageNumber} ---\n`;
        }
      }

      return output;
    },
    [pdfDoc]
  );

  const jumpToPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || pageNumber < 1 || pageNumber > totalPages) return;

      isScrollingRef.current = true;
      isInitialNavigationRef.current = true;

      const chunkIndex = Math.floor((pageNumber - 1) / CHUNK_SIZE);
      if (!loadedChunksRef.current.has(chunkIndex)) {
        await loadChunk(chunkIndex);
      }

      await Promise.all([
        renderSinglePage(pageNumber),
        pageNumber > 1 ? renderSinglePage(pageNumber - 1) : Promise.resolve(),
        pageNumber < totalPages ? renderSinglePage(pageNumber + 1) : Promise.resolve(),
      ]);

      currentVisiblePageRef.current = pageNumber;
      setCurrentVisiblePage(pageNumber);
      scrollToPage(pageNumber, 'auto');
      toast.success(`تم الانتقال إلى الصفحة ${pageNumber}`);

      window.setTimeout(() => {
        isScrollingRef.current = false;
        isInitialNavigationRef.current = false;
      }, 150);
    },
    [loadChunk, pdfDoc, renderSinglePage, scrollToPage, totalPages]
  );

  const handleScroll = useCallback(
    throttle(() => {
      if (!containerRef.current || !pdfDoc || isInitialNavigationRef.current) return;

      const container = containerRef.current;
      const slotHeight = getSlotHeight();
      const nextPage = Math.min(totalPages, Math.max(1, Math.round(container.scrollTop / slotHeight) + 1));

      if (nextPage === currentVisiblePageRef.current) {
        prefetchAroundPage(nextPage);
        return;
      }

      currentVisiblePageRef.current = nextPage;
      setCurrentVisiblePage(nextPage);
      prefetchAroundPage(nextPage);

      const currentChunk = Math.floor((nextPage - 1) / CHUNK_SIZE);
      const nextChunk = currentChunk + 1;
      const previousChunk = currentChunk - 1;
      const positionInChunk = (nextPage - 1) % CHUNK_SIZE;

      if (positionInChunk >= CHUNK_SIZE - 2) {
        const nextChunkStart = nextChunk * CHUNK_SIZE + 1;
        if (nextChunkStart <= totalPages && !loadedChunksRef.current.has(nextChunk)) {
          void loadChunk(nextChunk);
        }
      }

      if (positionInChunk <= 1 && previousChunk >= 0 && !loadedChunksRef.current.has(previousChunk)) {
        void loadChunk(previousChunk);
      }
    }, 100),
    [getSlotHeight, loadChunk, pdfDoc, prefetchAroundPage, totalPages]
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      return;
    }

    void document.exitFullscreen();
  };

  const modeConfig = useMemo(() => getReadingModeConfig(readingMode), [readingMode]);

  const visiblePageNumbers = useMemo(() => {
    const start = Math.max(1, currentVisiblePage - VISIBLE_PAGE_WINDOW);
    const end = Math.min(totalPages, currentVisiblePage + VISIBLE_PAGE_WINDOW);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentVisiblePage, totalPages]);

  const totalReaderHeight = useMemo(() => Math.max(totalPages * getSlotHeight(), getSlotHeight()), [getSlotHeight, totalPages]);

  useEffect(() => {
    renderedPagesRef.current = renderedPages;
  }, [renderedPages]);

  useEffect(() => {
    currentVisiblePageRef.current = currentVisiblePage;
  }, [currentVisiblePage]);

  useEffect(() => {
    const updateSlotHeight = () => {
      const nextHeight = containerRef.current?.clientHeight || window.innerHeight || 0;
      setPageSlotHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    updateSlotHeight();
    window.addEventListener('resize', updateSlotHeight, { passive: true });

    return () => {
      window.removeEventListener('resize', updateSlotHeight);
    };
  }, []);

  useEffect(() => {
    const fetchSavedProgress = async () => {
      if (!book?.id) return;

      let page: number | null = null;

      if (user) {
        try {
          const { data, error: progressError } = await supabase
            .from('reading_history')
            .select('current_page')
            .eq('user_id', user.id)
            .eq('book_id', book.id)
            .single();

          if (!progressError && data?.current_page) {
            page = data.current_page;
          }
        } catch {
          page = null;
        }
      }

      if (!page) {
        const localProgress = getBookReadingProgress(book.id);
        if (localProgress?.currentPage && localProgress.currentPage > 1) {
          page = localProgress.currentPage;
        }
      }

      if (page && page > 1) {
        setSavedPage(page);
      }
    };

    void fetchSavedProgress();
  }, [book?.id, user]);

  useEffect(() => {
    if (!book?.book_file_url) return;

    const loadPDFDocument = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(15);
        setRenderedPages({});
        renderedPagesRef.current = {};
        setCurrentVisiblePage(1);
        currentVisiblePageRef.current = 1;
        setSavedPage(null);
        hasScrolledToSavedPage.current = false;
        loadedChunksRef.current.clear();
        pageTextCacheRef.current.clear();

        const loadingTask = pdfjsLib.getDocument({
          url: book.book_file_url,
          disableAutoFetch: true,
          disableStream: false,
          rangeChunkSize: 262144,
          isEvalSupported: false,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
        });

        loadingTask.onProgress = (progress: any) => {
          if (progress.total && progress.loaded) {
            const percent = (progress.loaded / progress.total) * 85;
            setLoadingProgress(Math.round(Math.min(Math.max(percent + 15, 15), 100)));
            return;
          }

          setLoadingProgress((prev) => Math.min(prev + 5, 90));
        };

        const nextPdfDoc = await loadingTask.promise;
        setPdfDoc(nextPdfDoc);
        setTotalPages(nextPdfDoc.numPages);
        setLoadingProgress(100);
        toast.success('تم تحميل الكتاب بنجاح');
      } catch (loadError) {
        console.error('خطأ في تحميل PDF:', loadError);
        toast.error('فشل في تحميل الكتاب');
        setLoadingProgress(0);
      } finally {
        window.setTimeout(() => setIsLoading(false), 150);
      }
    };

    void loadPDFDocument();
  }, [book?.book_file_url]);

  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return;
    void renderInitialPages();
  }, [pdfDoc, totalPages, renderInitialPages]);

  useEffect(() => {
    if (!pdfDoc || totalPages === 0 || !savedPage || savedPage <= 1 || hasScrolledToSavedPage.current) return;

    const restoreProgress = async () => {
      await Promise.all([
        renderSinglePage(savedPage),
        savedPage > 1 ? renderSinglePage(savedPage - 1) : Promise.resolve(),
        savedPage < totalPages ? renderSinglePage(savedPage + 1) : Promise.resolve(),
      ]);

      requestAnimationFrame(() => {
        currentVisiblePageRef.current = savedPage;
        setCurrentVisiblePage(savedPage);
        scrollToPage(savedPage, 'auto');
        hasScrolledToSavedPage.current = true;
        toast.success(`تمت إعادتك إلى الصفحة ${savedPage}`);
      });
    };

    void restoreProgress();
  }, [pdfDoc, renderSinglePage, savedPage, scrollToPage, totalPages]);

  // إعادة الرسم فقط عند تغيّر scale (وليس عند كل تغيّر pdfDoc) لتجنّب رسم مزدوج مكلف
  useEffect(() => {
    if (!pdfDoc) return;
    void rerenderVisiblePages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  useEffect(() => {
    if (!book || !currentVisiblePage || totalPages <= 0) return;

    const saveTimeout = window.setTimeout(() => {
      saveReadingProgress(
        book.id,
        currentVisiblePage,
        totalPages,
        book.title,
        book.author,
        book.cover_image_url
      );
    }, 1200);

    return () => {
      window.clearTimeout(saveTimeout);
    };
  }, [book, currentVisiblePage, totalPages]);

  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return;
    prefetchAroundPage(currentVisiblePage);
  }, [currentVisiblePage, pdfDoc, prefetchAroundPage, totalPages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    return () => {
      if (id) {
        memoryManager.current.clearDocument(id);
      }
      loadedChunksRef.current.clear();
      pageTextCacheRef.current.clear();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground font-cairo">جاري تحميل الكتاب...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2 font-amiri text-foreground">الكتاب غير متوفر</h2>
          <p className="mb-4 font-cairo text-muted-foreground">{error || 'لم يتم العثور على الكتاب المطلوب'}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <Home className="ml-2 h-4 w-4" />
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  if (!book.book_file_url) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2 font-amiri text-foreground">ملف الكتاب غير متوفر</h2>
          <p className="mb-4 font-cairo text-muted-foreground">عذراً، ملف هذا الكتاب غير متوفر للقراءة حالياً</p>
          <Button onClick={() => navigate(`/book/${id}`)} variant="outline">
            العودة إلى تفاصيل الكتاب
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background relative flex items-center justify-center p-1 sm:p-2">
      <div
        ref={containerRef}
        className="w-full max-w-6xl h-[calc(100vh-0.5rem)] sm:h-[calc(100vh-1rem)] bg-background rounded-2xl shadow-xl overflow-y-auto overflow-x-hidden border border-border/50 [&::-webkit-scrollbar]:hidden scrollbar-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          overscrollBehavior: 'contain',
        }}
        onScroll={fingerprintHandleScroll}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-background">
            <div className="text-center max-w-md w-full px-6">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-xl font-bold text-foreground font-amiri mb-2">جاري تحميل الكتاب</h3>
                <p className="text-muted-foreground font-cairo text-sm mb-6">يرجى الانتظار قليلاً...</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${loadingProgress}%` }}></div>
              </div>
              <div className="text-sm text-muted-foreground font-cairo">{loadingProgress}%</div>
            </div>
          </div>
        ) : !pdfDoc ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-foreground font-cairo">فشل في تحميل صفحات الكتاب</p>
              <Button onClick={() => window.location.reload()} className="mt-4">إعادة المحاولة</Button>
            </div>
          </div>
        ) : (
          <div style={{ height: totalReaderHeight, position: 'relative' }}>
            {visiblePageNumbers.map((pageNumber) => {
              const canvas = renderedPages[pageNumber];
              return (
                <div
                  key={pageNumber}
                  className="pdf-page absolute inset-x-0 flex items-center justify-center px-2 sm:px-4 overflow-hidden"
                  style={{
                    top: `${(pageNumber - 1) * getSlotHeight()}px`,
                    height: `${getSlotHeight()}px`,
                  }}
                >
                  {canvas ? (
                    <div
                      className="relative flex items-center justify-center w-full h-full"
                      style={{ lineHeight: 0 }}
                    >
                      <canvas
                        ref={(canvasElement) => {
                          if (!canvasElement) return;
                          if (
                            canvasElement.width === canvas.width &&
                            canvasElement.height === canvas.height &&
                            canvasElement.dataset.painted === '1'
                          ) {
                            return;
                          }

                          canvasElement.width = canvas.width;
                          canvasElement.height = canvas.height;

                          const context = canvasElement.getContext('2d', { alpha: false });
                          if (!context) return;

                          context.clearRect(0, 0, canvas.width, canvas.height);
                          context.drawImage(canvas, 0, 0);
                          canvasElement.dataset.painted = '1';
                        }}
                        className="rounded-xl shadow-sm"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          filter: modeConfig.filter,
                          backgroundColor: modeConfig.canvasBg,
                          transition: 'filter 0.2s ease',
                          willChange: 'filter',
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-3xl h-64 bg-muted/50 flex items-center justify-center rounded-xl">
                      <div className="text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                        <p className="text-sm font-cairo">جاري تحميل الصفحة {pageNumber}...</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 0 && !isLoading && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-background/90 backdrop-blur-md rounded-full shadow-lg border border-border/50 px-4 py-2 flex items-center gap-3">
            <PageJumpDialog currentPage={currentVisiblePage} totalPages={totalPages} onJumpToPage={jumpToPage} />
            <div className="w-px h-5 bg-border/50" />
            <div className="text-xs font-medium text-foreground font-cairo min-w-[76px] text-center">
              {currentVisiblePage} / {totalPages}
            </div>
            <ReadingModeSelector selectedMode={readingMode} onModeChange={setReadingMode} />
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 rounded-full hover:bg-accent"
              title="ملء الشاشة"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}


      {book && !isLoading && (
        <BookReaderAssistant
          bookId={book.id}
          bookTitle={book.title}
          bookAuthor={book.author}
          pdfTextContent={pdfTextContent}
          totalPages={totalPages}
          currentPage={currentVisiblePage}
          getPagesText={getPagesText}
        />
      )}

      <ReaderHints hints={readerHints} currentPage={currentVisiblePage} />
      <ReaderChatPanel bookId={book?.id} currentPage={currentVisiblePage} />
    </div>
  );
};

export default PDFJSReader;
