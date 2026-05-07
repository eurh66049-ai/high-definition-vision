// تأثير رمضان - نسخة خفيفة CSS فقط بدون framer-motion
import React, { useMemo } from 'react';

const RamadanEffect: React.FC = () => {
  const elements = useMemo(() => {
    const count = 8;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animDuration: `${Math.random() * 18 + 14}s`,
      animDelay: `${Math.random() * 10}s`,
      opacity: Math.random() * 0.2 + 0.1,
      size: Math.random() * 5 + 3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes ramadan-fall {
          0% { transform: translateY(-20px) scale(0); }
          10% { transform: translateY(10vh) scale(1); }
          90% { transform: translateY(95vh) scale(1); }
          100% { transform: translateY(105vh) scale(0.5); }
        }
      `}</style>
      {elements.map((el) => (
        <span
          key={el.id}
          className="absolute will-change-transform"
          style={{
            left: el.left,
            fontSize: el.size,
            opacity: el.opacity,
            animation: `ramadan-fall ${el.animDuration} ${el.animDelay} linear infinite`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
};

export default RamadanEffect;
