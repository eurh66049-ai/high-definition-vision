
import React from 'react';
import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

const ProgressIndicator = ({ current, total }: ProgressIndicatorProps) => {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <motion.div 
      className="fixed bottom-0 right-0 left-0 z-50 h-1 bg-gray-200 dark:bg-gray-700"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <motion.div 
        className="h-full bg-gradient-to-r from-book-primary to-book-secondary"
        initial={{ width: '0%' }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

export default ProgressIndicator;
