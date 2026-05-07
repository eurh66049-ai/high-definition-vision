// مجموعة من الأدوات المساعدة للتحكم في التمرير

/**
 * إنشاء دالة محدودة التكرار للتحكم في سرعة التمرير
 * @param func الدالة المراد تحديدها
 * @param delay التأخير بالميلي ثانية
 * @returns دالة محدودة التكرار
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * إنشاء دالة مؤجلة لتأخير التنفيذ
 * @param func الدالة المراد تأجيلها
 * @param delay التأخير بالميلي ثانية
 * @returns دالة مؤجلة
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * التمرير السلس إلى عنصر معين
 * @param element العنصر المراد التمرير إليه
 * @param container الحاوي (اختياري)
 * @param behavior سلوك التمرير (smooth أو auto)
 */
export function smoothScrollToElement(
  element: HTMLElement,
  container?: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (container) {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const offsetTop = elementRect.top - containerRect.top + container.scrollTop;
    
    container.scrollTo({
      top: offsetTop,
      behavior
    });
  } else {
    element.scrollIntoView({ behavior, block: 'start' });
  }
}

/**
 * التمرير السلس إلى موضع معين
 * @param container العنصر الحاوي
 * @param position الموضع المراد التمرير إليه
 * @param behavior سلوك التمرير
 */
export function smoothScrollToPosition(
  container: HTMLElement,
  position: number,
  behavior: ScrollBehavior = 'smooth'
): void {
  container.scrollTo({
    top: position,
    behavior
  });
}

/**
 * حساب الصفحة المرئية بناءً على موضع التمرير
 * @param container الحاوي
 * @param pageElements عناصر الصفحات
 * @returns رقم الصفحة المرئية
 */
export function calculateVisiblePage(
  container: HTMLElement,
  pageElements: NodeListOf<Element>
): number {
  const containerRect = container.getBoundingClientRect();
  const containerCenter = containerRect.top + containerRect.height / 2;
  
  let visiblePage = 1;
  let minDistance = Infinity;
  
  pageElements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const elementCenter = rect.top + rect.height / 2;
    const distance = Math.abs(elementCenter - containerCenter);
    
    if (distance < minDistance) {
      minDistance = distance;
      visiblePage = index + 1;
    }
  });
  
  return visiblePage;
}

/**
 * فئة للتحكم في التنقل بين الصفحات مع منع التمرير السريع
 */
export class PageNavigationController {
  private isNavigating = false;
  private navigationDelay: number;

  constructor(navigationDelay = 500) {
    this.navigationDelay = navigationDelay;
  }

  /**
   * تنفيذ عملية تنقل إذا لم تكن هناك عملية تنقل جارية
   * @param callback دالة التنقل
   * @returns true إذا تم التنفيذ، false إذا كان هناك تنقل جاري
   */
  public navigate(callback: () => void): boolean {
    if (this.isNavigating) {
      return false;
    }

    this.isNavigating = true;
    callback();
    
    setTimeout(() => {
      this.isNavigating = false;
    }, this.navigationDelay);

    return true;
  }

  /**
   * إعادة تعيين حالة التنقل
   */
  public reset(): void {
    this.isNavigating = false;
  }

  /**
   * التحقق من حالة التنقل
   */
  public isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }
}