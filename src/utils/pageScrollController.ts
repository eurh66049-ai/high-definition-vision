// مساعد للتحكم في التنقل بين الصفحات مع منع التمرير السريع
export class PageScrollController {
  private isScrolling = false;
  private scrollTimeout?: NodeJS.Timeout;
  private lastScrollTime = 0;
  private readonly SCROLL_COOLDOWN = 800; // مدة منع التمرير بالمللي ثانية

  constructor(private container: HTMLElement) {
    this.setupScrollControl();
  }

  private setupScrollControl() {
    // منع التمرير السريع
    this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();
    
    const now = Date.now();
    if (now - this.lastScrollTime < this.SCROLL_COOLDOWN) {
      return; // منع التمرير السريع
    }

    this.lastScrollTime = now;
    
    if (event.deltaY > 0) {
      this.scrollToNextPage();
    } else {
      this.scrollToPrevPage();
    }
  }

  private touchStartY = 0;
  private handleTouchStart(event: TouchEvent) {
    this.touchStartY = event.touches[0].clientY;
  }

  private handleTouchMove(event: TouchEvent) {
    if (this.isScrolling) {
      event.preventDefault();
      return;
    }

    const touchEndY = event.touches[0].clientY;
    const deltaY = this.touchStartY - touchEndY;
    
    // تجاهل الحركات الصغيرة
    if (Math.abs(deltaY) < 50) return;

    event.preventDefault();
    
    const now = Date.now();
    if (now - this.lastScrollTime < this.SCROLL_COOLDOWN) {
      return;
    }

    this.lastScrollTime = now;
    
    if (deltaY > 0) {
      this.scrollToNextPage();
    } else {
      this.scrollToPrevPage();
    }
  }

  private scrollToNextPage() {
    const pages = this.container.querySelectorAll('.pdf-page');
    const currentPageIndex = this.getCurrentPageIndex();
    
    // التأكد من عدم تجاوز آخر صفحة
    if (currentPageIndex < pages.length - 1) {
      const nextPageIndex = currentPageIndex + 1;
      // التحقق من أن الصفحة التالية محمّلة
      if (this.isPageLoaded(nextPageIndex)) {
        this.scrollToPage(nextPageIndex);
      }
    }
  }

  private scrollToPrevPage() {
    const pages = this.container.querySelectorAll('.pdf-page');
    const currentPageIndex = this.getCurrentPageIndex();
    
    // التأكد من عدم تجاوز أول صفحة
    if (currentPageIndex > 0) {
      this.scrollToPage(currentPageIndex - 1);
    }
  }

  // الحصول على فهرس الصفحة الحالية (يبدأ من 0)
  private getCurrentPageIndex(): number {
    const pages = this.container.querySelectorAll('.pdf-page');
    const containerRect = this.container.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;
    
    let closestPageIndex = 0;
    let closestDistance = Infinity;
    
    for (let i = 0; i < pages.length; i++) {
      const pageRect = pages[i].getBoundingClientRect();
      const pageCenter = pageRect.top + pageRect.height / 2;
      const distance = Math.abs(pageCenter - centerY);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPageIndex = i;
      }
    }
    
    return closestPageIndex;
  }

  // التحقق من أن الصفحة محمّلة
  private isPageLoaded(pageIndex: number): boolean {
    const pages = this.container.querySelectorAll('.pdf-page');
    const targetPage = pages[pageIndex] as HTMLElement;
    
    if (!targetPage) return false;
    
    // البحث عن الصورة في الصفحة والتحقق من تحميلها
    const img = targetPage.querySelector('img');
    if (!img) return false;
    
    // التحقق من أن الصورة محمّلة بالكامل
    return img.complete && img.naturalHeight !== 0;
  }

  private scrollToPage(pageIndex: number) {
    this.isScrolling = true;
    
    const pages = this.container.querySelectorAll('.pdf-page');
    const targetPage = pages[pageIndex] as HTMLElement;
    
    if (targetPage) {
      targetPage.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      console.log(`تم الانتقال إلى الصفحة ${pageIndex + 1}`);
    }

    // إعادة تمكين التمرير بعد انتهاء الحركة
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 1000);
  }

  // التنقل المباشر لصفحة معينة
  public goToPage(pageNumber: number) {
    const pages = this.container.querySelectorAll('.pdf-page');
    if (pageNumber >= 1 && pageNumber <= pages.length) {
      this.scrollToPage(pageNumber - 1);
    }
  }

  // الحصول على رقم الصفحة الحالية
  public getCurrentPage(): number {
    return this.getCurrentPageIndex() + 1;
  }

  // تنظيف المستمعين
  public destroy() {
    this.container.removeEventListener('wheel', this.handleWheel.bind(this));
    this.container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }
}

export default PageScrollController;