import React from 'react';

interface CategoriesIconProps {
  className?: string;
  style?: React.CSSProperties;
}

const CategoriesIcon: React.FC<CategoriesIconProps> = ({ className = "h-5 w-5", style }) => {
  return (
    <svg 
      className={className} 
      fill="currentColor" 
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <path d="M4 6H6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM8 4v2h8V4H8zm-2 8v6h4v-6H6zm6 6h4v-6h-4v6zm4-8v-2H6v2h12z"/>
      <path d="M14 14h2v2h-2zM10 14h2v2h-2z"/>
    </svg>
  );
};

export default CategoriesIcon;