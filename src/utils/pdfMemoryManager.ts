// مدير الذاكرة لملفات PDF الكبيرة
export class PDFMemoryManager {
  private static instance: PDFMemoryManager;
  private renderedPages: Map<string, { [key: number]: HTMLCanvasElement }> = new Map();
  private lastAccessTime: Map<string, { [key: number]: number }> = new Map();
  private readonly MAX_PAGES_PER_DOCUMENT = 12; // متناسق مع MEMORY_PAGE_RADIUS لتفادي طرد/إعادة رسم متكرر
  private readonly CLEANUP_INTERVAL = 30000; // 30 ثانية
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupTimer();
  }

  static getInstance(): PDFMemoryManager {
    if (!PDFMemoryManager.instance) {
      PDFMemoryManager.instance = new PDFMemoryManager();
    }
    return PDFMemoryManager.instance;
  }

  // إضافة صفحة للذاكرة
  addPage(documentId: string, pageNumber: number, canvas: HTMLCanvasElement): void {
    if (!this.renderedPages.has(documentId)) {
      this.renderedPages.set(documentId, {});
      this.lastAccessTime.set(documentId, {});
    }

    const docPages = this.renderedPages.get(documentId)!;
    const accessTimes = this.lastAccessTime.get(documentId)!;

    // إضافة الصفحة الجديدة
    docPages[pageNumber] = canvas;
    accessTimes[pageNumber] = Date.now();

    // تنظيف الذاكرة إذا تجاوزنا الحد الأقصى
    this.cleanupOldPages(documentId);
  }

  // الحصول على صفحة من الذاكرة
  getPage(documentId: string, pageNumber: number): HTMLCanvasElement | null {
    const docPages = this.renderedPages.get(documentId);
    const accessTimes = this.lastAccessTime.get(documentId);

    if (docPages && accessTimes && docPages[pageNumber]) {
      // تحديث وقت الوصول
      accessTimes[pageNumber] = Date.now();
      return docPages[pageNumber];
    }

    return null;
  }

  // التحقق من وجود صفحة في الذاكرة
  hasPage(documentId: string, pageNumber: number): boolean {
    const docPages = this.renderedPages.get(documentId);
    return docPages ? !!docPages[pageNumber] : false;
  }

  // حذف صفحات قديمة للمستند
  private cleanupOldPages(documentId: string): void {
    const docPages = this.renderedPages.get(documentId);
    const accessTimes = this.lastAccessTime.get(documentId);

    if (!docPages || !accessTimes) return;

    const pageNumbers = Object.keys(docPages).map(Number);
    
    if (pageNumbers.length > this.MAX_PAGES_PER_DOCUMENT) {
      // ترتيب الصفحات حسب وقت الوصول (الأقدم أولاً)
      const sortedPages = pageNumbers.sort((a, b) => 
        (accessTimes[a] || 0) - (accessTimes[b] || 0)
      );

      // حذف الصفحات الأقدم
      const pagesToRemove = sortedPages.slice(0, pageNumbers.length - this.MAX_PAGES_PER_DOCUMENT);
      
      pagesToRemove.forEach(pageNum => {
        delete docPages[pageNum];
        delete accessTimes[pageNum];
      });
    }
  }

  // حذف صفحات بعيدة عن الصفحة الحالية
  cleanupDistantPages(documentId: string, currentPage: number, range: number = 5): void {
    const docPages = this.renderedPages.get(documentId);
    const accessTimes = this.lastAccessTime.get(documentId);

    if (!docPages || !accessTimes) return;

    const pageNumbers = Object.keys(docPages).map(Number);
    const pagesToRemove = pageNumbers.filter(pageNum => 
      Math.abs(pageNum - currentPage) > range
    );

    pagesToRemove.forEach(pageNum => {
      delete docPages[pageNum];
      delete accessTimes[pageNum];
    });
  }

  // حذف صفحة محددة
  removePage(documentId: string, pageNumber: number): void {
    const docPages = this.renderedPages.get(documentId);
    const accessTimes = this.lastAccessTime.get(documentId);

    if (docPages && accessTimes) {
      delete docPages[pageNumber];
      delete accessTimes[pageNumber];
    }
  }

  // تنظيف دوري للذاكرة
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const OLD_PAGE_THRESHOLD = 5 * 60 * 1000; // 5 دقائق

      this.renderedPages.forEach((docPages, documentId) => {
        const accessTimes = this.lastAccessTime.get(documentId);
        if (!accessTimes) return;

        const pageNumbers = Object.keys(docPages).map(Number);
        const oldPages = pageNumbers.filter(pageNum => 
          now - (accessTimes[pageNum] || 0) > OLD_PAGE_THRESHOLD
        );

        oldPages.forEach(pageNum => {
          delete docPages[pageNum];
          delete accessTimes[pageNum];
        });
      });
    }, this.CLEANUP_INTERVAL);
  }

  // تنظيف مستند كامل من الذاكرة
  clearDocument(documentId: string): void {
    this.renderedPages.delete(documentId);
    this.lastAccessTime.delete(documentId);
  }

  // الحصول على إحصائيات الذاكرة
  getMemoryStats(): { [documentId: string]: number } {
    const stats: { [documentId: string]: number } = {};
    
    this.renderedPages.forEach((docPages, documentId) => {
      stats[documentId] = Object.keys(docPages).length;
    });

    return stats;
  }

  // تدمير المدير وتنظيف الذاكرة
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.renderedPages.clear();
    this.lastAccessTime.clear();
  }
}

export default PDFMemoryManager;