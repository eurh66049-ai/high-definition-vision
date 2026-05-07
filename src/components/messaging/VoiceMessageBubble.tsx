import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessageBubbleProps {
  audioUrl: string;
  durationMs?: number | null;
  isOwn: boolean;
}

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  audioUrl,
  durationMs,
  isOwn,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs || 0);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) {
      setLoading(true);
      const audio = new Audio(audioUrl);
      audio.preload = 'metadata';
      audioRef.current = audio;
      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          setTotalMs(Math.round(audio.duration * 1000));
        }
      });
      audio.addEventListener('canplay', () => setLoading(false), { once: true });
      audio.addEventListener('timeupdate', () => {
        setProgressMs(Math.round(audio.currentTime * 1000));
      });
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgressMs(0);
      });
      audio.addEventListener('error', () => {
        setLoading(false);
        setIsPlaying(false);
      });
    }
    const audio = audioRef.current;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {
        setLoading(false);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const pct = totalMs > 0 ? Math.min(100, (progressMs / totalMs) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors',
          isOwn
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
            : 'bg-foreground/10 hover:bg-foreground/20 text-foreground',
        )}
        aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ms-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'h-1 rounded-full overflow-hidden',
            isOwn ? 'bg-primary-foreground/25' : 'bg-foreground/15',
          )}
        >
          <div
            className={cn(
              'h-full transition-[width] duration-150',
              isOwn ? 'bg-primary-foreground' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className={cn(
            'text-[10px] mt-1 tabular-nums',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {formatTime(isPlaying || progressMs > 0 ? progressMs : totalMs)} {totalMs > 0 && progressMs > 0 ? `/ ${formatTime(totalMs)}` : ''}
        </div>
      </div>
    </div>
  );
};

export default VoiceMessageBubble;