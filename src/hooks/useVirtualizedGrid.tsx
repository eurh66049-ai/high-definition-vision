import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnhancedResponsive } from './use-enhanced-responsive';

interface VirtualizedGridOptions {
  itemHeight: number;
  itemWidth: number;
  containerHeight: number;
  gap?: number;
  overscan?: number;
}

interface VirtualizedItem {
  index: number;
  top: number;
  left: number;
  isVisible: boolean;
}

export const useVirtualizedGrid = <T extends any>(
  items: T[], 
  options: VirtualizedGridOptions
) => {
  const responsive = useEnhancedResponsive();
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const {
    itemHeight,
    itemWidth,
    containerHeight,
    gap = 16,
    overscan = 3
  } = options;

  // حساب عدد الأعمدة بناءً على عرض الحاوية
  const columnsCount = useMemo(() => {
    if (containerWidth === 0) return responsive.getOptimalColumns(itemWidth);
    return Math.floor(containerWidth / (itemWidth + gap));
  }, [containerWidth, itemWidth, gap, responsive]);

  // حساب المواضع الافتراضية للعناصر
  const itemPositions = useMemo(() => {
    return items.map((_, index) => {
      const row = Math.floor(index / columnsCount);
      const col = index % columnsCount;
      
      return {
        index,
        top: row * (itemHeight + gap),
        left: col * (itemWidth + gap),
        isVisible: false
      };
    });
  }, [items.length, columnsCount, itemHeight, itemWidth, gap]);

  // حساب العناصر المرئية
  const visibleItems = useMemo(() => {
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const endRow = Math.ceil((scrollTop + containerHeight) / (itemHeight + gap));
    
    const startIndex = Math.max(0, (startRow - overscan) * columnsCount);
    const endIndex = Math.min(items.length, (endRow + overscan) * columnsCount);

    return itemPositions.slice(startIndex, endIndex).map(position => ({
      ...position,
      isVisible: true,
      item: items[position.index]
    }));
  }, [scrollTop, containerHeight, itemHeight, gap, overscan, columnsCount, itemPositions, items]);

  // حساب الارتفاع الإجمالي
  const totalHeight = useMemo(() => {
    const totalRows = Math.ceil(items.length / columnsCount);
    return totalRows * (itemHeight + gap) - gap;
  }, [items.length, columnsCount, itemHeight, gap]);

  // معالج التمرير
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // معالج تغيير حجم الحاوية
  const handleResize = useCallback((width: number) => {
    setContainerWidth(width);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    handleResize,
    columnsCount
  };
};