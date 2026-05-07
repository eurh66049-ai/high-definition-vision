import React from 'react';

interface QuoteIconProps {
  className?: string;
  style?: React.CSSProperties;
}

const QuoteIcon: React.FC<QuoteIconProps> = ({ className = '', style }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z" />
    </svg>
  );
};

export default QuoteIcon;