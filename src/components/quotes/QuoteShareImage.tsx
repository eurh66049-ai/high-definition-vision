import React, { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Quote } from '@/hooks/useQuotes';

interface QuoteShareImageProps {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEMES = [
  { id: 'warm', bg: '#1a1410', accent: '#d4a574', text: '#f5e6d3', sub: '#b8956a', label: 'دافئ' },
  { id: 'ocean', bg: '#0c1929', accent: '#5b9bd5', text: '#e8f0fe', sub: '#7baed4', label: 'محيط' },
  { id: 'forest', bg: '#0f1a14', accent: '#6db58a', text: '#e4f2ea', sub: '#8bc9a3', label: 'غابة' },
  { id: 'sunset', bg: '#1f1018', accent: '#e07a5f', text: '#fce8e0', sub: '#d9927f', label: 'غروب' },
  { id: 'night', bg: '#111827', accent: '#a78bfa', text: '#ede9fe', sub: '#c4b5fd', label: 'ليلي' },
  { id: 'minimal', bg: '#fafaf9', accent: '#57534e', text: '#1c1917', sub: '#78716c', label: 'بسيط' },
];

const CANVAS_W = 1080;
const CANVAS_H = 1350;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export const QuoteShareImage: React.FC<QuoteShareImageProps> = ({ quote, open, onOpenChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = selectedTheme;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Decorative corner accents
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.3;
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(CANVAS_W - 60, 40);
    ctx.lineTo(CANVAS_W - 40, 40);
    ctx.lineTo(CANVAS_W - 40, 60);
    ctx.stroke();
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(60, CANVAS_H - 40);
    ctx.lineTo(40, CANVAS_H - 40);
    ctx.lineTo(40, CANVAS_H - 60);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Large decorative quote mark
    ctx.font = 'bold 200px serif';
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.08;
    ctx.textAlign = 'right';
    ctx.fillText('"', CANVAS_W - 60, 220);
    ctx.globalAlpha = 1;

    // Accent line
    ctx.fillStyle = t.accent;
    ctx.fillRect(CANVAS_W / 2 - 40, 120, 80, 4);

    // Quote text
    const fontSize = quote.quote_text.length > 200 ? 36 : quote.quote_text.length > 100 ? 42 : 50;
    ctx.font = `${fontSize}px 'Noto Naskh Arabic', 'Arial', serif`;
    ctx.fillStyle = t.text;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';

    const maxTextWidth = CANVAS_W - 160;
    const lineHeight = fontSize * 1.8;
    const lines = wrapText(ctx, `" ${quote.quote_text} "`, maxTextWidth, lineHeight);

    const totalTextHeight = lines.length * lineHeight;
    const startY = Math.max(200, (CANVAS_H - totalTextHeight) / 2 - 80);

    lines.forEach((line, i) => {
      ctx.fillText(line, CANVAS_W / 2, startY + i * lineHeight);
    });

    // Divider
    const dividerY = startY + totalTextHeight + 50;
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(CANVAS_W / 2 - 30, dividerY, 60, 2);
    ctx.globalAlpha = 1;

    // Author name
    ctx.font = `bold 34px 'Noto Naskh Arabic', 'Arial', sans-serif`;
    ctx.fillStyle = t.accent;
    ctx.textAlign = 'center';
    ctx.fillText(`— ${quote.author_name}`, CANVAS_W / 2, dividerY + 55);

    // Book title
    ctx.font = `28px 'Noto Naskh Arabic', 'Arial', sans-serif`;
    ctx.fillStyle = t.sub;
    ctx.fillText(`📖 ${quote.book_title}`, CANVAS_W / 2, dividerY + 105);

    // Watermark
    ctx.font = `22px 'Arial', sans-serif`;
    ctx.fillStyle = t.sub;
    ctx.globalAlpha = 0.4;
    ctx.fillText('كتوبي — Kotobi', CANVAS_W / 2, CANVAS_H - 50);
    ctx.globalAlpha = 1;
  }, [selectedTheme, quote]);

  // Draw whenever dialog opens or theme changes
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure canvas is mounted
      requestAnimationFrame(() => {
        drawCanvas();
      });
    }
  }, [open, drawCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `quote-${quote.id.slice(0, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('تم تحميل الصورة بنجاح');
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create blob');

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'quote.png', { type: 'image/png' });
        const shareData = { files: [file], title: 'اقتباس من كتوبي' };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }
      // Fallback: download
      handleDownload();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handleDownload();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto pb-24 sm:pb-6">
        <DialogHeader>
          <DialogTitle className="text-center">مشاركة الاقتباس كصورة</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Theme selector */}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <Palette className="h-4 w-4 text-muted-foreground" />
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedTheme.id === theme.id 
                    ? 'border-primary scale-110 ring-2 ring-primary/30' 
                    : 'border-transparent hover:border-muted-foreground/50'
                }`}
                style={{ backgroundColor: theme.bg }}
                title={theme.label}
              />
            ))}
          </div>

          {/* Canvas preview */}
          <div className="relative rounded-xl overflow-hidden shadow-xl border border-border/50">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              تحميل الصورة
            </Button>
            <Button onClick={handleShare} className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              مشاركة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
