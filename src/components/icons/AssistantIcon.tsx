import React from 'react';

interface AssistantIconProps {
  className?: string;
}

const AssistantIcon: React.FC<AssistantIconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Sparkle/AI magic effect */}
      <path d="M12 2L13.5 5.5L17 4L15.5 7.5L19 9L15.5 10.5L17 14L13.5 12.5L12 16L10.5 12.5L7 14L8.5 10.5L5 9L8.5 7.5L7 4L10.5 5.5L12 2Z" />
      {/* Chat bubble base */}
      <path d="M4 18C4 16.8954 4.89543 16 6 16H18C19.1046 16 20 16.8954 20 18V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V18Z" />
      {/* Dots for chat */}
      <circle cx="8" cy="19" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
      <circle cx="16" cy="19" r="1" fill="currentColor" />
    </svg>
  );
};

export default AssistantIcon;
