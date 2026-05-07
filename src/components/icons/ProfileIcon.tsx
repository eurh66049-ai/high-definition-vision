import React from 'react';

interface ProfileIconProps {
  className?: string;
  style?: React.CSSProperties;
}

const ProfileIcon: React.FC<ProfileIconProps> = ({ className = "h-5 w-5", style }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 512 512" 
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      style={style}
    >
      <path d="M256 256c70.7 0 128-57.3 128-128S326.7 0 256 0 128 57.3 128 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C132.7 288 96 324.7 96 359.4V394c0 26.5 21.5 48 48 48h224c26.5 0 48-21.5 48-48v-34.6c0-34.7-36.7-71.4-70.4-71.4z"/>
    </svg>
  );
};

export default ProfileIcon;