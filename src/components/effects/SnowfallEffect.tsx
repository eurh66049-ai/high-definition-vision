import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Snowflake {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const SnowfallEffect: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  
  // تقليل عدد رقاقات الثلج لتحسين الأداء
  const snowflakes = useMemo(() => {
    const flakes: Snowflake[] = [];
    const count = window.innerWidth < 768 ? 20 : 35; // عدد أقل بكثير
    
    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 10 + 8,
        duration: Math.random() * 12 + 10,
        delay: Math.random() * 6,
        opacity: Math.random() * 0.4 + 0.4,
      });
    }
    
    return flakes;
  }, []);

  // إخفاء التأثير عند التمرير لتحسين الأداء
  useEffect(() => {
    let scrollTimeout: number;
    
    const handleScroll = () => {
      setIsVisible(false);
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => setIsVisible(true), 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute text-white will-change-transform"
          initial={{
            x: `${flake.x}vw`,
            y: -20,
          }}
          animate={{
            y: '105vh',
            x: [
              `${flake.x}vw`,
              `${flake.x + 5}vw`,
              `${flake.x - 5}vw`,
              `${flake.x}vw`,
            ],
          }}
          transition={{
            duration: flake.duration,
            delay: flake.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            fontSize: flake.size,
            opacity: flake.opacity,
            filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))',
          }}
        >
          ❄
        </motion.div>
      ))}
      
      {/* أيقونة شتوية بسيطة */}
      <motion.div
        className="fixed bottom-24 md:bottom-8 left-4 z-50 text-3xl cursor-pointer select-none"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.2 }}
        title="فصل الشتاء ❄️"
      >
        ⛄
      </motion.div>
    </div>
  );
};

export default SnowfallEffect;
