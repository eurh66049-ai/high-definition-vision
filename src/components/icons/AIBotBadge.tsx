import React from 'react';
import { Bot } from 'lucide-react';

interface AIBotBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badge clearly marking an account/comment as an AI bot.
 * Per user request: bots MUST be obviously identified.
 */
export const AIBotBadge: React.FC<AIBotBadgeProps> = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };
  const iconSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 font-medium ${sizeClasses[size]} ${className}`}
      title="حساب ذكاء اصطناعي - مُعلَن بوضوح"
    >
      <Bot size={iconSize} aria-hidden="true" />
      <span>بوت AI</span>
    </span>
  );
};

export default AIBotBadge;