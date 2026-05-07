import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useQuoteLikes } from '@/hooks/useQuoteLikes';
import { toast } from 'sonner';

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  type: 'heart' | 'sparkle' | 'dot';
  color: string;
  delay: number;
}

const COLORS = ['#ef4444', '#f97316', '#ec4899', '#f43f5e', '#fb7185', '#fda4af'];

const generateParticles = (): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const distance = 30 + Math.random() * 35;
    particles.push({
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      scale: 0.4 + Math.random() * 0.8,
      rotation: Math.random() * 360,
      type: i % 3 === 0 ? 'heart' : i % 3 === 1 ? 'sparkle' : 'dot',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.1,
    });
  }
  return particles;
};

const ParticleElement: React.FC<{ particle: Particle }> = ({ particle }) => {
  if (particle.type === 'heart') {
    return (
      <motion.div
        initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
        animate={{
          opacity: [1, 1, 0],
          x: particle.x,
          y: particle.y,
          scale: [0, particle.scale, 0],
          rotate: particle.rotation,
        }}
        transition={{ duration: 0.7, delay: particle.delay, ease: 'easeOut' }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <Heart className="h-3 w-3 fill-current" style={{ color: particle.color }} />
      </motion.div>
    );
  }

  if (particle.type === 'sparkle') {
    return (
      <motion.div
        initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
        animate={{
          opacity: [1, 1, 0],
          x: particle.x * 1.2,
          y: particle.y * 1.2,
          scale: [0, particle.scale * 1.5, 0],
        }}
        transition={{ duration: 0.6, delay: particle.delay, ease: 'easeOut' }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill={particle.color}>
          <path d="M4 0L4.9 2.8H7.8L5.4 4.5L6.3 7.3L4 5.6L1.7 7.3L2.6 4.5L0.2 2.8H3.1L4 0Z" />
        </svg>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [1, 0.8, 0],
        x: particle.x * 0.8,
        y: particle.y * 0.8,
        scale: [0, particle.scale, 0],
      }}
      transition={{ duration: 0.5, delay: particle.delay, ease: 'easeOut' }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: particle.color }} />
    </motion.div>
  );
};

interface QuoteLikeButtonProps {
  quoteId: string;
}

export const QuoteLikeButton: React.FC<QuoteLikeButtonProps> = ({ quoteId }) => {
  const { user } = useAuth();
  const { likesCount, isLiked, toggleLike } = useQuoteLikes(quoteId);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [burstKey, setBurstKey] = useState(0);

  const handleLikeClick = useCallback(async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للإعجاب بالاقتباس');
      return;
    }
    try {
      if (!isLiked) {
        setParticles(generateParticles());
        setBurstKey(prev => prev + 1);
      }
      await toggleLike();
    } catch {
      toast.error('حدث خطأ أثناء الإعجاب بالاقتباس');
    }
  }, [user, isLiked, toggleLike]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLikeClick}
        className={`relative flex items-center gap-2 rounded-full px-4 transition-all duration-300 overflow-visible ${
          isLiked
            ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
            : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
        }`}
      >
        <div className="relative">
          <motion.div
            animate={isLiked ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Heart
              className={`h-5 w-5 transition-all duration-300 ${
                isLiked ? 'fill-current drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]' : ''
              }`}
            />
          </motion.div>

          {/* Ring burst */}
          <AnimatePresence>
            {isLiked && (
              <motion.div
                key={`ring-${burstKey}`}
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-5 h-5 rounded-full border-2 border-red-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Particles */}
          <AnimatePresence>
            {particles.length > 0 && (
              <div key={`particles-${burstKey}`} className="absolute inset-0 pointer-events-none">
                {particles.map(p => (
                  <ParticleElement key={p.id} particle={p} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <motion.span
          key={likesCount}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-medium tabular-nums"
        >
          {likesCount}
        </motion.span>
      </Button>
    </div>
  );
};
