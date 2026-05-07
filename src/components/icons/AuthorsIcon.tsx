import React from 'react';

interface AuthorsIconProps {
  className?: string;
  style?: React.CSSProperties;
}

const AuthorsIcon: React.FC<AuthorsIconProps> = ({ className, style }) => {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V19C4 19.55 4.45 20 5 20H19C19.55 20 20 19.55 20 19V18C20 15.34 14.67 14 12 14Z"/>
      <path d="M18 9C18.55 9 19 8.55 19 8C19 7.45 18.55 7 18 7C17.45 7 17 7.45 17 8C17 8.55 17.45 9 18 9ZM6 9C6.55 9 7 8.55 7 8C7 7.45 6.55 7 6 7C5.45 7 5 7.45 5 8C5 8.55 5.45 9 6 9Z"/>
    </svg>
  );
};

export default AuthorsIcon;