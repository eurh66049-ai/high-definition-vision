
import React, { useState, useRef, useEffect } from "react";

interface ResponsiveDescriptionProps {
  text?: string;
  lineClamp?: number; // عدد الأسطر قبل إظهار زر "عرض المزيد"
  className?: string;
  showLessLabel?: string;
  showMoreLabel?: string;
}

const DEFAULT_LINE_CLAMP = 10;

export const ResponsiveDescription: React.FC<ResponsiveDescriptionProps> = ({
  text = "",
  lineClamp = DEFAULT_LINE_CLAMP,
  className = "",
  showLessLabel = "عرض أقل",
  showMoreLabel = "عرض المزيد"
}) => {
  const [expanded, setExpanded] = useState(false);
  const [shouldShowExpand, setShouldShowExpand] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // نكتشف تلقائياً إذا كان النص أطول من الأسطر المحددة
    if (textRef.current) {
      const el = textRef.current;
      // نحسب الارتفاع الحقيقي والارتفاع بعد القص
      const initialLineClamp = lineClamp;
      el.style.webkitLineClamp = initialLineClamp.toString();
      el.style.display = "-webkit-box";
      el.style.webkitBoxOrient = "vertical";
      el.style.overflow = "hidden";
      el.style.maxHeight = "";
      // نأخذ القياسات
      const fullHeight = el.scrollHeight;
      // الآن نقص النص مؤقتاً
      el.style.webkitLineClamp = initialLineClamp.toString();
      el.style.display = "-webkit-box";
      el.style.maxHeight = `${initialLineClamp * 1.8}em`;
      // لو كان الفرق واضحاً عن الطول الكامل => نحتاج الزر
      setShouldShowExpand(fullHeight > el.clientHeight + 8);
      // نعيد الوضع الافتراضي
      el.style.maxHeight = "";
    }
  }, [text, lineClamp]);

  if (!text) return null;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={textRef}
        className={`transition-all duration-300 text-foreground leading-relaxed font-cairo text-justify whitespace-pre-wrap text-base ${
          !expanded ? `line-clamp-${lineClamp}` : ""
        }`}
        style={
          !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: lineClamp,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                maxHeight: `${lineClamp * 1.5}em`
              }
            : { display: "block", WebkitLineClamp: "unset", WebkitBoxOrient: "unset", overflow: "visible", maxHeight: "none" }
        }
      >
        {text}
      </div>
      
      {shouldShowExpand && (
        <div className="flex justify-center mt-4">
          <button
            className="group inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-all duration-200 hover:underline underline-offset-4 decoration-2"
            onClick={() => setExpanded((v) => !v)}
          >
            <span>{expanded ? showLessLabel : showMoreLabel}</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ResponsiveDescription;
