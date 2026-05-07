import React from "react";

interface DisplayOnlyIconProps {
  className?: string;
  title?: string;
}

export const DisplayOnlyIcon: React.FC<DisplayOnlyIconProps> = ({
  className = "h-10 w-10",
  title = "أيقونة حقوق محسنة",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 220 220"
    role="img"
    aria-label={title}
    className={className}
  >
    <defs>
      {/* تدرج للخلفية */}
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>

      {/* ظل دائري ناعم */}
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* خلفية دائرية بتدرج وظل */}
    <circle cx="110" cy="110" r="100" fill="url(#bgGrad)" filter="url(#shadow)" />

    {/* حلقة بيضاء داخلية سميكة بحواف ناعمة */}
    <circle cx="110" cy="110" r="74" fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round" />

    {/* حلقة زرقاء أرفع بنفس التدرج */}
    <circle cx="110" cy="110" r="48" fill="url(#bgGrad)" />

    {/* حرف C موجه بحيث الفتحة لليمين */}
    <circle
      cx="110"
      cy="110"
      r="40"
      fill="none"
      stroke="#fff"
      strokeWidth="16"
      strokeLinecap="round"
      strokeDasharray="220 32"
      strokeDashoffset="250"
    />
  </svg>
);

export default DisplayOnlyIcon;
